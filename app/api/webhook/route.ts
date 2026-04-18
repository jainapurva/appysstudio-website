import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/orders';
import { sendOrderConfirmationToCustomer, sendNewOrderNotificationToOwner } from '@/lib/email';

export async function POST(req: NextRequest) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) {
    console.error('SQUARE_WEBHOOK_SIGNATURE_KEY is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('x-square-hmacsha256-signature') || '';

  // Verify webhook signature
  const { WebhooksHelper } = await import('square');
  const notificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook`;

  const isValid = await WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader: signature,
    signatureKey,
    notificationUrl,
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.type === 'payment.updated') {
    const payment = event.data?.object?.payment;
    if (!payment || payment.status !== 'COMPLETED') {
      return NextResponse.json({ received: true });
    }

    const squarePaymentId = payment.id;
    const squareOrderId = payment.order_id;
    const totalAmount = Number(payment.amount_money?.amount || 0) / 100;
    const customerEmail = payment.buyer_email_address || '';

    // Retrieve order details from Square to get line items
    let items: Array<{ productName: string; quantity: number; price: number }> = [];
    let customerName = 'Customer';

    if (squareOrderId) {
      try {
        const { SquareClient, SquareEnvironment } = await import('square');
        const client = new SquareClient({
          token: process.env.SQUARE_ACCESS_TOKEN!,
          environment:
            process.env.SQUARE_ENVIRONMENT === 'production'
              ? SquareEnvironment.Production
              : SquareEnvironment.Sandbox,
        });

        const orderResponse = await client.orders.get({
          orderId: squareOrderId,
        });

        const order = orderResponse.order;
        if (order?.lineItems) {
          items = order.lineItems.map(item => ({
            productName: item.name || 'Product',
            quantity: Number(item.quantity) || 1,
            price: Number(item.basePriceMoney?.amount || 0) / 100,
          }));
        }

        // Extract customer name from payment note
        if (payment.note) {
          const nameMatch = payment.note.match(/^Order for (.+)$/);
          if (nameMatch) customerName = nameMatch[1];
        }
      } catch (error) {
        console.error('Failed to retrieve Square order details:', error);
      }
    }

    const orderId = `ORD-${squarePaymentId.slice(-8).toUpperCase()}`;

    // Idempotency: skip if this payment was already processed
    const db = getDB();
    if (db.orders.some((o: { squarePaymentId?: string }) => o.squarePaymentId === squarePaymentId)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    db.orders.push({
      id: orderId,
      type: 'product',
      customerName,
      customerEmail,
      squarePaymentId,
      items,
      amountTotal: totalAmount,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });
    saveDB(db);

    // Build shipping address if available
    const shippingAddress = payment.shipping_address
      ? [
          payment.shipping_address.address_line_1,
          payment.shipping_address.locality,
          payment.shipping_address.administrative_district_level_1,
          payment.shipping_address.country,
        ].filter(Boolean).join(', ')
      : undefined;

    await Promise.allSettled([
      sendOrderConfirmationToCustomer({ customerName, customerEmail, items, totalAmount, orderId }),
      sendNewOrderNotificationToOwner({ customerName, customerEmail, items, totalAmount, orderId, shippingAddress }),
    ]);
  }

  return NextResponse.json({ received: true });
}
