/**
 * Turning a picture into outlines.
 *
 * Runs in the browser, on pixels a canvas has already decoded, so the server
 * never has to decode an image or accept a file upload — it receives a few
 * hundred coordinates instead of a few hundred kilobytes. Everything here is a
 * pure function over flat arrays, which is also what makes it testable.
 *
 * The output is closed contours. OpenSCAD's polygon() fills them even-odd, so
 * a loop inside another loop becomes a hole with no extra bookkeeping.
 */

export type Mask = Uint8Array; // 1 = set, 0 = clear
export interface Grid {
  width: number;
  height: number;
  data: Mask;
}

export type Point = [number, number];
export type Contour = Point[];

export function makeGrid(width: number, height: number): Grid {
  return { width, height, data: new Uint8Array(width * height) };
}

/** Perceptual luminance, 0–255, from RGBA bytes. */
export function luminance(rgba: Uint8ClampedArray | Uint8Array, count: number): Uint8Array {
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * 4;
    out[i] = (rgba[p] * 77 + rgba[p + 1] * 151 + rgba[p + 2] * 28) >> 8;
  }
  return out;
}

/** Alpha channel, for images that already carry a cut-out. */
export function alphaOf(rgba: Uint8ClampedArray | Uint8Array, count: number): Uint8Array {
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) out[i] = rgba[i * 4 + 3];
  return out;
}

/** True when enough pixels are meaningfully transparent to trust the alpha. */
export function hasUsefulAlpha(alpha: Uint8Array): boolean {
  let clear = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] < 32) clear++;
  return clear > alpha.length * 0.04;
}

export function threshold(values: Uint8Array, cut: number, below: boolean): Mask {
  const out = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) {
    out[i] = (below ? values[i] < cut : values[i] >= cut) ? 1 : 0;
  }
  return out;
}

/**
 * Sobel edge magnitude, for photographs.
 *
 * A photo has no lines to threshold — the subject and the background are both
 * mid-grey. Edges are what a person would trace by hand, so that is what gets
 * raised.
 */
export function sobel(lum: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(lum.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = lum[i - width - 1], t = lum[i - width], tr = lum[i - width + 1];
      const l = lum[i - 1], r = lum[i + 1];
      const bl = lum[i + width - 1], b = lum[i + width], br = lum[i + width + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;
      out[i] = Math.min(255, Math.hypot(gx, gy));
    }
  }
  return out;
}

/** Grow a mask by `radius` pixels, so a one-pixel line becomes printable. */
export function dilate(mask: Mask, width: number, height: number, radius: number): Mask {
  if (radius <= 0) return mask;
  // Separable: a square kernel is close enough at these radii and much cheaper
  // than a disc, and the contours get simplified afterwards anyway.
  let src = mask;
  for (const horizontal of [true, false]) {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let hit = 0;
        for (let d = -radius; d <= radius && !hit; d++) {
          const nx = horizontal ? x + d : x;
          const ny = horizontal ? y : y + d;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (src[ny * width + nx]) hit = 1;
        }
        out[y * width + x] = hit;
      }
    }
    src = out;
  }
  return src;
}

/**
 * Everything the outline encloses.
 *
 * Flood the background inward from the border across pixels the outline does
 * not occupy; whatever the flood cannot reach is either the outline itself or
 * sealed inside it, and that is the plaque. Any gap in the outline lets the
 * flood leak and the silhouette collapses to the strokes alone — which is why
 * the UI warns when the filled area comes out implausibly small.
 */
export function fillEnclosed(lines: Mask, width: number, height: number): Mask {
  const outside = new Uint8Array(lines.length);
  const stack: number[] = [];

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (outside[i] || lines[i]) return;
    outside[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i - x) / width;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const out = new Uint8Array(lines.length);
  for (let i = 0; i < lines.length; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

/** How much of the grid a mask covers, 0–1. */
export function coverage(mask: Mask): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i];
  return n / mask.length;
}

/** Keep only the largest connected run of set pixels — drops specks. */
export function largestComponent(mask: Mask, width: number, height: number): Mask {
  const seen = new Uint8Array(mask.length);
  let best: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const stack = [start];
    const group: number[] = [];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      group.push(i);
      const x = i % width;
      const y = (i - x) / width;
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && mask[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (group.length > best.length) best = group;
  }

  const out = new Uint8Array(mask.length);
  for (const i of best) out[i] = 1;
  return out;
}

