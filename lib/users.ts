import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'users.json');

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  image?: string;
  provider: string;
  phone?: string;
  address?: string;
  watchlist: string[]; // product IDs
  freeGenerationsUsed: number; // 0-2 lifetime free AI generations
  aiCredits: number;           // paid credits remaining
  createdAt: string;
  updatedAt: string;
}

function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }));
}

function getDB(): { users: UserProfile[] } {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data: { users: UserProfile[] }) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function findUserByEmail(email: string): UserProfile | undefined {
  const db = getDB();
  return db.users.find(u => u.email === email);
}

export function upsertUser(data: { email: string; name: string; image?: string; provider: string }): UserProfile {
  const db = getDB();
  const existing = db.users.find(u => u.email === data.email);

  if (existing) {
    existing.name = data.name || existing.name;
    existing.image = data.image || existing.image;
    // Migrate old users missing credit fields
    if (existing.freeGenerationsUsed === undefined) existing.freeGenerationsUsed = 0;
    if (existing.aiCredits === undefined) existing.aiCredits = 0;
    existing.updatedAt = new Date().toISOString();
    saveDB(db);
    return existing;
  }

  const user: UserProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: data.email,
    name: data.name,
    image: data.image,
    provider: data.provider,
    watchlist: [],
    freeGenerationsUsed: 0,
    aiCredits: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDB(db);
  return user;
}

export function updateUserProfile(email: string, updates: { phone?: string; address?: string; name?: string }): UserProfile | null {
  const db = getDB();
  const user = db.users.find(u => u.email === email);
  if (!user) return null;

  if (updates.phone !== undefined) user.phone = updates.phone;
  if (updates.address !== undefined) user.address = updates.address;
  if (updates.name !== undefined) user.name = updates.name;
  user.updatedAt = new Date().toISOString();
  saveDB(db);
  return user;
}

export function toggleWatchlistItem(email: string, productId: string): string[] {
  const db = getDB();
  const user = db.users.find(u => u.email === email);
  if (!user) return [];

  const idx = user.watchlist.indexOf(productId);
  if (idx === -1) {
    user.watchlist.push(productId);
  } else {
    user.watchlist.splice(idx, 1);
  }
  user.updatedAt = new Date().toISOString();
  saveDB(db);
  return user.watchlist;
}

/** Returns free + paid credit info for a user */
export function getAiCreditInfo(email: string): { freeRemaining: number; paidCredits: number; totalRemaining: number } | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  const freeRemaining = Math.max(0, 2 - (user.freeGenerationsUsed ?? 0));
  const paidCredits = user.aiCredits ?? 0;
  return { freeRemaining, paidCredits, totalRemaining: freeRemaining + paidCredits };
}

/**
 * Deducts one AI generation credit. Returns 'free' | 'paid' | 'none'
 * 'free' = used a free generation, 'paid' = used paid credit, 'none' = no credits
 */
export function deductAiCredit(email: string): 'free' | 'paid' | 'none' {
  const db = getDB();
  const user = db.users.find(u => u.email === email);
  if (!user) return 'none';

  if ((user.freeGenerationsUsed ?? 0) < 2) {
    user.freeGenerationsUsed = (user.freeGenerationsUsed ?? 0) + 1;
    user.updatedAt = new Date().toISOString();
    saveDB(db);
    return 'free';
  }

  if ((user.aiCredits ?? 0) > 0) {
    user.aiCredits = (user.aiCredits ?? 0) - 1;
    user.updatedAt = new Date().toISOString();
    saveDB(db);
    return 'paid';
  }

  return 'none';
}

/** Add paid credits to user after successful purchase. Returns null if already processed (idempotent). */
export function addAiCreditsForOrder(email: string, amount: number, squareOrderId: string): UserProfile | 'already_processed' | null {
  const db = getDB();
  const user = db.users.find(u => u.email === email) as UserProfile & { processedCreditOrders?: string[] } | undefined;
  if (!user) return null;

  // Idempotency check
  if (!user.processedCreditOrders) user.processedCreditOrders = [];
  if (user.processedCreditOrders.includes(squareOrderId)) return 'already_processed';

  user.aiCredits = (user.aiCredits ?? 0) + amount;
  user.processedCreditOrders.push(squareOrderId);
  user.updatedAt = new Date().toISOString();
  saveDB(db);
  return user;
}
