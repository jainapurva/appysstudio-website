import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = {
  user: { name: 'Test User', email: 'test@example.com' },
  expires: '2099-01-01',
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/users', () => ({
  toggleWatchlistItem: vi.fn(),
  findUserByEmail: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { toggleWatchlistItem, findUserByEmail } from '@/lib/users';
import { POST, GET } from '@/app/api/user/watchlist/route';

describe('POST /api/user/watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/user/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'test' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 400 when productId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    const req = new Request('http://localhost/api/user/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('productId required');
  });

  it('toggles watchlist item and returns updated list', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(toggleWatchlistItem).mockReturnValue(['desk-organizer-pro', 'cable-clip-pack']);

    const req = new Request('http://localhost/api/user/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'cable-clip-pack' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.watchlist).toEqual(['desk-organizer-pro', 'cable-clip-pack']);
    expect(toggleWatchlistItem).toHaveBeenCalledWith('test@example.com', 'cable-clip-pack');
  });
});

describe('GET /api/user/watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns watchlist for authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(findUserByEmail).mockReturnValue({
      id: 'user_1',
      email: 'test@example.com',
      name: 'Test',
      provider: 'google',
      watchlist: ['desk-organizer-pro', 'geometric-vase'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.watchlist).toEqual(['desk-organizer-pro', 'geometric-vase']);
  });

  it('returns empty watchlist when user not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(findUserByEmail).mockReturnValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.watchlist).toEqual([]);
  });
});
