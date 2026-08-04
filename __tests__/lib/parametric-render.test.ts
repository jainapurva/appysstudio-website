// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PARAMETRIC_MODELS, findModel } from '@/lib/parametric/models';
import { resolveParams, toDefines, type ParamValues } from '@/lib/parametric/spec';
import { loadScad, renderScad, RENDER_TIMEOUT_MS } from '@/lib/parametric/render';
import { parseBinaryStl, meshSize, toThreeMf } from '@/lib/parametric/mesh';
import {
  bounds,
  crossSectionLoops,
  openEdgeCount,
  shellCount,
  triangleCount,
  volume,
} from '../support/geometry.helper';
import { unzip } from '@/lib/keycaps/zip';

/** A 3mf is a zip; the model XML has to come back out before it can be read. */
function modelXml(file: Buffer): string {
  const member = unzip(file).get('3D/3dmodel.model');
  if (!member) throw new Error('3mf has no 3D/3dmodel.model');
  return member.toString('utf8');
}

// Each render spins up a fresh wasm instance, so these are seconds, not
// milliseconds. Worth it: this suite is the only thing standing between a bad
// parameter range and a visitor downloading an unprintable file.
const RENDER_BUDGET_MS = 60_000;

async function build(slug: string, overrides: Record<string, string> = {}) {
  const model = findModel(slug);
  if (!model) throw new Error(`no model ${slug}`);
  const { values } = resolveParams(model.params, overrides);
  const source = await loadScad(model.file);
  const { stl, ms } = await renderScad(source, toDefines(model.params, values));
  return { stl, ms, values };
}

/** Every parameter pushed to one end of its declared range at once. */
function corner(slug: string, end: 'min' | 'max'): Record<string, string> {
  const model = findModel(slug)!;
  const out: Record<string, string> = {};
  for (const param of model.params) {
    if (param.kind === 'number') out[param.key] = String(param[end]);
    else if (param.kind === 'bool') out[param.key] = end === 'max' ? 'true' : 'false';
  }
  return out;
}

describe('every model renders at its defaults', () => {
  for (const model of PARAMETRIC_MODELS) {
    it(
      `${model.slug} is a closed solid`,
      async () => {
        const { stl, ms } = await build(model.slug);

        expect(triangleCount(stl)).toBeGreaterThan(10);
        expect(openEdgeCount(stl)).toBe(0);
        expect(ms).toBeLessThan(RENDER_TIMEOUT_MS);

        // Nothing here should be microscopic or bigger than a print bed.
        const { size } = bounds(stl);
        for (const dimension of size) {
          expect(dimension).toBeGreaterThan(1);
          expect(dimension).toBeLessThan(300);
        }
      },
      RENDER_BUDGET_MS
    );
  }
});

describe('the declared ranges are all buildable', () => {
  // A range is a promise that every value in it works. The corners are where
  // that promise breaks — a wall thicker than the box, a cell smaller than its
  // own magnet pocket.
  for (const model of PARAMETRIC_MODELS) {
    for (const end of ['min', 'max'] as const) {
      it(
        `${model.slug} at every ${end}`,
        async () => {
          const { stl } = await build(model.slug, corner(model.slug, end));
          expect(triangleCount(stl)).toBeGreaterThan(3);
          expect(openEdgeCount(stl)).toBe(0);
        },
        RENDER_BUDGET_MS
      );
    }
  }
});

describe('choices', () => {
  const cases: [string, string, string][] = [
    ['cookie-cutter', 'shape', 'circle'],
    ['cookie-cutter', 'shape', 'square'],
    ['cookie-cutter', 'shape', 'hexagon'],
    ['cookie-cutter', 'shape', 'star'],
    ['cookie-cutter', 'shape', 'heart'],
    ['cookie-cutter', 'shape', 'flower'],
    ['cookie-cutter', 'mode', 'stamp'],
    ['spinning-top', 'tip', 'point'],
    ['spinning-top', 'tip', 'round'],
    ['spinning-top', 'tip', 'flat'],
    ['hex-organizer', 'type', 'pen'],
    ['hex-organizer', 'type', 'marker'],
    ['hex-organizer', 'type', 'notes'],
    ['hex-organizer', 'type', 'cable'],
    ['hex-organizer', 'type', 'phone'],
    ['hex-organizer', 'type', 'coaster'],
  ];

  for (const [slug, key, value] of cases) {
    it(
      `${slug} builds with ${key}=${value}`,
      async () => {
        const { stl } = await build(slug, { [key]: value });
        expect(openEdgeCount(stl)).toBe(0);
        expect(triangleCount(stl)).toBeGreaterThan(3);
      },
      RENDER_BUDGET_MS
    );
  }
});

