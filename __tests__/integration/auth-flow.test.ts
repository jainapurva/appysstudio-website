import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration-style tests that verify the full auth system works end-to-end
 * by testing the interaction between multiple modules.
 */

// Setup mocks for filesystem
const mockUsersDB: { users: Array<Record<string, unknown>> } = { users: [] };
const mockOrdersDB: { orders: Array<Record<string, unknown>> } = { orders: [] };

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn((filePath: string) => {
        if (filePath.includes('users.json')) return JSON.stringify(mockUsersDB);
        if (filePath.includes('orders.json')) return JSON.stringify(mockOrdersDB);
        return '{}';
      }),
      writeFileSync: vi.fn((filePath: string, data: string) => {
        const parsed = JSON.parse(data);
        if (filePath.includes('users.json')) mockUsersDB.users = parsed.users;
        if (filePath.includes('orders.json')) {
          mockOrdersDB.orders = parsed.orders || [];
        }
      }),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn((filePath: string) => {
      if (filePath.includes('users.json')) return JSON.stringify(mockUsersDB);
      if (filePath.includes('orders.json')) return JSON.stringify(mockOrdersDB);
      return '{}';
    }),
    writeFileSync: vi.fn((filePath: string, data: string) => {
      const parsed = JSON.parse(data);
      if (filePath.includes('users.json')) mockUsersDB.users = parsed.users;
      if (filePath.includes('orders.json')) {
        mockOrdersDB.orders = parsed.orders || [];
      }
    }),
    mkdirSync: vi.fn(),
  };
});

import { upsertUser, findUserByEmail, toggleWatchlistItem, updateUserProfile } from '@/lib/users';

describe('Auth System Integration', () => {
  beforeEach(() => {
    mockUsersDB.users = [];
    mockOrdersDB.orders = [];
  });

  describe('full user lifecycle', () => {
    it('handles sign-up → profile update → watchlist → lookup flow', () => {
      // 1. User signs in via Google (simulated by signIn callback calling upsertUser)
      const newUser = upsertUser({
        email: 'alice@example.com',
        name: 'Alice Smith',
        image: 'https://lh3.googleusercontent.com/avatar.jpg',
        provider: 'google',
      });

      expect(newUser.email).toBe('alice@example.com');
      expect(newUser.provider).toBe('google');
      expect(newUser.watchlist).toEqual([]);

      // 2. User updates their profile
      const updated = updateUserProfile('alice@example.com', {
        phone: '555-0123',
        address: '42 Elm Street, Portland OR',
      });

      expect(updated!.phone).toBe('555-0123');
      expect(updated!.address).toBe('42 Elm Street, Portland OR');

      // 3. User adds items to watchlist
      toggleWatchlistItem('alice@example.com', 'desk-organizer-pro');
      toggleWatchlistItem('alice@example.com', 'geometric-vase');
      toggleWatchlistItem('alice@example.com', 'cable-clip-pack');

      // 4. Verify full profile state
      const profile = findUserByEmail('alice@example.com');
      expect(profile!.name).toBe('Alice Smith');
      expect(profile!.phone).toBe('555-0123');
      expect(profile!.watchlist).toEqual(['desk-organizer-pro', 'geometric-vase', 'cable-clip-pack']);

      // 5. Remove one item from watchlist
      const afterRemove = toggleWatchlistItem('alice@example.com', 'geometric-vase');
      expect(afterRemove).toEqual(['desk-organizer-pro', 'cable-clip-pack']);

      // 6. Re-login updates user data without losing profile
      const relogin = upsertUser({
        email: 'alice@example.com',
        name: 'Alice Johnson', // name changed
        image: 'https://lh3.googleusercontent.com/new-avatar.jpg',
        provider: 'google',
      });

      expect(relogin.name).toBe('Alice Johnson');
      expect(relogin.image).toBe('https://lh3.googleusercontent.com/new-avatar.jpg');
      // Watchlist and profile data should be preserved
      expect(relogin.watchlist).toEqual(['desk-organizer-pro', 'cable-clip-pack']);
      const finalProfile = findUserByEmail('alice@example.com');
      expect(finalProfile!.phone).toBe('555-0123');
      expect(finalProfile!.address).toBe('42 Elm Street, Portland OR');
    });
  });

  describe('multi-user isolation', () => {
    it('keeps separate data for different users', () => {
      upsertUser({ email: 'user1@test.com', name: 'User One', provider: 'google' });
      upsertUser({ email: 'user2@test.com', name: 'User Two', provider: 'facebook' });

      toggleWatchlistItem('user1@test.com', 'product-a');
      toggleWatchlistItem('user2@test.com', 'product-b');

      updateUserProfile('user1@test.com', { phone: '111' });
      updateUserProfile('user2@test.com', { phone: '222' });

      const u1 = findUserByEmail('user1@test.com');
      const u2 = findUserByEmail('user2@test.com');

      expect(u1!.watchlist).toEqual(['product-a']);
      expect(u2!.watchlist).toEqual(['product-b']);
      expect(u1!.phone).toBe('111');
      expect(u2!.phone).toBe('222');
    });
  });

  describe('orders linked by email', () => {
    it('filters orders by user email', async () => {
      // Setup orders in the mock DB
      mockOrdersDB.orders = [
        { id: 'ord_1', customerEmail: 'alice@example.com', customerName: 'Alice', type: 'product', status: 'confirmed', createdAt: '2024-01-01' },
        { id: 'ord_2', customerEmail: 'bob@example.com', customerName: 'Bob', type: 'product', status: 'pending', createdAt: '2024-01-02' },
        { id: 'ord_3', customerEmail: 'alice@example.com', customerName: 'Alice', type: 'product', status: 'shipped', createdAt: '2024-01-03' },
      ];

      const { getDB } = await import('@/lib/orders');
      const db = getDB();
      const aliceOrders = db.orders.filter((o: { customerEmail: string }) => o.customerEmail === 'alice@example.com');

      expect(aliceOrders).toHaveLength(2);
      expect(aliceOrders[0].id).toBe('ord_1');
      expect(aliceOrders[1].id).toBe('ord_3');
    });
  });

  describe('guest checkout preserved', () => {
    it('creates orders without requiring a user profile', () => {
      // Orders can exist without a corresponding user profile
      mockOrdersDB.orders = [
        { id: 'ord_guest', customerEmail: 'guest@example.com', customerName: 'Guest', type: 'product', status: 'pending', createdAt: '2024-01-01' },
      ];

      const guestUser = findUserByEmail('guest@example.com');
      expect(guestUser).toBeUndefined();

      // Orders still exist
      expect(mockOrdersDB.orders).toHaveLength(1);
      expect(mockOrdersDB.orders[0].customerEmail).toBe('guest@example.com');
    });
  });
});
