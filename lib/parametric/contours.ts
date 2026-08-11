/**
 * Contours arriving from a browser, on their way into SCAD source.
 *
 * The tracing in trace.ts runs client-side, so what reaches us is a few hundred
 * coordinates rather than an image — no upload to accept, nothing to decode.
 * That also means every number here is untrusted until it has been through
 * readContours, which is the only thing standing between a request body and a
 * `polygon()` literal.
 *
 * Nothing is ever passed through as text. Coordinates are re-serialised from
 * parsed floats, which is what makes interpolating them into source safe.
 */

export type Point = [number, number];
export type Contour = Point[];

/** Generous next to a tidy trace, still well inside the render timeout. */
export const MAX_POINTS = 40_000;
export const MAX_CONTOURS = 3_000;
/** Bigger than any consumer bed is a mistake, not a request. */
const COORD_LIMIT = 500;

export function readContours(
  value: unknown,
  label: string,
  limits: { maxPoints?: number; maxContours?: number } = {}
): Contour[] {
  const maxPoints = limits.maxPoints ?? MAX_POINTS;
  const maxContours = limits.maxContours ?? MAX_CONTOURS;

  if (!Array.isArray(value)) throw new Error(`${label}: expected a list of outlines`);
  if (value.length > maxContours) throw new Error(`${label}: too many outlines`);

  const out: Contour[] = [];
  let points = 0;

  for (const contour of value) {
    if (!Array.isArray(contour) || contour.length < 3) continue;
    const cleaned: Contour = [];
    for (const point of contour) {
      if (!Array.isArray(point) || point.length !== 2) {
        throw new Error(`${label}: malformed point`);
      }
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error(`${label}: non-finite coordinate`);
      }
      if (Math.abs(x) > COORD_LIMIT || Math.abs(y) > COORD_LIMIT) {
        throw new Error(`${label}: coordinate out of range`);
      }
      cleaned.push([Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
    }
    points += cleaned.length;
    if (points > maxPoints) throw new Error(`${label}: too much detail — simplify further`);
    if (cleaned.length >= 3) out.push(cleaned);
  }

  return out;
}

export function pointTotal(contours: Contour[]): number {
  return contours.reduce((n, c) => n + c.length, 0);
}

/**
 * Emit `points` and `paths` lists for OpenSCAD's polygon().
 *
 * Returned as two assignments rather than a polygon() call so a .scad file can
 * declare the variables empty and the caller can append real ones — the model
 * then decides what to do with the artwork instead of receiving a fixed shape.
 */
export function contoursToScad(
  contours: Contour[],
  pointsVar = 'LOGO_POINTS',
  pathsVar = 'LOGO_PATHS'
): string {
  const points: string[] = [];
  const paths: string[] = [];
  let index = 0;

  for (const contour of contours) {
    const ids: number[] = [];
    for (const [x, y] of contour) {
      points.push(`[${x},${y}]`);
      ids.push(index++);
    }
    paths.push(`[${ids.join(',')}]`);
  }

  if (points.length === 0) return '';
  return `${pointsVar}=[${points.join(',')}];\n${pathsVar}=[${paths.join(',')}];\n`;
}
