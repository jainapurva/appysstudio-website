import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/orders';
import { sendOrderConfirmationToCustomer, sendNewOrderNotificationToOwner } from '@/lib/email';

export async function POST(req: NextRequest) {
  const squareToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!squareToken) {
    return NextResponse.json({ error: 'Square not configured' }, { status: 500 });
  }

  const { squareOrderId } = await req.json();
  if (!squareOrderId) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  // Idempotency: skip if already processed
  const db = getDB();
  if (db.orders.some((o: { squarePaymentId?: string }) => o.squarePaymentId === squareOrderId)) {
    return NextResponse.json({ success: true, duplicate: true });
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

    // Check if order has been paid (has tenders)
    if (!order.tenders || order.tenders.length === 0) {
      return NextResponse.json({ error: 'Order not yet paid' }, { status: 402 });
    }

    // Extract line items
    const items = (order.lineItems || []).map(item => ({
      productName: item.name || 'Product',
      quantity: Number(item.quantity) || 1,
      price: Number(item.basePriceMoney?.amount || 0) / 100,
    }));

    const totalAmount = Number(order.totalMoney?.amount || 0) / 100;

    // Extract customer info from fulfillment
    const shipment = order.fulfillments?.[0]?.shipmentDetails?.recipient;
    const customerName = shipment?.displayName || 'Customer';
    const customerEmail = shipment?.emailAddress || '';
    const shippingAddress = shipment?.address
      ? [
          shipment.address.addressLine1,
          shipment.address.locality,
          shipment.address.administrativeDistrictLevel1,
          shipment.address.country,
        ].filter(Boolean).join(', ')
      : undefined;

    const orderId = `ORD-${squareOrderId.slice(-8).toUpperCase()}`;

    db.orders.push({
      id: orderId,
      type: 'product',
      customerName,
      customerEmail,
      squarePaymentId: squareOrderId,
      items,
      amountTotal: totalAmount,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });
    saveDB(db);

    // Send confirmation emails
    await Promise.allSettled([
      sendOrderConfirmationToCustomer({ customerName, customerEmail, items, totalAmount, orderId }),
      sendNewOrderNotificationToOwner({ customerName, customerEmail, items, totalAmount, orderId, shippingAddress }),
    ]);

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error('Verify order error:', error);
    return NextResponse.json({ error: 'Failed to verify order' }, { status: 500 });
  }
}
