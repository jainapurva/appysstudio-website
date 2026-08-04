import { describe, it, expect } from 'vitest';
import {
  alphaOf,
  coverage,
  dilate,
  fillEnclosed,
  hasUsefulAlpha,
  largestComponent,
  luminance,
  marchingSquares,
  pointCount,
  simplify,
  sobel,
  threshold,
  traceToMm,
  type Mask,
} from '@/lib/parametric/trace';

const W = 40;
const H = 40;

/** A filled rectangle, as a mask. */
function box(x0: number, y0: number, x1: number, y1: number, w = W, h = H): Mask {
  const mask = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) mask[y * w + x] = 1;
  }
  return mask;
}

/** The outline of a rectangle, one pixel thick — a drawing, not a silhouette. */
function ring(x0: number, y0: number, x1: number, y1: number): Mask {
  const mask = new Uint8Array(W * H);
  for (let x = x0; x < x1; x++) {
    mask[y0 * W + x] = 1;
    mask[(y1 - 1) * W + x] = 1;
  }
  for (let y = y0; y < y1; y++) {
    mask[y * W + x0] = 1;
    mask[y * W + (x1 - 1)] = 1;
  }
  return mask;
}

describe('pixel maths', () => {
  it('reads luminance and alpha out of RGBA', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 128]);
    expect(luminance(rgba, 2)[0]).toBeGreaterThan(240);
    expect(luminance(rgba, 2)[1]).toBe(0);
    expect(Array.from(alphaOf(rgba, 2))).toEqual([255, 128]);
  });

  it('only trusts alpha when a real part of the image is transparent', () => {
    expect(hasUsefulAlpha(new Uint8Array(100).fill(255))).toBe(false);
    const cutout = new Uint8Array(100).fill(255);
    cutout.fill(0, 0, 50);
    expect(hasUsefulAlpha(cutout)).toBe(true);
  });

  it('thresholds in both directions', () => {
    const values = new Uint8Array([10, 200]);
    expect(Array.from(threshold(values, 128, true))).toEqual([1, 0]);
    expect(Array.from(threshold(values, 128, false))).toEqual([0, 1]);
  });

  it('finds edges rather than areas', () => {
    // A half-dark, half-light image: the edge is the only thing that lights up.
    const lum = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 20; x < W; x++) lum[y * W + x] = 255;

    const edges = sobel(lum, W, H);
    expect(edges[10 * W + 19]).toBeGreaterThan(100);
    expect(edges[10 * W + 5]).toBe(0);
    expect(edges[10 * W + 30]).toBe(0);
  });
});

describe('dilate', () => {
  it('grows a mask by the requested radius', () => {
    const dot = new Uint8Array(W * H);
    dot[20 * W + 20] = 1;

    expect(coverage(dilate(dot, W, H, 0))).toBeCloseTo(1 / (W * H), 6);
    // A separable square kernel of radius 2 covers 5x5.
    const grown = dilate(dot, W, H, 2);
    expect(coverage(grown) * W * H).toBe(25);
  });

  it('leaves a mask alone at radius zero', () => {
    const before = box(5, 5, 10, 10);
    expect(dilate(before, W, H, 0)).toBe(before);
  });
});

describe('fillEnclosed', () => {
  it('fills the inside of a closed outline', () => {
    const outline = ring(10, 10, 30, 30);
    const filled = fillEnclosed(outline, W, H);

    expect(filled[20 * W + 20], 'centre is filled').toBe(1);
    expect(filled[10 * W + 10], 'the line itself counts as plate').toBe(1);
    expect(filled[2 * W + 2], 'outside stays empty').toBe(0);
    // 20x20 including the outline.
    expect(coverage(filled) * W * H).toBe(400);
  });

  it('leaks through a gap, which is the failure the UI warns about', () => {
    const outline = ring(10, 10, 30, 30);
    // Punch a hole in the top edge.
    for (let x = 18; x < 22; x++) outline[10 * W + x] = 0;

    const filled = fillEnclosed(outline, W, H);
    expect(filled[20 * W + 20], 'the middle is no longer sealed in').toBe(0);
    // Only the strokes survive, so coverage collapses — which is exactly the
    // signal PaintKitStudio uses to tell the visitor the outline has a gap.
    expect(coverage(filled)).toBeLessThan(0.06);
  });
});

