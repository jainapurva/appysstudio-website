/**
 * Named keycaps — .3mf generator.
 *
 * A TypeScript port of keycap-generator/make_keycaps.py (kept alongside the
 * master project in ~/Appy Studio/Printed models/). Same contract: meshes and
 * their transforms are copied verbatim out of the parts library, so output is
 * geometrically identical to the master design; only placement and plate
 * assignment are computed here.
 *
 * The parts library (assets/keycaps/keycap_parts.lib) is produced by
 * build_library.py from the master project. Regenerate it there, not here.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { precompress, unzip, zip, type Precompressed, type ZipEntry } from './zip';

const BED = 256.0; // P1S build plate, mm
const MARGIN = 8.0; // keep-out from the plate edge, mm
const PLATE_GAP = 1.2; // Bambu lays plates out on a grid with stride bed * 1.2

const CORE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const PROD = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Shortest tray the "Our Hero" engraving fits on. */
export const MIN_TEXT_SLOTS = 4;

interface Piece {
  mesh: string;
  transform: string;
  faces: number;
  bbox: number[];
  part: string;
  width?: number;
  scale?: number;
  proven_on?: number[];
}

interface Manifest {
  application?: string;
  slot_pitch: number;
  body: Piece;
  letters: Record<string, Piece>;
  bases: Record<string, Piece>;
  ourhero: Record<string, Piece>;
  keycap_item_transform: string;
  base_item_transform: string;
}

export interface BaseSpec {
  slots: number;
  text: boolean;
}

export interface GenerateOptions {
  /** Letters in plate order, e.g. ['N','Y','E','S','H','A']. */
  letters: string[];
  bases: BaseSpec[];
  /** Spacing between parts on the plate, mm. */
  gap?: number;
  /** Put keycaps and trays together on a single plate. */
  onePlate?: boolean;
  /** Override the random UUIDs — used by tests for reproducible output. */
  uuid?: () => string;
}

export interface GenerateResult {
  file: Buffer;
  keycapCount: number;
  plates: string[];
  bases: Array<{ slots: number; text: boolean; length: number }>;
}

/**
 * The keycap body is ~13 MB of XML and is byte-identical in every project we
 * emit, so it gets its own sub-model file and its deflate stream is computed
 * once per process and reused. Without this, every request would spend over a
 * second of CPU re-compressing the same mesh.
 */
const BODY_MODEL = '3D/Objects/body.model';
const PARTS_MODEL = '3D/Objects/parts.model';
const BODY_MESH_ID = 1;

// --------------------------------------------------------------- library load
let cached: { manifest: Manifest; members: Map<string, Buffer> } | null = null;
let bodyModelPre: Promise<Precompressed> | null = null;

function libraryPath(): string {
  return (
    process.env.KEYCAP_PARTS_LIB ||
    path.join(process.cwd(), 'assets', 'keycaps', 'keycap_parts.lib')
  );
}

function library() {
  if (!cached) {
    const members = unzip(readFileSync(libraryPath()));
    const manifestRaw = members.get('manifest.json');
    if (!manifestRaw) throw new Error('parts library is missing manifest.json');
    cached = { manifest: JSON.parse(manifestRaw.toString('utf8')) as Manifest, members };
  }
  return cached;
}

/** Slot counts the library actually contains, ascending. */
export function availableBaseSizes(): number[] {
  return Object.keys(library().manifest.bases)
    .map(Number)
    .sort((a, b) => a - b);
}

// ------------------------------------------------------------------- parsing
/**
 * "NYESHA"     -> N Y E S H A   (a word keeps its own order and repeats)
 * "A:3,B:2,Z"  -> A A A B B Z
 */
