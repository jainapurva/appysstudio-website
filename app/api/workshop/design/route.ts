import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimit, clientIp } from '@/lib/keycaps/ratelimit';
import { agentBase, agentUp } from '@/lib/workshop-agent';
import {
  WORKSHOP_AI_MODEL, WORKSHOP_SYSTEM_PROMPT, validateConversation, flattenConversation, type ChatTurn,
} from '@/lib/workshop-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PER_KID = { limit: 20, windowMs: 10 * 60 * 1000 };   // 20 asks per 10 min per device
const PER_DAY = { limit: 600, windowMs: 24 * 60 * 60 * 1000 };

// Two ways to reach Claude: the workshop agent (agent/workshop-agent.mjs, which
// runs `claude -p` on its own server) when WORKSHOP_AGENT_URL is set, otherwise
// the API directly with ANTHROPIC_API_KEY.
function backend(): 'agent' | 'api' | null {
  if (process.env.WORKSHOP_AGENT_URL && process.env.WORKSHOP_AGENT_TOKEN) return 'agent';
  if (process.env.ANTHROPIC_API_KEY) return 'api';
  return null;
}

async function aiEnabled(): Promise<boolean> {
  const b = backend();
  if (!b) return false;
  // If the agent's server or tunnel is down, offer paste mode instead of an
  // "Ask Claude" button that can only fail.
  return b === 'agent' ? agentUp() : true;
}

const STREAM_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
  // nginx buffers proxied responses by default; this lets the text reach
  // the kid as Claude writes it instead of all at once at the end.
  'X-Accel-Buffering': 'no',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Forward to the agent and pass its text stream straight through. With a
// sessionId the agent resumes the kid's Claude session and only needs the new
// message; the full transcript rides along so it can rebuild a lost session.
async function viaAgent(messages: ChatTurn[], sessionId: string | null): Promise<Response> {
  const base = agentBase();
  let res: Response;
  try {
    res = await fetch(`${base}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKSHOP_AGENT_TOKEN}`,
      },
      body: JSON.stringify({
        system: WORKSHOP_SYSTEM_PROMPT,
        prompt: sessionId ? messages[messages.length - 1].content : flattenConversation(messages),
        transcript: flattenConversation(messages),
        sessionId,
      }),
      signal: AbortSignal.timeout(240_000),
    });
  } catch (err) {
    console.error('workshop design: agent unreachable', err);
    return NextResponse.json({ error: 'The AI helper is offline. Ask your instructor.' }, { status: 502 });
  }
  if (res.status === 409) {
    return NextResponse.json({ error: 'Claude is still working on your last question. Wait for it to finish.' }, { status: 409 });
  }
  if (res.status === 503) {
    return NextResponse.json({ error: 'Lots of designing going on! Wait a minute and try again.' }, { status: 429 });
  }
  if (!res.ok || !res.body) {
    console.error('workshop design: agent error', res.status);
    return NextResponse.json({ error: 'The AI had a problem. Try again.' }, { status: 502 });
  }
  return new Response(res.body, { headers: STREAM_HEADERS });
}

// GET /api/workshop/design → { aiEnabled, codeRequired }. When the AI is off,
// the page switches to paste mode: the instructor runs the prompt in their own
// Claude on the big screen and the code is pasted back in. A workshop code is
// only asked for when WORKSHOP_AI_CODE is set.
export async function GET() {
  return NextResponse.json({
    aiEnabled: await aiEnabled(),
    codeRequired: Boolean(process.env.WORKSHOP_AI_CODE),
  });
}

// POST /api/workshop/design  { messages: ChatTurn[], accessCode?: string }
// Streams Claude's reply back as plain text. The page pulls the OpenSCAD out
// of the finished text.
export async function POST(req: NextRequest) {
  if (!backend()) {
    return NextResponse.json({ error: 'The AI designer is not switched on yet.' }, { status: 503 });
  }

  // A workshop code is optional: set WORKSHOP_AI_CODE to make kids type the
  // code from the board, leave it unset to let anyone on the page ask (the
  // rate limits below are then the only guard).
  const required = process.env.WORKSHOP_AI_CODE;
  let body: { messages?: unknown; accessCode?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  if (required && String(body.accessCode ?? '').trim().toLowerCase() !== required.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Type the workshop code from the board.', code: 'ACCESS_CODE' }, { status: 401 });
  }

  const problem = validateConversation(body.messages);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const messages = body.messages as ChatTurn[];

  const ip = clientIp(req.headers);
  const mine = rateLimit(`workshop-ai:${ip}`, PER_KID.limit, PER_KID.windowMs);
  const all = rateLimit('workshop-ai:all', PER_DAY.limit, PER_DAY.windowMs);
  if (!mine.ok || !all.ok) {
    const retryAfter = Math.max(mine.retryAfter, all.ok ? 0 : all.retryAfter);
    return NextResponse.json(
      { error: 'Lots of designing going on! Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const sessionId = typeof body.sessionId === 'string' && UUID.test(body.sessionId) ? body.sessionId.toLowerCase() : null;
  if (backend() === 'agent') return viaAgent(messages, sessionId);

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const reply = client.beta.messages.stream({
          model: WORKSHOP_AI_MODEL,
          max_tokens: 16000,
          output_config: { effort: 'medium' },
          // If a request is ever declined, let the API retry it on the
          // recommended fallback model instead of returning nothing.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: WORKSHOP_SYSTEM_PROMPT,
          messages,
        });
        for await (const event of reply) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await reply.finalMessage();
        if (final.stop_reason === 'refusal') {
          controller.enqueue(encoder.encode('\n\n[[ERROR]] I can only help with 3D designs today. Try describing your part again.'));
        } else if (final.stop_reason === 'max_tokens') {
          controller.enqueue(encoder.encode('\n\n[[ERROR]] That design got too long. Try asking for one part at a time.'));
        }
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) {
          controller.enqueue(encoder.encode('\n\n[[ERROR]] The AI is busy. Wait a minute and try again.'));
        } else if (err instanceof Anthropic.APIError) {
          console.error('workshop design: Claude API error', err.status, err.message);
          controller.enqueue(encoder.encode('\n\n[[ERROR]] The AI had a problem. Try again.'));
        } else {
          console.error('workshop design: unexpected error', err);
          controller.enqueue(encoder.encode('\n\n[[ERROR]] Something went wrong. Try again.'));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}
