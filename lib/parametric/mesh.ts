/**
 * Binary STL in, indexed mesh out, and a 3MF writer on top of it.
 *
 * OpenSCAD's wasm build has no 3MF exporter (lib3mf isn't compiled in), so we
 * take its binary STL and do the conversion here. Unlike the keycaps project
 * file, this writes a plain, standard 3MF rather than a Bambu project: there
 * are no presets or plates to embed, and a stock 3MF opens in Bambu Studio,
 * Orca and PrusaSlicer alike.
 */

import { zip, type ZipEntry } from '@/lib/keycaps/zip';

export interface Mesh {
  /** Flat x,y,z triples. */
  vertices: Float64Array;
  /** Flat v1,v2,v3 index triples. */
  indices: Uint32Array;
  triangleCount: number;
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

/**
 * Parse a binary STL into an indexed mesh.
 *
 * STL repeats every vertex per face, so the same corner arrives three or more
 * times; welding them cuts the 3MF roughly in half and is what the format
 * expects anyway.
 */
export function parseBinaryStl(buf: Buffer): Mesh {
  if (buf.length < 84) throw new Error('not a binary STL: too short');
  const count = buf.readUInt32LE(80);
  const expected = 84 + count * 50;
  if (buf.length < expected) {
    throw new Error(`truncated STL: ${count} triangles need ${expected} bytes, got ${buf.length}`);
  }

  const vertices: number[] = [];
  const indices = new Uint32Array(count * 3);
  const lookup = new Map<string, number>();

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (let t = 0; t < count; t++) {
    // 50 bytes per triangle: a normal we don't need, three vertices, a spacer.
    const base = 84 + t * 50 + 12;
    for (let v = 0; v < 3; v++) {
      const at = base + v * 12;
      const x = buf.readFloatLE(at);
      const y = buf.readFloatLE(at + 4);
      const z = buf.readFloatLE(at + 8);

      // Key on the float32 bit patterns STL actually stored, so identical
      // corners weld and merely-close ones stay put.
      const key = `${x},${y},${z}`;
      let index = lookup.get(key);
      if (index === undefined) {
        index = vertices.length / 3;
        lookup.set(key, index);
        vertices.push(x, y, z);
        if (x < min[0]) min[0] = x;
        if (y < min[1]) min[1] = y;
        if (z < min[2]) min[2] = z;
        if (x > max[0]) max[0] = x;
        if (y > max[1]) max[1] = y;
        if (z > max[2]) max[2] = z;
      }
      indices[t * 3 + v] = index;
    }
  }

  return {
    vertices: Float64Array.from(vertices),
    indices,
    triangleCount: count,
    bounds: { min, max },
  };
}

/** Size in mm along each axis — used to show dimensions and sanity-check output. */
export function meshSize(mesh: Mesh): [number, number, number] {
  const { min, max } = mesh.bounds;
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

/** Trim float noise: printers resolve microns, and shorter numbers mean smaller files. */
function num(value: number): string {
  const rounded = Math.round(value * 1e4) / 1e4;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Slide a mesh along x, bounds included.
 *
 * Used to lay separate physical pieces out beside each other before they are
 * written into one 3MF. Vertices are moved rather than an item transform being
 * written, so the offset survives every reader — a slicer that ignores build
 * transforms would otherwise stack the pieces back on top of one another.
 */
export function shiftX(mesh: Mesh, dx: number): Mesh {
  if (dx === 0) return mesh;

  const vertices = new Float64Array(mesh.vertices);
  for (let i = 0; i < vertices.length; i += 3) vertices[i] += dx;

  return {
    vertices,
    indices: mesh.indices,
    triangleCount: mesh.triangleCount,
    bounds: {
      min: [mesh.bounds.min[0] + dx, mesh.bounds.min[1], mesh.bounds.min[2]],
      max: [mesh.bounds.max[0] + dx, mesh.bounds.max[1], mesh.bounds.max[2]],
    },
  };
}

/**
 * Clear space between two pieces laid out beside each other, in mm.
 *
 * Wide enough that a default 5mm brim on each does not run into its neighbour,
 * since a merged brim is the one way two properly separated pieces still come
 * off the plate stuck together.
 */
const PART_GAP_MM = 12;

/**
 * Lay assemblies out side by side along x.
 *
 * Parts sharing an `assembly` are left exactly where OpenSCAD put them: their
 * registration is load-bearing, and an inlay that has drifted out of its pocket
 * is a broken file. Everything else is a separate piece, and separate pieces
 * that arrive intersecting are worse than merely untidy — the obvious fix in
 * any slicer is Arrange, which would also pull the registered ones apart.
 *
 * Parts that declare no assembly all count as one, which leaves a model that
 * never asked for a layout exactly as it was.
 */
export function layOutParts(parts: { mesh: Mesh; name: string; assembly?: string }[]): typeof parts {
  const order: string[] = [];
  for (const part of parts) {
    const key = part.assembly ?? '';
    if (!order.includes(key)) order.push(key);
  }
  if (order.length < 2) return parts;

  const offsets = new Map<string, number>();
  let cursor = 0;
  for (const key of order) {
    const group = parts.filter((part) => (part.assembly ?? '') === key);
    const min = Math.min(...group.map((part) => part.mesh.bounds.min[0]));
    const max = Math.max(...group.map((part) => part.mesh.bounds.max[0]));
    offsets.set(key, cursor - min);
    cursor += max - min + PART_GAP_MM;
  }

  return parts.map((part) => ({
    ...part,
    mesh: shiftX(part.mesh, offsets.get(part.assembly ?? '') ?? 0),
  }));
}

/**
 * Wrap one or more meshes as a 3MF.
 *
 * Every mesh shares one transform, derived from their combined bounds, so a
 * model split into parts keeps its parts registered against each other.
 * Centring each one on its own bounds would look right for a single object and
 * silently pull a two-part model apart.
 *
 * The result sits on z=0 with its footprint centred, because slicers place a
 * 3MF where the file says and OpenSCAD models are authored around whatever
 * origin suited the geometry.
 *
 * Parts that name the same `assembly` are additionally wrapped in a
 * `<components>` object, which is what makes their registration survive
 * contact with a slicer. Sharing one transform is only enough while nothing
 * moves the bodies, and something always does: the file is centred on the
 * origin, every bed's origin is a corner, so every slicer has to reposition it.
 * Bambu Studio moves top-level objects one at a time — sliced from three loose
 * objects it put the inlay 25mm clear of the cap it fills — but reads a
 * components object as one object with one part per body, kept together and
 * still separately colourable.
 */
export async function toThreeMf(
  meshes: Mesh | { mesh: Mesh; name: string; assembly?: string }[],
  title: string
): Promise<Buffer> {
  const parts = Array.isArray(meshes) ? meshes : [{ mesh: meshes, name: title }];
  if (parts.length === 0) throw new Error('3mf needs at least one mesh');

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const { mesh } of parts) {
    for (let i = 0; i < 3; i++) {
      if (mesh.bounds.min[i] < min[i]) min[i] = mesh.bounds.min[i];
      if (mesh.bounds.max[i] > max[i]) max[i] = mesh.bounds.max[i];
    }
  }
  const dx = -min[0] - (max[0] - min[0]) / 2;
  const dy = -min[1] - (max[1] - min[1]) / 2;
  const dz = -min[2];

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<model unit="millimeter" xml:lang="en-US" ' +
      'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">',
    ` <metadata name="Title">${escapeXml(title)}</metadata>`,
    ' <metadata name="Designer">Appy&apos;s Studio</metadata>',
    ' <metadata name="Description">Generated at appysstudio.com</metadata>',
    ' <resources>',
  ];

  parts.forEach(({ mesh, name }, index) => {
    lines.push(`  <object id="${index + 1}" type="model" name="${escapeXml(name)}">`);
    lines.push('   <mesh>', '    <vertices>');
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      lines.push(
        `     <vertex x="${num(mesh.vertices[i] + dx)}" ` +
          `y="${num(mesh.vertices[i + 1] + dy)}" ` +
          `z="${num(mesh.vertices[i + 2] + dz)}"/>`
      );
    }
    lines.push('    </vertices>', '    <triangles>');
    for (let i = 0; i < mesh.indices.length; i += 3) {
      lines.push(
        `     <triangle v1="${mesh.indices[i]}" v2="${mesh.indices[i + 1]}" v3="${mesh.indices[i + 2]}"/>`
      );
    }
    lines.push('    </triangles>', '   </mesh>', '  </object>');
  });