export function parseLetters(spec: string): string[] {
  const trimmed = spec.trim();
  if (!trimmed) throw new Error('Enter a name.');

  if (/[:,]|\bx\d/i.test(trimmed)) {
    const out: string[] = [];
    for (const chunk of trimmed.split(',')) {
      const c = chunk.trim();
      if (!c) continue;
      const m = /^([A-Za-z])\s*(?::|x|\*)?\s*(\d+)?$/i.exec(c);
      if (!m) throw new Error(`Cannot read "${c}".`);
      const n = m[2] ? parseInt(m[2], 10) : 1;
      for (let i = 0; i < n; i++) out.push(m[1].toUpperCase());
    }
    if (!out.length) throw new Error('Enter a name.');
    return out;
  }

  const out: string[] = [];
  for (const ch of trimmed.toUpperCase()) {
    if (ch === ' ' || ch === '-' || ch === '_' || ch === "'") continue;
    if (!ALPHABET.includes(ch)) {
      throw new Error(`Only letters A–Z work — "${ch}" isn't one of them.`);
    }
    out.push(ch);
  }
  if (!out.length) throw new Error('Enter a name.');
  return out;
}

/** Pick the tray size that seats `count` keycaps, or the largest available. */
export function autoBaseSlots(count: number): number[] {
  const sizes = availableBaseSizes();
  const largest = sizes[sizes.length - 1];
  const out: number[] = [];
  let remaining = Math.max(1, count);
  while (remaining > largest) {
    out.push(largest);
    remaining -= largest;
  }
  out.push(remaining);
  return out;
}

// -------------------------------------------------------------------- layout
type Foot = [number, number];

/**
 * Greedy shelf packing onto successive plates. Returns one list of plate-local
 * centres per plate; rows are centred as a block so plates look tidy.
 */
function pack(items: Foot[], gap: number): Array<Array<[number, number, number]>> {
  const usable = BED - 2 * MARGIN;
  const plates: Array<Array<[number, number, number]>> = [];
  let shelf: Array<[number, number, number]> = [];
  let shelves: Array<[Array<[number, number, number]>, number, number]> = [];
  let shelfW = 0;
  let shelfH = 0;
  let totalH = 0;

  const closeShelf = () => {
    if (shelf.length) {
      shelves.push([shelf, shelfW, shelfH]);
      totalH += shelfH + gap;
    }
    shelf = [];
    shelfW = 0;
    shelfH = 0;
  };

  const closePlate = () => {
    closeShelf();
    if (!shelves.length) return;
    const blockH = totalH - gap;
    let y = (BED + blockH) / 2;
    const placed: Array<[number, number, number]> = [];
    for (const [row, w, h] of shelves) {
      y -= h / 2;
      let x = (BED - (w - gap)) / 2;
      for (const [idx, iw] of row) {
        placed.push([idx, x + iw / 2, y]);
        x += iw + gap;
      }
      y -= h / 2 + gap;
    }
    plates.push(placed);
    shelves = [];
    totalH = 0;
  };

  items.forEach(([w, h], idx) => {
    if (w > usable || h > usable) {
      throw new Error(`A part ${w.toFixed(1)} × ${h.toFixed(1)} mm does not fit the plate.`);
    }
    if (shelf.length && shelfW + w > usable) closeShelf();
    if (totalH + shelfH + h + gap > usable + gap) closePlate();
    shelf.push([idx, w, h]);
    shelfW += w + gap;
    shelfH = Math.max(shelfH, h);
  });
  closePlate();
  return plates;
}

/** Bambu arranges plates on a ceil(sqrt(n)) grid, stride bed * 1.2. */
function plateOrigin(index: number, count: number): [number, number] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const stride = BED * PLATE_GAP;
  return [(index % cols) * stride, -Math.floor(index / cols) * stride];
}

// --------------------------------------------------------------- 3mf assembly
function setObjectId(block: string, newId: number, uuid: () => string): string {
  const headEnd = block.indexOf('>');
  let head = block.slice(0, headEnd);
  const rest = block.slice(headEnd);
  head = head.replace(/\sid="[^"]*"/, ` id="${newId}"`);
  head = head.includes('p:UUID')
    ? head.replace(/\sp:UUID="[^"]*"/, ` p:UUID="${uuid()}"`)
    : `${head} p:UUID="${uuid()}"`;
  return head + rest;
}

