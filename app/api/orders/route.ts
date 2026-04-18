import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/orders';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDB();
    const order = {
      id: `ORD-${Date.now()}`,
      type: 'product',
      customerName: body.name,
      customerEmail: body.email,
      customerPhone: body.phone,
      shippingAddress: body.address,
      shippingCity: body.city,
      items: body.items,
      totalAmount: body.totalAmount,
      status: 'pending',
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };
    db.orders.push(order);
    saveDB(db);
    return NextResponse.json({ success: true, orderId: order.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}

export async function GET() {
  const db = getDB();
  return NextResponse.json(db.orders);
}