describe('twisty vase holds water', () => {
  // Deep ribs plus a hard twist used to pinch the wall shut at the valleys and
  // split the cross-section into one loop per rib. Perfectly watertight as a
  // mesh, useless as a vase — so this checks the shape, not the file.
  const combinations: [number, number, number][] = [
    [3, 8, 0],
    [6, 20, 180],
    [10, 40, 360],
    [12, 40, 360],
    [3, 40, 360],
  ];

  for (const [lobes, depth, twist] of combinations) {
    it(
      `stays a single ring with ${lobes} ribs, ${depth}% deep, ${twist}° of twist`,
      async () => {
        const { stl } = await build('twisty-vase', {
          lobes: String(lobes),
          depth: String(depth),
          twist: String(twist),
          height: '140',
        });

        // Sampled off the slice boundaries on purpose — that is where the
        // ruled surfaces between slices used to cross.
        for (const z of [37.3, 70.7, 104.1]) {
          expect(crossSectionLoops(stl, z), `at z=${z}`).toBe(2);
        }
      },
      RENDER_BUDGET_MS
    );
  }

  it(
    'a drain hole opens the base',
    async () => {
      const withDrain = await build('twisty-vase', { drain: 'true' });
      const without = await build('twisty-vase', { drain: 'false' });
      // Just above the floor: draining gives an extra loop for the hole.
      expect(crossSectionLoops(withDrain.stl, 1.5)).toBeGreaterThan(
        crossSectionLoops(without.stl, 1.5)
      );
    },
    RENDER_BUDGET_MS * 2
  );
});

describe('finger extensions print as a working chain', () => {
  it(
    'comes out as separate bodies, one per link plus the socket',
    async () => {
      for (const segments of [2, 3, 6]) {
        const { stl } = await build('finger-extensions', { segments: String(segments) });
        // Socket + one shell per link. A single shell means the joints fused.
        expect(shellCount(stl), `${segments} segments`).toBe(segments + 1);
        expect(openEdgeCount(stl)).toBe(0);
      }
    },
    RENDER_BUDGET_MS * 3
  );

  it(
    'keeps the links apart at the tightest clearance offered',
    async () => {
      const model = findModel('finger-extensions')!;
      const clearance = model.params.find((p) => p.key === 'clearance');
      if (clearance?.kind !== 'number') throw new Error('clearance is not a number param');

      const { stl } = await build('finger-extensions', {
        clearance: String(clearance.min),
        thickness: '8',
      });
      expect(shellCount(stl)).toBe(4);
    },
    RENDER_BUDGET_MS
  );

  it(
    'hollows the socket rather than sealing it',
    async () => {
      // The bore breaks out through the back, so it does not read as a second
      // loop in a slice — an open socket cuts as one C, same as a solid block.
      // Volume is what tells them apart. Holding `thickness` at 20 pins the
      // socket's outside dimensions (it is max(thickness, finger_height + 2*wall)),
      // so the only thing changing between these two is how much is scooped out.
      // finger_width has to stay put as well — it sets the socket's outside
      // width too, so widening it adds more material than the bore takes away.
      const shallow = await build('finger-extensions', {
        thickness: '20',
        finger_width: '19',
        finger_height: '9',
      });
      const deep = await build('finger-extensions', {
        thickness: '20',
        finger_width: '19',
        finger_height: '13',
      });

      expect(bounds(deep.stl).size[2]).toBeCloseTo(bounds(shallow.stl).size[2], 1);
      expect(volume(deep.stl)).toBeLessThan(volume(shallow.stl));
    },
    RENDER_BUDGET_MS * 2
  );
});

describe('stackable box', () => {
  it(
    'adds a compartment wall for each divider',
    async () => {
      const plain = await build('stackable-box', { divisions_long: '0', divisions_wide: '0' });
      const split = await build('stackable-box', { divisions_long: '2', divisions_wide: '1' });
      // Six compartments read as six inner loops plus the outer wall.
      expect(crossSectionLoops(split.stl, 30)).toBeGreaterThan(
        crossSectionLoops(plain.stl, 30)
      );
      expect(openEdgeCount(split.stl)).toBe(0);
    },
    RENDER_BUDGET_MS * 2
  );

  it(
    'is taller with a stacking lip than without',
    async () => {
      const lipped = await build('stackable-box', { stacking: 'true', height: '50' });
      const flat = await build('stackable-box', { stacking: 'false', height: '50' });
      expect(bounds(lipped.stl).size[2]).toBeGreaterThan(bounds(flat.stl).size[2]);
      expect(bounds(flat.stl).size[2]).toBeCloseTo(50, 1);
    },
    RENDER_BUDGET_MS * 2
  );
});