/** Reuse a source item's rotation and height, drop it at (x, y). */
function translate(transform: string, x: number, y: number): string {
  const t = transform.split(' ');
  t[9] = x.toFixed(6);
  t[10] = y.toFixed(6);
  return t.join(' ');
}

function shift(transform: string, dx: number, dy: number): string {
  const t = transform.split(' ');
  t[9] = (parseFloat(t[9]) + dx).toFixed(6);
  t[10] = (parseFloat(t[10]) + dy).toFixed(6);
  return t.join(' ');
}

/** Choose the engraving that was actually tuned for this tray length. */
function pickOurHero(man: Manifest, slots: number): string {
  for (const [variant, v] of Object.entries(man.ourhero)) {
    if (v.proven_on?.includes(slots)) return variant;
  }
  // 8/9/10-slot trays are longer than every proven case, so the full-size
  // engraving fits with room to spare.
  if (slots >= 5) return 'full';
  throw new Error(
    `A ${slots}-slot tray is too short for the engraving (shortest that fits is ${MIN_TEXT_SLOTS}).`
  );
}

function modelWrapper(inner: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE}" ` +
      'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" ' +
      `xmlns:p="${PROD}" requiredextensions="p">`,
    ' <metadata name="BambuStudio:3mfVersion">1</metadata>',
    ' <resources>',
    inner,
    ' </resources>',
    ' <build/>',
    '</model>',
  ].join('\n');
}

/**
 * Deflate the body sub-model once per process. The UUID inside it is fixed
 * rather than random precisely so the bytes never change — it identifies a
 * mesh within one file, and every project we emit has exactly one of them.
 */
function bodyModel(): Promise<Precompressed> {
  if (!bodyModelPre) {
    const { manifest: man, members } = library();
    const block = members.get(`meshes/${man.body.mesh}.xml`);
    if (!block) throw new Error('parts library is missing the keycap body mesh');
    const fixed = () => '3f8c0a10-0000-4000-8000-000000000001';
    bodyModelPre = precompress(
      Buffer.from(modelWrapper(setObjectId(block.toString('utf8'), BODY_MESH_ID, fixed)), 'utf8')
    );
  }
  return bodyModelPre;
}