describe('largestComponent', () => {
  it('keeps the biggest blob and drops the specks', () => {
    const mask = box(5, 5, 20, 20);
    mask[35 * W + 35] = 1; // a speck
    mask[36 * W + 35] = 1;

    const cleaned = largestComponent(mask, W, H);
    expect(cleaned[10 * W + 10]).toBe(1);
    expect(cleaned[35 * W + 35]).toBe(0);
  });

  it('returns an empty mask when there is nothing set', () => {
    expect(coverage(largestComponent(new Uint8Array(W * H), W, H))).toBe(0);
  });
});

describe('marchingSquares', () => {
  it('traces one loop around a solid square', () => {
    const contours = marchingSquares(box(10, 10, 30, 30), W, H);
    expect(contours).toHaveLength(1);

    const xs = contours[0].map((p) => p[0]);
    const ys = contours[0].map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(9.5, 1);
    expect(Math.max(...xs)).toBeCloseTo(29.5, 1);
    expect(Math.min(...ys)).toBeCloseTo(9.5, 1);
    expect(Math.max(...ys)).toBeCloseTo(29.5, 1);
  });

  it('traces two loops for a shape with a hole, which even-odd fills correctly', () => {
    const donut = box(8, 8, 32, 32);
    for (let y = 14; y < 26; y++) for (let x = 14; x < 26; x++) donut[y * W + x] = 0;

    expect(marchingSquares(donut, W, H)).toHaveLength(2);
  });

  it('traces a loop per blob', () => {
    const two = box(4, 4, 12, 12);
    for (let y = 24; y < 34; y++) for (let x = 24; x < 34; x++) two[y * W + x] = 1;
    expect(marchingSquares(two, W, H)).toHaveLength(2);
  });

  it('finds nothing in an empty grid', () => {
    expect(marchingSquares(new Uint8Array(W * H), W, H)).toHaveLength(0);
  });

  it('traces the frame when the shape fills it', () => {
    // Deliberate: a picture cropped tight to its subject should still come out
    // as a plaque, bounded by the edge of the image.
    expect(marchingSquares(new Uint8Array(W * H).fill(1), W, H)).toHaveLength(1);
  });

  it('closes the loop around a shape that runs off the edge', () => {
    // Touching the border used to leave an open polyline, which extrudes to
    // nothing useful.
    const contours = marchingSquares(box(0, 0, 20, 20), W, H);
    expect(contours).toHaveLength(1);
    expect(contours[0].length).toBeGreaterThan(3);
  });
});

describe('simplify', () => {
  it('reduces a straight run to its endpoints', () => {
    const line: [number, number][] = Array.from({ length: 20 }, (_, i) => [i, 0]);
    expect(simplify(line, 0.5)).toHaveLength(2);
  });

  it('keeps a corner', () => {
    const bent: [number, number][] = [
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [4, 1], [4, 2], [4, 3], [4, 4],
    ];
    const out = simplify(bent, 0.5);
    expect(out).toHaveLength(3);
    expect(out[1]).toEqual([4, 0]);
  });

  it('leaves short contours and zero tolerance alone', () => {
    const three: [number, number][] = [[0, 0], [1, 1], [2, 0]];
    expect(simplify(three, 1)).toBe(three);
    const line: [number, number][] = Array.from({ length: 10 }, (_, i) => [i, 0]);
    expect(simplify(line, 0)).toBe(line);
  });

  it('gets simpler as the tolerance rises', () => {
    const wobble: [number, number][] = Array.from({ length: 60 }, (_, i) => [
      i,
      Math.sin(i / 3) * 2,
    ]);
    expect(simplify(wobble, 2).length).toBeLessThan(simplify(wobble, 0.2).length);
  });
});

