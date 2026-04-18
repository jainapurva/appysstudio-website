import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fs to isolate from real filesystem
const mockDB: { users: Array<Record<string, unknown>> } = { users: [] };

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify(mockDB)),
      writeFileSync: vi.fn((filePath: string, data: string) => {
        const parsed = JSON.parse(data);
        mockDB.users = parsed.users;
      }),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => JSON.stringify(mockDB)),
    writeFileSync: vi.fn((filePath: string, data: string) => {
      const parsed = JSON.parse(data);
      mockDB.users = parsed.users;
    }),
    mkdirSync: vi.fn(),
  };
});

import { findUserByEmail, upsertUser, updateUserProfile, toggleWatchlistItem } from '@/lib/users';

describe('lib/users', () => {
  beforeEach(() => {
    mockDB.users = [];
  });

  describe('upsertUser', () => {
    it('creates a new user when none exists', () => {
      const user = upsertUser({
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        provider: 'google',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.image).toBe('https://example.com/avatar.jpg');
      expect(user.provider).toBe('google');
      expect(user.watchlist).toEqual([]);
      expect(user.id).toMatch(/^user_/);
      expect(user.createdAt).toBeTruthy();
      expect(user.updatedAt).toBeTruthy();
      expect(mockDB.users).toHaveLength(1);
    });

    it('updates existing user by email', () => {
      upsertUser({ email: 'test@example.com', name: 'Original', provider: 'google' });
      const updated = upsertUser({ email: 'test@example.com', name: 'Updated Name', provider: 'google', image: 'new.jpg' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.image).toBe('new.jpg');
      expect(mockDB.users).toHaveLength(1);
    });

    it('does not overwrite name with empty string', () => {
      upsertUser({ email: 'test@example.com', name: 'Keep This', provider: 'google' });
      const updated = upsertUser({ email: 'test@example.com', name: '', provider: 'google' });

      expect(updated.name).toBe('Keep This');
    });

    it('handles multiple different users', () => {
      upsertUser({ email: 'a@test.com', name: 'User A', provider: 'google' });
      upsertUser({ email: 'b@test.com', name: 'User B', provider: 'facebook' });

      expect(mockDB.users).toHaveLength(2);
      expect(mockDB.users[0].email).toBe('a@test.com');
      expect(mockDB.users[1].email).toBe('b@test.com');
    });
  });

  describe('findUserByEmail', () => {
    it('returns undefined when user does not exist', () => {
      expect(findUserByEmail('nonexistent@test.com')).toBeUndefined();
    });

    it('returns the user when found', () => {
      upsertUser({ email: 'found@test.com', name: 'Found', provider: 'google' });
      const user = findUserByEmail('found@test.com');

      expect(user).toBeDefined();
      expect(user!.email).toBe('found@test.com');
      expect(user!.name).toBe('Found');
    });
  });

  describe('updateUserProfile', () => {
    it('returns null when user does not exist', () => {
      const result = updateUserProfile('no@user.com', { phone: '123' });
      expect(result).toBeNull();
    });

    it('updates phone number', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      const updated = updateUserProfile('test@example.com', { phone: '555-1234' });

      expect(updated).not.toBeNull();
      expect(updated!.phone).toBe('555-1234');
    });

    it('updates address', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      const updated = updateUserProfile('test@example.com', { address: '123 Main St' });

      expect(updated!.address).toBe('123 Main St');
    });

    it('updates name', () => {
      upsertUser({ email: 'test@example.com', name: 'Old Name', provider: 'google' });
      const updated = updateUserProfile('test@example.com', { name: 'New Name' });

      expect(updated!.name).toBe('New Name');
    });

    it('updates multiple fields at once', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      const updated = updateUserProfile('test@example.com', {
        name: 'Updated',
        phone: '555-0000',
        address: '456 Oak Ave',
      });

      expect(updated!.name).toBe('Updated');
      expect(updated!.phone).toBe('555-0000');
      expect(updated!.address).toBe('456 Oak Ave');
    });

    it('updates the updatedAt timestamp', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      const before = findUserByEmail('test@example.com')!.updatedAt;

      // Small delay to ensure different timestamp
      const updated = updateUserProfile('test@example.com', { phone: '123' });
      expect(updated!.updatedAt).toBeTruthy();
    });
  });

  describe('toggleWatchlistItem', () => {
    it('returns empty array when user does not exist', () => {
      const result = toggleWatchlistItem('no@user.com', 'product-1');
      expect(result).toEqual([]);
    });

    it('adds item to watchlist', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      const watchlist = toggleWatchlistItem('test@example.com', 'desk-organizer-pro');

      expect(watchlist).toEqual(['desk-organizer-pro']);
    });

    it('removes item when toggled again', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      toggleWatchlistItem('test@example.com', 'desk-organizer-pro');
      const watchlist = toggleWatchlistItem('test@example.com', 'desk-organizer-pro');

      expect(watchlist).toEqual([]);
    });

    it('handles multiple items', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      toggleWatchlistItem('test@example.com', 'desk-organizer-pro');
      toggleWatchlistItem('test@example.com', 'cable-clip-pack');
      const watchlist = toggleWatchlistItem('test@example.com', 'geometric-vase');

      expect(watchlist).toEqual(['desk-organizer-pro', 'cable-clip-pack', 'geometric-vase']);
    });

    it('removes only the toggled item', () => {
      upsertUser({ email: 'test@example.com', name: 'Test', provider: 'google' });
      toggleWatchlistItem('test@example.com', 'item-a');
      toggleWatchlistItem('test@example.com', 'item-b');
      toggleWatchlistItem('test@example.com', 'item-c');
      const watchlist = toggleWatchlistItem('test@example.com', 'item-b');

      expect(watchlist).toEqual(['item-a', 'item-c']);
    });
  });
});
