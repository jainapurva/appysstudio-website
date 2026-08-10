import { NextRequest, NextResponse } from 'next/server';
import { findListedModel, type ParametricModel } from '@/lib/parametric/models';
import {
  resolveParams,
  toDefines,
  describeValues,
  type ParamValues,
} from '@/lib/parametric/spec';
import { loadScad, renderScad, RenderBusyError } from '@/lib/parametric/render';
import { parseBinaryStl, meshSize, toThreeMf, type Mesh } from '@/lib/parametric/mesh';
import { readContours, contoursToScad, type Contour } from '@/lib/parametric/contours';
import { clientIp, rateLimit } from '@/lib/keycaps/ratelimit';
import { trackEvent } from '@/lib/analytics';

export const runtime = 'nodejs';
// Output depends entirely on the parameters and the .scad files are read off
// disk, so there is nothing for Next to prerender.
export const dynamic = 'force-dynamic';

// Rendering is real CPU on a box shared with other services, so this is tighter
// than the keycap limit. Counted per IP, which a whole school shares.
const LIMIT = 40;
const WINDOW_MS = 10 * 60 * 1000;

/** SCAD values we select ourselves, never taken from a request. */
function partDefine(model: ParametricModel, value: string): string[] {
  return model.partKey ? [`${model.partKey}="${value}"`] : [];
}

interface Built {
  body: Buffer | Uint8Array;
  filename: string;
  format: 'stl' | '3mf';
  size: [number, number, number];
  triangles: number;
  ms: number;
}

/**
 * Render a model and package it.
 *
 * A model that declares `parts` is rendered once per body when a 3MF is asked
 * for, so the slicer receives separate objects it can colour independently.
 * Everything else — every STL, and every preview — is one pass over the whole
 * model, because a preview only ever shows one mesh.
 */
async function build(
  model: ParametricModel,
  values: ParamValues,
  format: 'stl' | '3mf',
  logoScad: string
): Promise<Built> {
  const scad = await loadScad(model.file);
  // Appended, not prepended: OpenSCAD resolves a top-level variable to its last
  // assignment, so this is what overrides the file's empty defaults.
  const source = logoScad ? `${scad}\n${logoScad}` : scad;
  const defines = toDefines(model.params, values);

  const wantsParts = format === '3mf' && model.parts && model.parts.length > 0;

  if (wantsParts) {
    const meshes: { mesh: Mesh; name: string }[] = [];
    let ms = 0;
    for (const part of model.parts!) {
      // A body that only exists because artwork was uploaded is skipped when
      // there is none. Rendering it anyway would fail — OpenSCAD treats
      // "nothing to export" as an error — and recognising that by its message
      // would mean a real failure could be mistaken for an empty body.
      if (part.needsLogo && !logoScad) continue;

      const result = await renderScad(source, [...defines, ...partDefine(model, part.value)]);
      ms += result.ms;
      const mesh = parseBinaryStl(result.stl);
      if (mesh.triangleCount > 0) meshes.push({ mesh, name: part.name });
    }
    if (meshes.length === 0) throw new Error('empty model');

    const body = await toThreeMf(meshes, model.name);
    const bounds = meshes.reduce(
      (acc, { mesh }) => {
        for (let i = 0; i < 3; i++) {
          acc.min[i] = Math.min(acc.min[i], mesh.bounds.min[i]);
          acc.max[i] = Math.max(acc.max[i], mesh.bounds.max[i]);
        }
        return acc;
      },
      { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
    );

    return {
      body,
      filename: '',
      format,
      size: [
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2],
      ],
      triangles: meshes.reduce((n, { mesh }) => n + mesh.triangleCount, 0),
      ms,
    };
  }

  const preview = model.previewPart ? partDefine(model, model.previewPart) : [];
  const { stl, ms } = await renderScad(source, [...defines, ...preview]);
  const mesh = parseBinaryStl(stl);
  if (mesh.triangleCount === 0) throw new Error('empty model');

  return {
    body: format === '3mf' ? await toThreeMf(mesh, model.name) : stl,
    filename: '',
    format,
    size: meshSize(mesh),
    triangles: mesh.triangleCount,
    ms,
  };
}

function respond(model: ParametricModel, values: ParamValues, built: Built): NextResponse {
  const suffix = describeValues(model.params, values);
  const filename = `AppysStudio-${model.slug}-${suffix}.${built.format}`.replace(/-+\./, '.');

  return new NextResponse(new Uint8Array(built.body), {
    status: 200,
    headers: {
      'Content-Type':
        built.format === '3mf'
          ? 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
          : 'model/stl',
      'Content-Length': String(built.body.length),
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Same parameters always give the same mesh, so this is safe to keep.
      // Logo builds are POSTs and are not cached by anything.
      'Cache-Control': 'public, max-age=86400',
      // Read by the customiser to show the finished size without parsing the
      // mesh a second time in the browser.
      'X-Model-Size': built.size.map((n) => n.toFixed(1)).join('x'),
      'X-Model-Triangles': String(built.triangles),
      'X-Render-Ms': String(built.ms),
    },
  });
}

