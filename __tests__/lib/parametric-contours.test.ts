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