  // One build item per assembly, in the order the parts were given. A part
  // that named no assembly stands alone, which leaves a model that never asked
  // to be grouped exactly as it was.
  const items: number[] = [];
  const wrapped = new Map<string, number[]>();
  parts.forEach(({ assembly }, index) => {
    if (!assembly) {
      items.push(index + 1);
      return;
    }
    const group = wrapped.get(assembly);
    if (group) {
      group.push(index + 1);
    } else {
      wrapped.set(assembly, [index + 1]);
      items.push(-wrapped.size);
    }
  });

  const wrapperId = new Map<string, number>();
  let nextId = parts.length + 1;
  for (const [assembly, members] of wrapped) {
    if (members.length < 2) continue;
    wrapperId.set(assembly, nextId);
    // Named after the first body in the group: 3MF components carry no name of
    // their own, and Bambu Studio labels the parts after their parent.
    const name = parts[members[0] - 1].name;
    lines.push(`  <object id="${nextId}" type="model" name="${escapeXml(name)}">`, '   <components>');
    for (const member of members) lines.push(`    <component objectid="${member}"/>`);
    lines.push('   </components>', '  </object>');
    nextId += 1;
  }

  lines.push(' </resources>', ' <build>');
  const groups = [...wrapped.keys()];
  for (const item of items) {
    if (item > 0) {
      lines.push(`  <item objectid="${item}"/>`);
      continue;
    }
    const assembly = groups[-item - 1];
    const members = wrapped.get(assembly)!;
    lines.push(`  <item objectid="${wrapperId.get(assembly) ?? members[0]}"/>`);
  }
  lines.push(' </build>', '</model>', '');

  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
          ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
          ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n' +
          '</Types>\n'
      ),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
          ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" ' +
          'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n' +
          '</Relationships>\n'
      ),
    },
    { name: '3D/3dmodel.model', data: Buffer.from(lines.join('\n'), 'utf8') },
  ];

  return zip(entries);
}
