// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { gunzipSync } from 'zlib';
import { resetRateLimits } from '@/lib/keycaps/ratelimit';
import { resetAgentHealth } from '@/lib/workshop-agent';
import { playgroundUrl } from '@/lib/playground';

const streamMock = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error { status = 500; }
  class RateLimitError extends APIError { status = 429; }
  class Anthropic {
    static APIError = APIError;
    static RateLimitError = RateLimitError;
    beta = { messages: { stream: streamMock } };
  }
  return { default: Anthropic };
});

import { GET, POST } from '@/app/api/workshop/design/route';

function fakeStream(chunks: string[], stopReason = 'end_turn') {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    },
    finalMessage: async () => ({ stop_reason: stopReason }),
  };
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/workshop/design', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
  });
}

const kidAsk = { messages: [{ role: 'user', content: 'Make a keycap with the letter M.' }], accessCode: 'click' };

describe('POST /api/workshop/design', () => {
  beforeEach(() => {
    resetRateLimits();
    streamMock.mockReset();
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubEnv('WORKSHOP_AI_CODE', 'CLICK');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('reports the AI as off without a key, so the page uses paste mode', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(await (await GET()).json()).toEqual({ aiEnabled: false, codeRequired: true });
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    expect(await (await GET()).json()).toEqual({ aiEnabled: true, codeRequired: true });
  });

  it('asks for no code, and needs none, when WORKSHOP_AI_CODE is unset', async () => {
    vi.stubEnv('WORKSHOP_AI_CODE', '');
    expect(await (await GET()).json()).toEqual({ aiEnabled: true, codeRequired: false });
    streamMock.mockReturnValue(fakeStream(['```openscad\ncube(1);\n```']));
    const res = await POST(request({ messages: [{ role: 'user', content: 'Make a keycap' }] }));
    expect(res.status).toBe(200);
  });

  it('is off without a key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const res = await POST(request(kidAsk));
    expect(res.status).toBe(503);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it('asks for the workshop code when it is wrong', async () => {
    const res = await POST(request({ ...kidAsk, accessCode: 'nope' }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('ACCESS_CODE');
  });

  it('rejects a malformed conversation', async () => {
    const res = await POST(request({ messages: [{ role: 'assistant', content: 'hi' }], accessCode: 'CLICK' }));
    expect(res.status).toBe(400);
  });

  it('streams the reply and calls Claude with the workshop settings', async () => {
    streamMock.mockReturnValue(fakeStream(['```openscad\n', 'cube(17);\n', '```\nDone!']));
    const res = await POST(request(kidAsk));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
    expect(await res.text()).toBe('```openscad\ncube(17);\n```\nDone!');
    const args = streamMock.mock.calls[0][0];
    expect(args.model).toBe('claude-opus-5');
    expect(args.fallbacks).toBe('default');
    expect(args.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(args.system).toContain('kids aged about 10 to 14');
    expect(args.messages).toEqual(kidAsk.messages);
  });

  it('adds a kid-friendly error marker on a refusal', async () => {
    streamMock.mockReturnValue(fakeStream([], 'refusal'));
    const text = await (await POST(request(kidAsk))).text();
    expect(text).toContain('[[ERROR]]');
  });

  it('rate-limits one device', async () => {
    streamMock.mockImplementation(() => fakeStream(['ok']));
    let last = 200;
    for (let i = 0; i < 21; i++) last = (await POST(request(kidAsk))).status;
    expect(last).toBe(429);
  });
});

describe('POST /api/workshop/design via the claude -p agent', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    resetRateLimits();
    streamMock.mockReset();
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('WORKSHOP_AI_CODE', 'CLICK');
    vi.stubEnv('WORKSHOP_AGENT_URL', 'http://agent.test:8787/');
    vi.stubEnv('WORKSHOP_AGENT_TOKEN', 'secret');
  });
  afterEach(() => { vi.unstubAllEnvs(); globalThis.fetch = realFetch; resetAgentHealth(); });

  it('turns the AI on when the agent answers its health check', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(await (await GET()).json()).toEqual({ aiEnabled: true, codeRequired: true });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('http://agent.test:8787/health');
  });

  it('falls back to paste mode when the agent or its tunnel is down', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    expect(await (await GET()).json()).toEqual({ aiEnabled: false, codeRequired: true });
  });

  it('forwards the system prompt and flattened chat, and streams the agent reply through', async () => {
    const fetchMock = vi.fn(async () => new Response('```openscad\ncube(1);\n```'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const res = await POST(request({
      messages: [
        { role: 'user', content: 'Make a keycap' },
        { role: 'assistant', content: '```openscad\ncube(17);\n```' },
        { role: 'user', content: 'Make it rounder' },
      ],
      accessCode: 'click',
    }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('```openscad\ncube(1);\n```');
    expect(streamMock).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://agent.test:8787/run');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
    const sent = JSON.parse(String(init.body));
    expect(sent.system).toContain('kids aged about 10 to 14');
    expect(sent.prompt).toContain('KID:\nMake a keycap');
    expect(sent.prompt).toContain('YOU (your earlier reply):');
    expect(sent.prompt.endsWith("Reply to the kid's last message.")).toBe(true);
  });

  it('with a session, sends just the new message plus the transcript for rebuilding', async () => {
    const fetchMock = vi.fn(async () => new Response('ok'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    await POST(request({
      messages: [
        { role: 'user', content: 'Make a keycap' },
        { role: 'assistant', content: '```openscad\ncube(17);\n```' },
        { role: 'user', content: 'Make it rounder' },
      ],
      accessCode: 'CLICK',
      sessionId: id.toUpperCase(),
    }));
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.sessionId).toBe(id);
    expect(sent.prompt).toBe('Make it rounder');
    expect(sent.transcript).toContain('KID:\nMake a keycap');
  });

  it('ignores a malformed session id and tells a double-click to wait', async () => {
    const fetchMock = vi.fn(async () => new Response('still thinking', { status: 409 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const res = await POST(request({ ...kidAsk, sessionId: '../../etc' }));
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.sessionId).toBeNull();
    expect(res.status).toBe(409);
  });

  it('maps a busy agent to 429 and an unreachable one to 502', async () => {
    globalThis.fetch = vi.fn(async () => new Response('busy', { status: 503 })) as unknown as typeof fetch;
    expect((await POST(request(kidAsk))).status).toBe(429);
    globalThis.fetch = vi.fn(async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    expect((await POST(request(kidAsk))).status).toBe(502);
  });
});

describe('playgroundUrl', () => {
  it('round-trips the code through the URL fragment the Playground reads', async () => {
    const code = 'letter = "M"; // on top\ncube(17);\n';
    const url = await playgroundUrl(code);
    expect(url.startsWith('https://ochafik.com/openscad2/#')).toBe(true);
    const state = JSON.parse(gunzipSync(Buffer.from(url.split('#')[1], 'base64')).toString());
    expect(state.params.sources[0].content).toBe(code);
    expect(state.params.activePath).toBe(state.params.sources[0].path);
    expect(state.view.layout.viewer).toBe(true);
  });
});
