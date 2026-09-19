import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { rateLimit, clientIp } from '@/lib/keycaps/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_PATH = path.join(process.cwd(), 'data', 'workshop-designs.json');
const MAX_DESIGNS = 500;

export interface WorkshopDesign {
  id: string;
  name: string;
  kind: string;
  code: string;
  createdAt: string;
}

function readAll(): WorkshopDesign[] {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as WorkshopDesign[];
  } catch {
    return [];
  }
}

function writeAll(list: WorkshopDesign[]) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2));
}

// POST: a kid sends a finished design to the print station.
export async function POST(req: NextRequest) {
  const rl = rateLimit(`workshop-submit:${clientIp(req.headers)}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many sends. Wait a minute.' }, { status: 429 });

  let body: { name?: unknown; kind?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  const name = String(body.name ?? '').trim().slice(0, 40);
  const kind = String(body.kind ?? 'other').trim().slice(0, 20);
  const code = String(body.code ?? '');
  if (!name) return NextResponse.json({ error: 'Type your first name.' }, { status: 400 });
  if (!code.trim() || code.length > 20000) return NextResponse.json({ error: 'There is no design to send.' }, { status: 400 });

  const list = readAll();
  const design: WorkshopDesign = {
    id: crypto.randomUUID(), name, kind, code, createdAt: new Date().toISOString(),
  };
  list.push(design);
  writeAll(list.slice(-MAX_DESIGNS));
  return NextResponse.json({ ok: true, id: design.id });
}

// GET: the print station lists what came in (same password as /admin).
export async function GET(req: NextRequest) {
  const pwd = req.nextUrl.searchParams.get('pwd');
  if (pwd !== (process.env.ADMIN_PASSWORD || 'printcraft2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ designs: readAll().reverse() });
}