/**
 * Marching squares: the boundary between set and clear, as closed loops.
 *
 * Segments are emitted per 2x2 cell on edge midpoints, then chained end to end.
 * The two ambiguous saddle cases (5 and 10) are resolved the same way every
 * time, which keeps the result consistent even though either reading is valid.
 */
export function marchingSquares(mask: Mask, width: number, height: number): Contour[] {
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : mask[y * width + x];

  // Endpoints land on half-integer coordinates, so scaling by two keeps every
  // key an exact integer and chaining becomes a plain map lookup.
  const segments: [string, string][] = [];
  const points = new Map<string, Point>();

  const key = (x: number, y: number) => {
    const k = `${Math.round(x * 2)},${Math.round(y * 2)}`;
    if (!points.has(k)) points.set(k, [x, y]);
    return k;
  };

  for (let y = -1; y < height; y++) {
    for (let x = -1; x < width; x++) {
      const tl = at(x, y), tr = at(x + 1, y);
      const bl = at(x, y + 1), br = at(x + 1, y + 1);
      const code = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (code === 0 || code === 15) continue;

      const top = key(x + 0.5, y);
      const right = key(x + 1, y + 0.5);
      const bottom = key(x + 0.5, y + 1);
      const left = key(x, y + 0.5);

      switch (code) {
        case 1: case 14: segments.push([left, bottom]); break;
        case 2: case 13: segments.push([bottom, right]); break;
        case 3: case 12: segments.push([left, right]); break;
        case 4: case 11: segments.push([top, right]); break;
        case 6: case 9: segments.push([top, bottom]); break;
        case 7: case 8: segments.push([left, top]); break;
        case 5: segments.push([left, top], [bottom, right]); break;
        case 10: segments.push([top, right], [left, bottom]); break;
      }
    }
  }

  // Chain segments into loops.
  const links = new Map<string, string[]>();
  for (const [a, b] of segments) {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a)!.push(b);
    links.get(b)!.push(a);
  }

  const used = new Set<string>();
  const contours: Contour[] = [];

  for (const start of links.keys()) {
    if (used.has(start)) continue;
    const loop: Point[] = [];
    let current = start;
    let previous: string | null = null;

    while (current && !used.has(current)) {
      used.add(current);
      loop.push(points.get(current)!);
      const next: string | undefined = (links.get(current) ?? []).find(
        (candidate) => candidate !== previous && !used.has(candidate)
      );
      previous = current;
      if (!next) break;
      current = next;
    }

    // Two points cannot bound anything.
    if (loop.length >= 3) contours.push(loop);
  }

  return contours;
}

/** Ramer–Douglas–Peucker. Drops the points that were only ever pixel stairs. */
export function simplify(points: Contour, tolerance: number): Contour {
  if (points.length < 4 || tolerance <= 0) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    if (last <= first + 1) continue;

    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;

    let worst = -1;
    let worstAt = first;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      const distance = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (distance > worst) {
        worst = distance;
        worstAt = i;
      }
    }

    if (worst > tolerance) {
      keep[worstAt] = 1;
      stack.push([first, worstAt], [worstAt, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

export interface TraceOptions {
  /** Longest side of the finished plaque, in mm. */
  sizeMm: number;
  /** Douglas-Peucker tolerance, in pixels. */
  tolerance: number;
  /** Contours shorter than this many pixels of span are dropped as specks. */
  minSpan: number;
}

/**
 * Trace a mask and map it into millimetres, y flipped so the plaque comes out
 * the same way up as the picture.
 */
export function traceToMm(
  mask: Mask,
  width: number,
  height: number,
  options: TraceOptions
): Contour[] {
  const scale = options.sizeMm / Math.max(width, height);

  return marchingSquares(mask, width, height)
    .map((contour) => simplify(contour, options.tolerance))
    .filter((contour) => {
      if (contour.length < 3) return false;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of contour) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      return Math.max(maxX - minX, maxY - minY) >= options.minSpan;
    })
    .map((contour) =>
      // Centre on (width-1)/2, not width/2. Marching squares puts the boundary
      // of a full-frame shape at -0.5 and width-0.5, so the midpoint of what it
      // can emit is half a pixel short of the array's midpoint. Using width/2
      // leaves everything offset by half a pixel.
      contour.map(([x, y]) => [
        Number(((x - (width - 1) / 2) * scale).toFixed(3)),
        Number((((height - 1) / 2 - y) * scale).toFixed(3)),
      ] as Point)
    );
}

/** Total points across every contour — what the payload size comes down to. */
export function pointCount(contours: Contour[]): number {
  return contours.reduce((n, c) => n + c.length, 0);
}
