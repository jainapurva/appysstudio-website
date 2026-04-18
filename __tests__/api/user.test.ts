import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-auth
const mockSession = {
  user: { name: 'Test User', email: 'test@example.com', image: 'avatar.jpg' },
  expires: '2099-01-01',
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/users', () => ({
  findUserByEmail: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('@/lib/orders', () => ({
  getDB: vi.fn(() => ({ orders: [] })),
}));

import { getServerSession } from 'next-auth';
import { findUserByEmail, updateUserProfile } from '@/lib/users';
import { getDB } from '@/lib/orders';
import { GET, PATCH } from '@/app/api/user/route';

describe('GET /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns user profile and orders when authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(findUserByEmail).mockReturnValue({
      id: 'user_1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google',
      watchlist: ['desk-organizer-pro'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });
    vi.mocked(getDB).mockReturnValue({
      orders: [
        { id: 'ord_1', customerEmail: 'test@example.com', customerName: 'Test', type: 'product', status: 'pending', createdAt: '2024-01-01' },
        { id: 'ord_2', customerEmail: 'other@example.com', customerName: 'Other', type: 'product', status: 'pending', createdAt: '2024-01-01' },
      ],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.watchlist).toEqual(['desk-organizer-pro']);
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].id).toBe('ord_1');
  });

  it('returns null user when profile not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(findUserByEmail).mockReturnValue(undefined);
    vi.mocked(getDB).mockReturnValue({ orders: [] });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toBeNull();
    expect(data.orders).toEqual([]);
  });
});

describe('PATCH /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/user', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PATCH(req);
    expect(response.status).toBe(401);
  });

  it('updates user profile', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(updateUserProfile).mockReturnValue({
      id: 'user_1',
      email: 'test@example.com',
      name: 'Updated Name',
      phone: '555-1234',
      address: '123 Main St',
      provider: 'google',
      watchlist: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    });

    const req = new Request('http://localhost/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name', phone: '555-1234', address: '123 Main St' }),
    });

    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.name).toBe('Updated Name');
    expect(data.user.phone).toBe('555-1234');
    expect(updateUserProfile).toHaveBeenCalledWith('test@example.com', {
      name: 'Updated Name',
      phone: '555-1234',
      address: '123 Main St',
    });
  });

  it('returns 404 when user profile not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(updateUserProfile).mockReturnValue(null);

    const req = new Request('http://localhost/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    });

    const response = await PATCH(req);
    expect(response.status).toBe(404);
  });
});
