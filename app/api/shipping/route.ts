import { NextRequest, NextResponse } from 'next/server';
import { calculateShipping } from '@/lib/shipping';

export async function POST(req: NextRequest) {
  try {
    const { zipCode, items } = await req.json();
    if (!zipCode || !items) {
      return NextResponse.json({ error: 'Missing zipCode or items' }, { status: 400 });
    }
    const rate = calculateShipping(zipCode, items);
    if (!rate) {
      return NextResponse.json({ error: 'Invalid zip code' }, { status: 400 });
    }
    return NextResponse.json(rate);
  } catch {
    return NextResponse.json({ error: 'Failed to calculate shipping' }, { status: 500 });
  }
}
