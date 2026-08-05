import { NextRequest, NextResponse } from 'next/server';
import { findModel } from '@/lib/parametric/models';
import { resolveParams, toDefines, describeValues } from '@/lib/parametric/spec';
import { loadScad, renderScad, RenderBusyError } from '@/lib/parametric/render';
import { parseBinaryStl, meshSize, toThreeMf } from '@/lib/parametric/mesh';
import { clientIp, rateLimit } from '@/lib/keycaps/ratelimit';
import { trackEvent } from '@/lib/analytics';

export const runtime = 'nodejs';
// Output depends entirely on the query string and the .scad files are read off
// disk, so there is nothing for Next to prerender.
export const dynamic = 'force-dynamic';

// Rendering is real CPU on a box shared with other services, so this is tighter
// than the keycap limit. Counted per IP, which a whole school shares.
const LIMIT = 40;
const WINDOW_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const model = findModel(slug);
  if (!model) {
    return NextResponse.json({ error: 'No such model.' }, { status: 404 });
  }

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
  // The customiser marks its preview fetches so they can be kept out of
  // analytics; a download never sets it.
  const preview = req.nextUrl.searchParams.get('preview') === '1';

  const limit = rateLimit(`parametric:${clientIp(req.headers)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'That is a lot of models! Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const source = await loadScad(model.file);
    const { stl, ms } = await renderScad(source, toDefines(model.params, values));

    const mesh = parseBinaryStl(stl);
    const [sx, sy, sz] = meshSize(mesh);

    const body = format === '3mf' ? await toThreeMf(mesh, model.name) : stl;
    const suffix = describeValues(model.params, values);
    const filename = `AppysStudio-${model.slug}-${suffix}.${format}`.replace(/-+\./, '.');

    // Previews are deliberately not tracked. trackEvent reads, parses,
    // re-serialises and rewrites the whole events file synchronously on the
    // request thread — 27ms once it reaches its 10,000-event cap (2.6MB). The
    // customiser fires a render every time a slider settles, so tracking those
    // would put that back on the event loop dozens of times per visitor and
    // undo the point of rendering in a worker. A download is the real signal.
    if (!preview) {
      trackEvent({
        type: 'parametric_generated',
        data: { slug: model.slug, format, ms, triangles: mesh.triangleCount },
        ip: clientIp(req.headers),
        userAgent: req.headers.get('user-agent') ?? undefined,
      });
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type':
          format === '3mf'
            ? 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
            : 'model/stl',
        'Content-Length': String(body.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Same parameters always give the same mesh, so this is safe to keep.
        'Cache-Control': 'public, max-age=86400',
        // Read by the customiser to show the finished size without parsing the
        // mesh a second time in the browser.
        'X-Model-Size': [sx, sy, sz].map((n) => n.toFixed(1)).join('x'),
        'X-Model-Triangles': String(mesh.triangleCount),
        'X-Render-Ms': String(ms),
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
}
