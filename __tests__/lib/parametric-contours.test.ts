import { describe, it, expect } from 'vitest';
import { readContours, contoursToScad, pointTotal } from '@/lib/parametric/contours';
import { PARAMETRIC_MODELS } from '@/lib/parametric/models';
import { resolveParams, toDefines } from '@/lib/parametric/spec';

describe('readContours', () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];

  it('accepts a well formed contour', () => {
    const out = readContours([square], 'logo');
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(4);
  });

  it('drops contours with fewer than three points', () => {
    expect(readContours([[[0, 0], [1, 1]]], 'logo')).toHaveLength(0);
  });

  it('rejects anything that is not a list', () => {
    expect(() => readContours('nope', 'logo')).toThrow(/expected a list/);
  });

  it('rejects non-finite coordinates', () => {
    expect(() => readContours([[[0, 0], [Number.NaN, 1], [2, 2]]], 'logo')).toThrow(/non-finite/);
    expect(() => readContours([[[0, 0], [Infinity, 1], [2, 2]]], 'logo')).toThrow(/non-finite/);
  });

  it('rejects coordinates beyond any real bed', () => {
    expect(() => readContours([[[0, 0], [9000, 1], [2, 2]]], 'logo')).toThrow(/out of range/);
  });

  it('rejects malformed points', () => {
    expect(() => readContours([[[0, 0], [1], [2, 2]]], 'logo')).toThrow(/malformed/);
  });

  it('enforces the point ceiling', () => {
    const big = [Array.from({ length: 40 }, (_, i) => [i, i] as [number, number])];
    expect(() => readContours(big, 'logo', { maxPoints: 10 })).toThrow(/too much detail/);
  });

  it('enforces the contour ceiling', () => {
    expect(() => readContours([square, square, square], 'logo', { maxContours: 2 })).toThrow(
      /too many outlines/
    );
  });

  // The whole point of re-serialising: nothing arrives as text.
  it('never passes a string through', () => {
    const out = readContours([[['1', '2'], ['3', '4'], ['5', '6']]], 'logo');
    for (const [x, y] of out[0]) {
      expect(typeof x).toBe('number');
      expect(typeof y).toBe('number');
    }
  });
});

describe('contoursToScad', () => {
  it('emits points and paths that index them', () => {
    const scad = contoursToScad([[[0, 0], [1, 0], [1, 1]]]);
    expect(scad).toContain('LOGO_POINTS=[[0,0],[1,0],[1,1]];');
    expect(scad).toContain('LOGO_PATHS=[[0,1,2]];');
  });

  it('numbers a second contour on from the first', () => {
    const tri = [[0, 0], [1, 0], [1, 1]] as [number, number][];
    const scad = contoursToScad([tri, tri]);
    expect(scad).toContain('LOGO_PATHS=[[0,1,2],[3,4,5]];');
  });

  it('returns nothing for no contours, so the model keeps its empty default', () => {
    expect(contoursToScad([])).toBe('');
  });

  it('cannot emit anything but numbers and brackets', () => {
    const scad = contoursToScad(readContours([[[1.23456, -2], [3, 4], [5, 6]]], 'logo'));
    expect(scad.replace(/LOGO_POINTS|LOGO_PATHS/g, '')).toMatch(/^[-0-9.,[\]=;\s]+$/);
  });

  it('counts points', () => {
    expect(pointTotal([[[0, 0], [1, 0], [1, 1]]])).toBe(3);
  });
});

