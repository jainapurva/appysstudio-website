// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { gunzipSync } from 'zlib';
import { resetRateLimits } from '@/lib/keycaps/ratelimit';
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

import { POST } from '@/app/api/workshop/design/route';

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

  it('is off when no API key is configured', async () => {
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
