import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_NAME_LENGTH,
  NAME_PATTERN,
  planFor,
  sanitiseName,
} from '@/lib/keycaps/spec';
import { generate, warmup } from '@/lib/keycaps/generator';
import { clientIp, rateLimit } from '@/lib/keycaps/ratelimit';
import { trackEvent } from '@/lib/analytics';

export const runtime = 'nodejs';
// The parts library is read off disk and the output is per-name, so there is
// nothing here for Next to prerender.
export const dynamic = 'force-dynamic';

// Counted per IP, so a whole household or school behind one NAT shares it.
// Generous enough not to bite real use; 30 files is still under 2s of CPU.
const LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('name') ?? '';
  const name = sanitiseName(raw);
  if (!name) {
    return NextResponse.json({ error: 'Enter a name.' }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Names can be up to ${MAX_NAME_LENGTH} letters.` },
      { status: 400 }
    );
  }
  if (!NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: 'Letters A–Z only.' }, { status: 400 });
  }

  const limit = rateLimit(`keycap:${clientIp(req.headers)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'That is a lot of keychains! Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const plan = planFor(name);
    const result = await generate({
      letters: plan.letters,
      bases: plan.bases,
      onePlate: true,
    });

    trackEvent({
      type: 'keycap_generated',
      data: { name, letters: plan.letters.length },
      ip: clientIp(req.headers),
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    const filename = `AppysStudio-Keycaps-${name}.3mf`;
    return new NextResponse(new Uint8Array(result.file), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
        'Content-Length': String(result.file.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
        'X-Keycap-Plates': String(result.plates.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not build that one.';
    console.error('keycap generate failed:', err);
    // Bad input surfaces its own message; anything else is ours to own.
    const known = /letters|tray|engraving|plate|library/i.test(message);
    return NextResponse.json(
      { error: known ? message : 'Could not build that one. Try a different name.' },
      { status: known ? 400 : 500 }
    );
  }
}

// Deflating the 13 MB keycap body takes ~400 ms the first time; do it at module
// load so the first visitor of the day doesn't wait for it.
void warmup().catch((err) => console.error('keycap warmup failed:', err));