describe('traceToMm', () => {
  const options = { sizeMm: 80, tolerance: 0.6, minSpan: 2 };

  it('scales the longest side of the image to the requested size', () => {
    const contours = traceToMm(box(0, 0, W, H), W, H, { ...options, tolerance: 0 });
    const xs = contours.flatMap((c) => c.map((p) => p[0]));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(80, 0);
  });

  it('centres a shape on the origin exactly, before simplification', () => {
    const contours = traceToMm(box(5, 5, 35, 35), W, H, { ...options, tolerance: 0 });
    const xs = contours.flatMap((c) => c.map((p) => p[0]));
    const ys = contours.flatMap((c) => c.map((p) => p[1]));

    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0, 5);
    expect(Math.min(...ys) + Math.max(...ys)).toBeCloseTo(0, 5);
  });

  it('stays centred to within the simplification tolerance', () => {
    // Marching squares chamfers each corner into two points half a pixel
    // apart, and simplify is entitled to drop one of them — so a simplified
    // outline can sit up to a tolerance off centre. At the sizes this runs at
    // (420px across a 90mm plaque) that is about a tenth of a millimetre.
    const contours = traceToMm(box(5, 5, 35, 35), W, H, options);
    const xs = contours.flatMap((c) => c.map((p) => p[0]));
    const ys = contours.flatMap((c) => c.map((p) => p[1]));

    const mmPerPixel = options.sizeMm / Math.max(W, H);
    const slack = 2 * options.tolerance * mmPerPixel;

    expect(Math.abs(Math.min(...xs) + Math.max(...xs))).toBeLessThanOrEqual(slack);
    expect(Math.abs(Math.min(...ys) + Math.max(...ys))).toBeLessThanOrEqual(slack);
  });

  it('flips y, so the plaque comes out the same way up as the picture', () => {
    // A blob in the top half of the image (small y in pixels) should end up
    // with positive y in millimetres.
    const top = box(15, 2, 25, 12);
    const ys = traceToMm(top, W, H, options).flatMap((c) => c.map((p) => p[1]));
    expect(Math.min(...ys)).toBeGreaterThan(0);
  });

  it('drops specks below the minimum span', () => {
    const withSpeck = box(10, 10, 30, 30);
    withSpeck[35 * W + 35] = 1;
    expect(traceToMm(withSpeck, W, H, { ...options, minSpan: 3 })).toHaveLength(1);
    expect(traceToMm(withSpeck, W, H, { ...options, minSpan: 0 }).length).toBeGreaterThan(1);
  });

  it('rounds coordinates to something compact enough to post', () => {
    for (const [x, y] of traceToMm(box(9, 9, 31, 31), W, H, options).flat()) {
      expect(String(x).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3);
      expect(String(y).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3);
    }
  });

  it('counts points across every contour', () => {
    const donut = box(8, 8, 32, 32);
    for (let y = 14; y < 26; y++) for (let x = 14; x < 26; x++) donut[y * W + x] = 0;
    const contours = traceToMm(donut, W, H, options);
    expect(pointCount(contours)).toBe(contours.reduce((n, c) => n + c.length, 0));
    expect(pointCount(contours)).toBeGreaterThan(6);
  });
});

describe('a whole line drawing, end to end', () => {
  it('gives a filled plate and an outline that sits on it', () => {
    // A closed square outline with an eye inside — the shape of every kit.
    const drawing = ring(6, 6, 34, 34);
    for (let y = 14; y < 18; y++) for (let x = 14; x < 18; x++) drawing[y * W + x] = 1;

    const plate = largestComponent(fillEnclosed(drawing, W, H), W, H);
    expect(plate[20 * W + 20]).toBe(1);

    // The outline is only wanted where the plate actually is.
    const onPlate = new Uint8Array(plate.length);
    for (let i = 0; i < plate.length; i++) onPlate[i] = drawing[i] && plate[i] ? 1 : 0;
    expect(coverage(onPlate)).toBeGreaterThan(0);
    expect(coverage(onPlate)).toBeLessThan(coverage(plate));

    const options = { sizeMm: 90, tolerance: 0.8, minSpan: 1 };
    expect(traceToMm(plate, W, H, options).length).toBeGreaterThanOrEqual(1);
    // Outer stroke, its inner side, and the eye.
    expect(traceToMm(onPlate, W, H, options).length).toBeGreaterThanOrEqual(2);
  });
});