describe('hex organizer', () => {
  it(
    'keeps a full hexagon footprint whatever the module, so cells still tessellate',
    async () => {
      const model = findModel('hex-organizer')!;
      const cellParam = model.params.find((p) => p.key === 'cell');
      if (cellParam?.kind !== 'number') throw new Error('cell is not a number param');
      const cell = cellParam.default;

      for (const type of ['pen', 'marker', 'notes', 'cable', 'phone', 'coaster']) {
        const { stl } = await build('hex-organizer', { type });
        const { size } = bounds(stl);
        // Across the points is 2r; across the flats is 2r*cos(30).
        expect(size[0], `${type} across points`).toBeCloseTo(cell * 2, 1);
        expect(size[1], `${type} across flats`).toBeCloseTo(cell * 2 * Math.cos(Math.PI / 6), 1);
      }
    },
    RENDER_BUDGET_MS * 3
  );

  it(
    'cuts magnet pockets only when asked',
    async () => {
      const plain = await build('hex-organizer', { magnets: 'false' });
      const magnetic = await build('hex-organizer', { magnets: 'true' });
      expect(triangleCount(magnetic.stl)).toBeGreaterThan(triangleCount(plain.stl));
      expect(openEdgeCount(magnetic.stl)).toBe(0);
    },
    RENDER_BUDGET_MS * 2
  );
});

describe('mesh conversion', () => {
  it(
    'welds shared vertices and keeps the triangle count',
    async () => {
      const { stl } = await build('stackable-box');
      const mesh = parseBinaryStl(stl);
      expect(mesh.triangleCount).toBe(triangleCount(stl));
      // STL repeats every corner per face; welding should beat 3 per triangle
      // comfortably on a closed solid.
      expect(mesh.vertices.length / 3).toBeLessThan(mesh.triangleCount * 3);
      expect(meshSize(mesh)[0]).toBeCloseTo(bounds(stl).size[0], 3);
    },
    RENDER_BUDGET_MS
  );

  it(
    'writes a 3mf that sits on the bed, centred',
    async () => {
      const { stl } = await build('spinning-top');
      const xml = modelXml(await toThreeMf(parseBinaryStl(stl), 'Spinning Top'));
      expect(xml).toContain('<model unit="millimeter"');

      const zs = [...xml.matchAll(/z="(-?[0-9.]+)"/g)].map((m) => Number(m[1]));
      expect(Math.min(...zs)).toBeCloseTo(0, 2);

      // Centred in plan, so a slicer drops it in the middle of the bed.
      const xs = [...xml.matchAll(/ x="(-?[0-9.]+)"/g)].map((m) => Number(m[1]));
      expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0, 2);
    },
    RENDER_BUDGET_MS
  );

  it(
    'keeps multiple parts registered against each other',
    async () => {
      // The paint kit depends on this: centring each part on its own bounds
      // would look fine for one object and pull a two-part model apart.
      const { stl } = await build('stackable-box');
      const mesh = parseBinaryStl(stl);
      const raised: typeof mesh = {
        ...mesh,
        vertices: Float64Array.from(mesh.vertices.map((v, i) => (i % 3 === 2 ? v + 100 : v))),
        bounds: {
          min: [mesh.bounds.min[0], mesh.bounds.min[1], mesh.bounds.min[2] + 100],
          max: [mesh.bounds.max[0], mesh.bounds.max[1], mesh.bounds.max[2] + 100],
        },
      };

      const xml = modelXml(
        await toThreeMf(
          [
            { mesh, name: 'Lower' },
            { mesh: raised, name: 'Upper' },
          ],
          'Two parts'
        )
      );
      expect(xml).toContain('name="Lower"');
      expect(xml).toContain('name="Upper"');

      const zs = [...xml.matchAll(/z="(-?[0-9.]+)"/g)].map((m) => Number(m[1]));
      // The 100mm gap between the parts has to survive the shared transform.
      expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(bounds(stl).size[2] + 100, 1);
    },
    RENDER_BUDGET_MS
  );
});

describe('render safety', () => {
  it('refuses a scad filename that is not a plain name', async () => {
    await expect(loadScad('../../etc/passwd')).rejects.toThrow(/plain .scad filename/);
    await expect(loadScad('twisty_vase.scad; rm -rf /')).rejects.toThrow();
  });

  it(
    'reports a SCAD error rather than hanging',
    async () => {
      await expect(renderScad('this is not scad at all $$$', [])).rejects.toThrow();
    },
    RENDER_BUDGET_MS
  );

  it(
    'produces identical bytes for identical parameters',
    async () => {
      // The API sets a day of cache on these, which is only safe if the render
      // is deterministic.
      const a = await build('cookie-cutter', { shape: 'star', points: '7' });
      const b = await build('cookie-cutter', { shape: 'star', points: '7' });
      expect(a.stl.equals(b.stl)).toBe(true);
    },
    RENDER_BUDGET_MS * 2
  );
});

/** Sanity: values used above must actually be what the manifest declares. */
describe('test assumptions', () => {
  it('still has the models these tests name', () => {
    for (const slug of [
      'twisty-vase',
      'spinning-top',
      'cookie-cutter',
      'finger-extensions',
      'stackable-box',
      'hex-organizer',
    ]) {
      expect(findModel(slug), slug).toBeDefined();
    }
  });

  it('resolves defaults for every model without rejecting anything', () => {
    for (const model of PARAMETRIC_MODELS) {
      const { rejected, values } = resolveParams(model.params, {});
      expect(rejected, model.slug).toEqual([]);
      expect(Object.keys(values as ParamValues)).toHaveLength(model.params.length);
    }
  });
});
