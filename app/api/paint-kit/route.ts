import { NextRequest, NextResponse } from 'next/server';
import { renderScad, RenderBusyError } from '@/lib/parametric/render';
import { parseBinaryStl, meshSize, toThreeMf, type Mesh } from '@/lib/parametric/mesh';
import { clientIp, rateLimit } from '@/lib/keycaps/ratelimit';
import { trackEvent } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMIT = 40;
const WINDOW_MS = 10 * 60 * 1000;

// The browser sends geometry, not an image, so the ceiling is on point count
// rather than bytes. 40k points is far more than a tidy trace needs and still
// renders inside the timeout.
const MAX_POINTS = 40_000;
const MAX_CONTOURS = 3_000;

type Contour = [number, number][];

interface Body {
  base?: unknown;
  lines?: unknown;
  baseHeight?: unknown;
  lineHeight?: unknown;
  hanger?: unknown;
  format?: unknown;
  preview?: unknown;
}

/** Coordinates arrive from a browser, so nothing is trusted until it is a finite number. */
function readContours(value: unknown, label: string): Contour[] {
  if (!Array.isArray(value)) throw new Error(`${label}: expected a list of outlines`);
  if (value.length > MAX_CONTOURS) throw new Error(`${label}: too many outlines`);

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
      // A plaque bigger than any consumer bed is a mistake, not a request.
      if (Math.abs(x) > 500 || Math.abs(y) > 500) {
        throw new Error(`${label}: coordinate out of range`);
      }
      cleaned.push([Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
    }
    points += cleaned.length;
    if (points > MAX_POINTS) throw new Error(`${label}: too much detail — simplify further`);
    if (cleaned.length >= 3) out.push(cleaned);
  }

  return out;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

/**
 * Emit SCAD for a set of contours.
 *
 * Every number written here has already been through readContours, so the only
 * thing reaching OpenSCAD is finite, bounded coordinates. Nothing from the
 * request is interpolated as text.
 */
function polygonScad(contours: Contour[]): string {
  const points: string[] = [];
  const paths: string[] = [];
  let offset = 0;

  for (const contour of contours) {
    const indices: number[] = [];
    for (const [x, y] of contour) {
      points.push(`[${x},${y}]`);
      indices.push(offset++);
    }
    paths.push(`[${indices.join(',')}]`);
  }

  if (points.length === 0) return '';
  return `polygon(points=[${points.join(',')}],paths=[${paths.join(',')}]);`;
}

function buildScad(
  base: Contour[],
  lines: Contour[],
  baseHeight: number,
  lineHeight: number,
  part: 'base' | 'lines'
): string {
  const contours = part === 'base' ? base : lines;
  const poly = polygonScad(contours);
  if (!poly) throw new Error('empty model');

  if (part === 'base') {
    return `linear_extrude(height=${baseHeight})${poly}`;
  }
  // The raised outline overlaps the plate by a hair. Two solids that merely
  // touch leave a zero-thickness seam that some slicers read as a gap.
  return `translate([0,0,${baseHeight - 0.01}])linear_extrude(height=${lineHeight + 0.01})${poly}`;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`paintkit:${clientIp(req.headers)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'That is a lot of kits! Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  let base: Contour[];
  let lines: Contour[];
  try {
    base = readContours(body.base, 'plate');
    lines = readContours(body.lines, 'outline');
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad outline data.' },
      { status: 400 }
    );
  }

  if (base.length === 0) {
    return NextResponse.json(
      { error: 'Nothing to build — try a different threshold.' },
      { status: 400 }
    );
  }

  const baseHeight = clampNumber(body.baseHeight, 1, 8, 2.4);
  const lineHeight = clampNumber(body.lineHeight, 0.2, 4, 0.8);
  const format = body.format === '3mf' ? '3mf' : 'stl';
  // Set by the studio's live preview; a download never sets it.
  const preview = body.preview === true;

  try {
    // Base and outline are rendered separately so the 3MF can carry them as two
    // objects — that is what lets the slicer put a different colour on the
    // raised lines, which is the whole point of a paint kit.
    const baseMesh = parseBinaryStl(
      (await renderScad(buildScad(base, lines, baseHeight, lineHeight, 'base'), [])).stl
    );

    let lineMesh: Mesh | null = null;
    if (lines.length > 0) {
      lineMesh = parseBinaryStl(
        (await renderScad(buildScad(base, lines, baseHeight, lineHeight, 'lines'), [])).stl
      );
    }

    const parts = [
      { mesh: baseMesh, name: 'Plate' },
      ...(lineMesh ? [{ mesh: lineMesh, name: 'Outline' }] : []),
    ];

    let payload: Buffer;
    if (format === '3mf') {
      payload = await toThreeMf(parts, 'Paint Kit');
    } else {
      // A single STL cannot express two colours, so it carries the plate with
      // the outline standing proud of it; a filament change at the right layer
      // gets the same result on a single-material printer.
      payload = concatStl(parts.map((p) => p.mesh));
    }

    const [sx, sy, sz] = meshSize(baseMesh);
    // Previews stay out of analytics — see the note in the parametric route.
    // This one re-renders every time a slider moves, so it would be worse.
    if (!preview) {
      trackEvent({
        type: 'paint_kit_generated',
        data: { format, contours: base.length + lines.length },
        ip: clientIp(req.headers),
        userAgent: req.headers.get('user-agent') ?? undefined,
      });
    }

    return new NextResponse(new Uint8Array(payload), {
      status: 200,
      headers: {
        'Content-Type':
          format === '3mf'
            ? 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
            : 'model/stl',
        'Content-Length': String(payload.length),
        'Content-Disposition': `attachment; filename="AppysStudio-paint-kit.${format}"`,
        // sz already includes the raised outline when there is one.
        'X-Model-Size': [sx, sy, lineMesh ? sz + lineHeight : sz]
          .map((n) => n.toFixed(1))
          .join('x'),
      },
    });
  } catch (err) {
    if (err instanceof RenderBusyError) {
      return NextResponse.json(
        { error: err.message },
        { status: 503, headers: { 'Retry-After': '5' } }
      );
    }
    const message = err instanceof Error ? err.message : 'Could not build that one.';
    console.error('paint kit failed:', err);
    const known = /too long|empty model|too much detail|OpenSCAD/i.test(message);
    return NextResponse.json(
      {
        error: known
          ? 'Could not build that outline. Try a simpler picture or a coarser trace.'
          : 'Something went wrong building that. Please try again.',
      },
      { status: known ? 400 : 500 }
    );
  }
}

/** Merge meshes into one binary STL — the preview and the single-colour download. */
function concatStl(meshes: Mesh[]): Buffer {
  const total = meshes.reduce((n, m) => n + m.triangleCount, 0);
  const out = Buffer.alloc(84 + total * 50);
  out.write('Appy’s Studio paint kit', 0, 'utf8');
  out.writeUInt32LE(total, 80);

  let at = 84;
  for (const mesh of meshes) {
    for (let t = 0; t < mesh.triangleCount; t++) {
      // Normals are left at zero; every slicer recomputes them from winding.
      at += 12;
      for (let v = 0; v < 3; v++) {
        const index = mesh.indices[t * 3 + v] * 3;
        out.writeFloatLE(mesh.vertices[index], at);
        out.writeFloatLE(mesh.vertices[index + 1], at + 4);
        out.writeFloatLE(mesh.vertices[index + 2], at + 8);
        at += 12;
      }
      at += 2;
    }
  }
  return out;
}
