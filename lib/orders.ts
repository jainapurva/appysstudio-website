import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'orders.json');

export interface Order {
  id: string;
  type: 'product' | 'custom';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items?: Array<{ productId: string; productName: string; quantity: number; price: number; color?: string }>;
  totalAmount?: number;
  squarePaymentId?: string;
  status: 'pending' | 'confirmed' | 'printing' | 'shipped' | 'delivered';
  createdAt: string;
  notes?: string;
}

export interface QuoteRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fileName: string;
  material: string;
  color: string;
  quantity: number;
  notes: string;
  status: 'pending' | 'quoted' | 'accepted' | 'rejected';
  createdAt: string;
}

function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ orders: [], quotes: [] }));
}

export function getDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

export function saveDB(data: unknown) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