function failure(slug: string, err: unknown): NextResponse {
  if (err instanceof RenderBusyError) {
    return NextResponse.json(
      { error: err.message },
      { status: 503, headers: { 'Retry-After': '5' } }
    );
  }
  const message = err instanceof Error ? err.message : 'Could not build that one.';
  console.error(`parametric ${slug} failed:`, err);
  // A timeout or a SCAD error is worth telling the visitor about, because
  // changing the numbers will fix it. Anything else is ours.
  const known = /too long|OpenSCAD|empty model|no output/i.test(message);
  return NextResponse.json(
    {
      error: known
        ? 'Could not build that combination. Try adjusting the numbers.'
        : 'Something went wrong building that. Please try again.',
    },
    { status: known ? 400 : 500 }
  );
}

function track(
  req: NextRequest,
  model: ParametricModel,
  built: Built,
  preview: boolean
): void {
  // Previews are deliberately not tracked. trackEvent reads, parses,
  // re-serialises and rewrites the whole events file synchronously on the
  // request thread — 27ms once it reaches its 10,000-event cap (2.6MB). The
  // customiser fires a render every time a slider settles, so tracking those
  // would put that back on the event loop dozens of times per visitor and
  // undo the point of rendering in a worker. A download is the real signal.
  if (preview) return;
  trackEvent({
    type: 'parametric_generated',
    data: {
      slug: model.slug,
      format: built.format,
      ms: built.ms,
      triangles: built.triangles,
    },
    ip: clientIp(req.headers),
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const model = findListedModel(slug);
  if (!model) return NextResponse.json({ error: 'No such model.' }, { status: 404 });

  const raw: Record<string, string | undefined> = {};
  for (const def of model.params) {
    const value = req.nextUrl.searchParams.get(def.key);
    if (value !== null) raw[def.key] = value;
  }

  const { values, rejected } = resolveParams(model.params, raw);
  if (rejected.length > 0) {
    return NextResponse.json({ error: rejected[0], rejected }, { status: 400 });
  }

  const format = req.nextUrl.searchParams.get('format') === '3mf' ? '3mf' : 'stl';
  const preview = req.nextUrl.searchParams.get('preview') === '1';

  const limit = rateLimit(`parametric:${clientIp(req.headers)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'That is a lot of models! Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    // No logo on this path: a query string cannot carry one, so a model that
    // takes artwork simply builds without it here.
    const built = await build(model, values, format, '');
    track(req, model, built, preview);
    return respond(model, values, built);
  } catch (err) {
    return failure(slug, err);
  }
}

/**
 * The same build, for models that take artwork.
 *
 * Contours are far too large for a query string, so a logo model posts instead.
 * Nothing in the body reaches OpenSCAD as text: parameters go through
 * resolveParams exactly as on GET, and coordinates are re-serialised from
 * parsed floats by readContours.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const model = findListedModel(slug);
  if (!model) return NextResponse.json({ error: 'No such model.' }, { status: 404 });

  const takesLogo = model.params.some((p) => p.kind === 'logo');
  if (!takesLogo) {
    return NextResponse.json({ error: 'This model does not take artwork.' }, { status: 405 });
  }

  let body: { params?: unknown; logo?: unknown; format?: unknown; preview?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  const raw: Record<string, string | undefined> = {};
  const given = (body.params ?? {}) as Record<string, unknown>;
  for (const def of model.params) {
    const value = given[def.key];
    if (value !== undefined && value !== null) raw[def.key] = String(value);
  }

  const { values, rejected } = resolveParams(model.params, raw);
  if (rejected.length > 0) {
    return NextResponse.json({ error: rejected[0], rejected }, { status: 400 });
  }

  let contours: Contour[] = [];
  if (body.logo !== undefined && body.logo !== null) {
    try {
      contours = readContours(body.logo, 'logo');
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Bad outline data.' },
        { status: 400 }
      );
    }
  }

  const format = body.format === '3mf' ? '3mf' : 'stl';
  const preview = body.preview === true;

  const limit = rateLimit(`parametric:${clientIp(req.headers)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'That is a lot of models! Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const built = await build(model, values, format, contoursToScad(contours));
    track(req, model, built, preview);
    return respond(model, values, built);
  } catch (err) {
    return failure(slug, err);
  }
}
