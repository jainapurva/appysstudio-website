import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
    next: vi.fn(() => ({ type: 'next' })),
  },
}));

import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { middleware, config } from '@/middleware';

function createMockRequest(url: string) {
  return { url, headers: new Headers() } as unknown as Parameters<typeof middleware>[0];
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to sign-in when no token', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    await middleware(createMockRequest('http://localhost:3000/account'));

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL;
    expect(redirectUrl.pathname).toBe('/auth/signin');
    expect(redirectUrl.searchParams.get('callbackUrl')).toBe('http://localhost:3000/account');
  });

  it('allows access when token exists', async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: '1', name: 'Test', email: 'test@test.com' });

    await middleware(createMockRequest('http://localhost:3000/account'));

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('matcher targets /account routes', () => {
    expect(config.matcher).toContain('/account/:path*');
  });
});