describe('logo-clicker model', () => {
  const model = PARAMETRIC_MODELS.find((m) => m.slug === 'logo-clicker');

  it('is registered', () => {
    expect(model).toBeDefined();
  });

  it('declares its bodies so a 3MF can colour them separately', () => {
    expect(model!.partKey).toBe('part');
    expect(model!.parts?.map((p) => p.value)).toEqual(['cap', 'logo', 'base']);
    expect(model!.previewPart).toBe('preview');
  });

  it('marks the inlay as the body that only exists with artwork', () => {
    const parts = model!.parts!;
    expect(parts.find((p) => p.value === 'logo')?.needsLogo).toBe(true);
    expect(parts.find((p) => p.value === 'cap')?.needsLogo).toBeUndefined();
    expect(parts.find((p) => p.value === 'base')?.needsLogo).toBeUndefined();
  });

  // Apurva's rule: nothing reaches the site until a test print confirms it.
  it('stays unlisted until it has been printed', () => {
    expect(model!.verified).toBe(false);
  });

  it('keeps the logo parameter out of the SCAD defines', () => {
    const { values, rejected } = resolveParams(model!.params, {});
    expect(rejected).toEqual([]);
    const defines = toDefines(model!.params, values);
    expect(defines.some((d) => d.startsWith('logo='))).toBe(false);
    // the numbers around it still come through
    expect(defines).toContain('cap_width=33');
    expect(defines).toContain('shape="circle"');
  });

  it('clamps a cap width outside the allowed range', () => {
    const { values, rejected } = resolveParams(model!.params, { cap_width: '900' });
    expect(rejected.length).toBeGreaterThan(0);
    expect(values.cap_width).toBe(48);
  });
});

// These go through the real openscad-wasm build, which is a different OpenSCAD
// from any local CLI: it has the manifold backend and, importantly, no fonts.
// A model that reached for text() would pass every check above and fail here.
describe('logo clicker renders with real artwork', () => {
  const RENDER_BUDGET_MS = 90_000;

  // A ring with a bar through it: the hole proves even-odd nesting survives
  // the trip into SCAD, and the bar gives the outline something to clip.
  const artwork: [number, number][][] = [
    [[-10, -10], [10, -10], [10, 10], [-10, 10]],
    [[-5, -5], [5, -5], [5, 5], [-5, 5]],
    [[-14, -2], [14, -2], [14, 2], [-14, 2]],
  ];

  async function render(part: string, contours: [number, number][][] = artwork) {
    const { loadScad, renderScad } = await import('@/lib/parametric/render');
    const { parseBinaryStl, meshSize } = await import('@/lib/parametric/mesh');
    const model = PARAMETRIC_MODELS.find((m) => m.slug === 'logo-clicker')!;
    const { values } = resolveParams(model.params, {});
    const scad = await loadScad(model.file);
    const source = `${scad}\n${contoursToScad(readContours(contours, 'logo'))}`;
    const { stl } = await renderScad(source, [...toDefines(model.params, values), `part="${part}"`]);
    const mesh = parseBinaryStl(stl);
    return { mesh, size: meshSize(mesh) };
  }

  it('builds a cap with the logo cut out of it', async () => {
    const { mesh, size } = await render('cap');
    expect(mesh.triangleCount).toBeGreaterThan(0);
    // 33mm cap, 12mm tall, whatever the artwork was
    expect(size[0]).toBeCloseTo(33, 0);
    expect(size[2]).toBeCloseTo(12, 0);
  }, RENDER_BUDGET_MS);

  it('builds an inlay one logo_depth thick', async () => {
    const { mesh, size } = await render('logo');
    expect(mesh.triangleCount).toBeGreaterThan(0);
    expect(size[2]).toBeCloseTo(0.8, 2);
    // scaled to the default 22mm across the longest axis
    expect(Math.max(size[0], size[1])).toBeCloseTo(22, 0);
  }, RENDER_BUDGET_MS);

  // The reason the inlay body carries needsLogo: asking OpenSCAD for it with
  // no artwork is an error, not an empty mesh. The route skips it instead, so
  // downloading a 3MF before uploading a logo still yields a cap and a base.
  it('cannot be rendered with no artwork, which is why it is skipped', async () => {
    await expect(render('logo', [])).rejects.toThrow();
  }, RENDER_BUDGET_MS);

  it('still builds a cap when no logo was uploaded', async () => {
    const { mesh } = await render('cap', []);
    expect(mesh.triangleCount).toBeGreaterThan(0);
  }, RENDER_BUDGET_MS);
});
