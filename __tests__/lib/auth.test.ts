import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock users module
vi.mock('@/lib/users', () => ({
  upsertUser: vi.fn(() => ({
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'google',
    watchlist: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
}));

// Mock providers
vi.mock('next-auth/providers/google', () => ({
  default: vi.fn((opts: { clientId: string; clientSecret: string }) => ({ id: 'google', name: 'Google', ...opts })),
}));
vi.mock('next-auth/providers/facebook', () => ({
  default: vi.fn((opts: { clientId: string; clientSecret: string }) => ({ id: 'facebook', name: 'Facebook', ...opts })),
}));
vi.mock('next-auth/providers/apple', () => ({
  default: vi.fn((opts: { clientId: string; clientSecret: string }) => ({ id: 'apple', name: 'Apple', ...opts })),
}));

import { upsertUser } from '@/lib/users';

describe('lib/auth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(upsertUser).mockClear();
  });

  describe('provider configuration', () => {
    it('includes Google provider when env vars are set', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-id';
      process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
      delete process.env.FACEBOOK_CLIENT_ID;
      delete process.env.APPLE_CLIENT_ID;

      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.providers.length).toBeGreaterThanOrEqual(1);
    });

    it('uses JWT session strategy', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('points sign-in page to /auth/signin', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.pages?.signIn).toBe('/auth/signin');
    });
  });

  describe('signIn callback', () => {
    it('calls upsertUser with correct data', async () => {
      const { authOptions } = await import('@/lib/auth');
      const signInCallback = authOptions.callbacks!.signIn!;

      const result = await signInCallback({
        user: { id: '1', email: 'test@example.com', name: 'Test User', image: 'https://img.jpg' },
        account: { provider: 'google', type: 'oauth', providerAccountId: '123' },
        profile: undefined,
        credentials: undefined,
      } as Parameters<typeof signInCallback>[0]);

      expect(result).toBe(true);
      expect(upsertUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://img.jpg',
        provider: 'google',
      });
    });

    it('returns true even without email', async () => {
      const { authOptions } = await import('@/lib/auth');
      const signInCallback = authOptions.callbacks!.signIn!;

      const result = await signInCallback({
        user: { id: '1', email: null, name: 'No Email' },
        account: { provider: 'google', type: 'oauth', providerAccountId: '123' },
        profile: undefined,
        credentials: undefined,
      } as unknown as Parameters<typeof signInCallback>[0]);

      expect(result).toBe(true);
      expect(upsertUser).not.toHaveBeenCalled();
    });
  });

  describe('jwt callback', () => {
    it('sets token fields from user on initial sign-in', async () => {
      const { authOptions } = await import('@/lib/auth');
      const jwtCallback = authOptions.callbacks!.jwt!;

      const result = await jwtCallback({
        token: { sub: '1' },
        user: { id: '1', name: 'Test', email: 'test@test.com', image: 'avatar.jpg' },
      } as Parameters<typeof jwtCallback>[0]);

      expect(result.name).toBe('Test');
      expect(result.email).toBe('test@test.com');
      expect(result.picture).toBe('avatar.jpg');
    });

    it('returns token unchanged on subsequent calls', async () => {
      const { authOptions } = await import('@/lib/auth');
      const jwtCallback = authOptions.callbacks!.jwt!;

      const result = await jwtCallback({
        token: { sub: '1', name: 'Existing', email: 'existing@test.com' },
      } as Parameters<typeof jwtCallback>[0]);

      expect(result.name).toBe('Existing');
      expect(result.email).toBe('existing@test.com');
    });
  });

  describe('session callback', () => {
    it('populates session.user from token', async () => {
      const { authOptions } = await import('@/lib/auth');
      const sessionCallback = authOptions.callbacks!.session!;

      const result = await sessionCallback({
        session: { user: { name: '', email: '', image: '' }, expires: '' },
        token: { sub: '1', name: 'Token User', email: 'token@test.com', picture: 'pic.jpg' },
      } as Parameters<typeof sessionCallback>[0]);

      expect(result.user?.name).toBe('Token User');
      expect(result.user?.email).toBe('token@test.com');
      expect(result.user?.image).toBe('pic.jpg');
    });
  });
});