/** Warm the body-mesh cache so the first visitor doesn't pay for it. */
export async function warmup(): Promise<void> {
  await bodyModel();
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const { manifest: man, members } = library();
  const gap = opts.gap ?? 2.0;
  const uuid = opts.uuid ?? randomUUID;

  for (const ch of opts.letters) {
    if (!man.letters[ch]) throw new Error(`Letter "${ch}" is not in the library.`);
  }
  for (const b of opts.bases) {
    if (!man.bases[String(b.slots)]) {
      throw new Error(
        `No ${b.slots}-slot tray — available sizes are ${availableBaseSizes().join(', ')}.`
      );
    }
    if (b.text && b.slots < MIN_TEXT_SLOTS) {
      throw new Error(
        `A ${b.slots}-slot tray is too short for the engraving (shortest that fits is ${MIN_TEXT_SLOTS}).`
      );
    }
  }

  // --- assemble the part list -------------------------------------------
  interface Part {
    label: string;
    pieces: Piece[];
    item: string;
    foot: Foot;
  }
  const makePart = (label: string, pieces: Piece[], item: string): Part => ({
    label,
    pieces,
    item,
    foot: [
      Math.max(...pieces.map((p) => p.bbox[1])) - Math.min(...pieces.map((p) => p.bbox[0])),
      Math.max(...pieces.map((p) => p.bbox[3])) - Math.min(...pieces.map((p) => p.bbox[2])),
    ],
  });

  const keycapParts = opts.letters.map((ch) =>
    makePart(`Keycap ${ch}`, [man.body, man.letters[ch]], man.keycap_item_transform)
  );
  const baseParts = opts.bases.map(({ slots, text }) => {
    const pieces = [man.bases[String(slots)]];
    if (text) pieces.push(man.ourhero[pickOurHero(man, slots)]);
    return makePart(
      `Base ${slots}-slot${text ? ' (Our Hero)' : ''}`,
      pieces,
      man.base_item_transform
    );
  });

  // --- register meshes and compose objects -------------------------------
  const meshBlocks: string[] = [];
  const meshIds = new Map<string, number>();
  const objects: Array<{
    id: number;
    label: string;
    comps: Array<[number, string, string]>;
    parts: string[];
    faces: number;
  }> = [];
  const items: Array<[number, string]> = [];
  const plates: Array<[string, number[]]> = [];
  // id 1 is reserved for the body mesh, which lives in its own sub-model file
  let nextId = BODY_MESH_ID + 1;

  /** Returns [mesh id, sub-model file the mesh lives in]. */
  const meshRef = (name: string): [number, string] => {
    if (name === man.body.mesh) return [BODY_MESH_ID, BODY_MODEL];
    let id = meshIds.get(name);
    if (id === undefined) {
      const block = members.get(`meshes/${name}.xml`);
      if (!block) throw new Error(`parts library is missing mesh "${name}"`);
      id = nextId++;
      meshIds.set(name, id);
      meshBlocks.push(setObjectId(block.toString('utf8'), id, uuid));
    }
    return [id, PARTS_MODEL];
  };

  const addObject = (label: string, pieces: Piece[], itemTransform: string): number => {
    const id = nextId++;
    const comps: Array<[number, string, string]> = [];
    const parts: string[] = [];
    let faces = 0;
    for (const piece of pieces) {
      const [mid, file] = meshRef(piece.mesh);
      comps.push([mid, piece.transform, file]);
      parts.push(piece.part.replace('{ID}', String(mid)));
      faces += piece.faces;
    }
    objects.push({ id, label, comps, parts, faces });
    items.push([id, itemTransform]);
    return id;
  };

  const plateUp = (parts: Part[], name: string) => {
    if (!parts.length) return;
    // largest first so long trays claim the bottom shelves
    const order = parts.map((_, i) => i).sort((a, b) => parts[b].foot[0] - parts[a].foot[0]);
    const layout = pack(order.map((i) => parts[i].foot), gap);
    layout.forEach((placed, pi) => {
      const oids = placed.map(([idx, cx, cy]) => {
        const p = parts[order[idx]];
        return addObject(p.label, p.pieces, translate(p.item, cx, cy));
      });
      plates.push([layout.length === 1 ? name : `${name} ${pi + 1}`, oids]);
    });
  };

  if (opts.onePlate) {
    plateUp([...baseParts, ...keycapParts], 'All');
    if (plates.length > 1) {
      throw new Error(
        `${keycapParts.length} keycaps plus ${baseParts.length} tray(s) need ${plates.length} plates — too many for a single plate.`
      );
    }
  } else {
    plateUp(keycapParts, 'Keycaps');
    plateUp(baseParts, 'Bases');
  }

  // --- plate grid offsets are only known once the plate count is final ----
  const offsets = new Map<number, [number, number]>();
  plates.forEach(([, oids], pi) => {
    const origin = plateOrigin(pi, plates.length);
    for (const oid of oids) offsets.set(oid, origin);
  });
  const placedItems = items.map(([oid, tf]) => {
    const [ox, oy] = offsets.get(oid)!;
    return [oid, shift(tf, ox, oy)] as [number, string];
  });

  // --- serialise ---------------------------------------------------------
  const modelXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE}" ` +
      'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" ' +
      `xmlns:p="${PROD}" requiredextensions="p">`,
    // Bambu Studio only trusts a project's embedded printer/filament presets
    // when Application names Bambu Studio itself; any other value sends it
    // down an "imported foreign model" path that re-resolves extruder variants
    // and then refuses to slice.
    ` <metadata name="Application">${man.application ?? 'BambuStudio'}</metadata>`,
    ' <metadata name="BambuStudio:3mfVersion">1</metadata>',
    ' <metadata name="Title">Named Keycaps</metadata>',
    ' <metadata name="Description">Generated at appysstudio.com</metadata>',
    ' <resources>',
    ...objects.map(({ id, comps }) =>
      [
        `  <object id="${id}" p:UUID="${uuid()}" type="model">`,
        '   <components>',
        ...comps.map(
          ([mid, tf, file]) =>
            `    <component p:path="/${file}" objectid="${mid}" ` +
            `p:UUID="${uuid()}" transform="${tf}"/>`
        ),
        '   </components>',
        '  </object>',
      ].join('\n')
    ),
    ' </resources>',
    ` <build p:UUID="${uuid()}">`,
    ...placedItems.map(
      ([oid, tf]) => `  <item objectid="${oid}" p:UUID="${uuid()}" transform="${tf}" printable="1"/>`
    ),
    ' </build>',
    '</model>',
  ].join('\n');

  const partsXml = modelWrapper(meshBlocks.join('\n'));

  const settingsXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<config>',
    ...objects.map(({ id, label, parts, faces }) =>
      [
        `  <object id="${id}">`,
        `    <metadata key="name" value="${label}"/>`,
        '    <metadata key="extruder" value="1"/>',
        `    <metadata face_count="${faces}"/>`,
        ...parts.map((p) => `    ${p}`),
        '  </object>',
      ].join('\n')
    ),
    ...plates.map(([name, oids], i) =>
      [
        '  <plate>',
        `    <metadata key="plater_id" value="${i + 1}"/>`,
        `    <metadata key="plater_name" value="${name}"/>`,
        '    <metadata key="locked" value="false"/>',
        '    <metadata key="filament_map_mode" value="Auto For Flush"/>',
        '    <metadata key="filament_maps" value="1 1"/>',
        ...oids.map((oid) =>
          [
            '    <model_instance>',
            `      <metadata key="object_id" value="${oid}"/>`,
            '      <metadata key="instance_id" value="0"/>',
            '    </model_instance>',
          ].join('\n')
        ),
        '  </plate>',
      ].join('\n')
    ),
    '</config>',
  ].join('\n');

  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
          ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
          ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n' +
          ' <Default Extension="png" ContentType="image/png"/>\n' +
          ' <Default Extension="gcode" ContentType="text/x.gcode"/>\n' +
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
    {
      // the production extension only picks up sub-model files that are
      // declared as relationships of 3dmodel.model
      name: '3D/_rels/3dmodel.model.rels',
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
          ` <Relationship Target="/${BODY_MODEL}" Id="rel-1" ` +
          'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n' +
          ` <Relationship Target="/${PARTS_MODEL}" Id="rel-2" ` +
          'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n' +
          '</Relationships>\n'
      ),
    },
    { name: '3D/3dmodel.model', data: Buffer.from(modelXml, 'utf8') },
    { name: BODY_MODEL, pre: await bodyModel() },
    { name: PARTS_MODEL, data: Buffer.from(partsXml, 'utf8') },
    { name: 'Metadata/model_settings.config', data: Buffer.from(settingsXml, 'utf8') },
    {
      name: 'Metadata/project_settings.config',
      data: members.get('templates/project_settings.config')!,
    },
    {
      name: 'Metadata/custom_gcode_per_layer.xml',
      data: members.get('templates/custom_gcode_per_layer.xml')!,
    },
  ];

  return {
    file: await zip(entries),
    keycapCount: keycapParts.length,
    plates: plates.map(([name]) => name),
    bases: opts.bases.map(({ slots, text }) => ({
      slots,
      text,
      length: man.bases[String(slots)].width ?? 0,
    })),
  };
}
