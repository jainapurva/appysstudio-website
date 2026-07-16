import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/orders';
import type { WorkshopRegistration } from '@/lib/orders';
import {
  sendWorkshopConfirmationToCustomer,
  sendWorkshopRegistrationToOwner,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  const squareToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!squareToken) {
    return NextResponse.json({ error: 'Square not configured' }, { status: 500 });
  }

  const { squareOrderId } = await req.json();
  if (!squareOrderId) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  const db = getDB();
  const registration = (db.registrations as WorkshopRegistration[]).find(
    r => r.squarePaymentId === squareOrderId,
  );

  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  // Idempotency: the success page can mount more than once (refresh, back button).
  if (registration.status === 'confirmed') {
    return NextResponse.json({
      success: true,
      duplicate: true,
      registrationId: registration.id,
      seats: registration.seats,
      customerName: registration.customerName,
    });
  }

  try {
    const { SquareClient, SquareEnvironment } = await import('square');
    const client = new SquareClient({
      token: squareToken,
      environment:
        process.env.SQUARE_ENVIRONMENT === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });

    const orderResponse = await client.orders.get({ orderId: squareOrderId });
    const order = orderResponse.order;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!order.tenders || order.tenders.length === 0) {
      return NextResponse.json({ error: 'Order not yet paid' }, { status: 402 });
    }

    registration.status = 'confirmed';
    registration.amountPaid = Number(order.totalMoney?.amount || 0) / 100 || registration.amountPaid;
    saveDB(db);

    await Promise.allSettled([
      sendWorkshopConfirmationToCustomer(registration),
      sendWorkshopRegistrationToOwner(registration),
    ]);

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      seats: registration.seats,
      customerName: registration.customerName,
    });
  } catch (error) {
    console.error('Workshop verify error:', error);
    return NextResponse.json({ error: 'Failed to verify registration' }, { status: 500 });
  }
}
