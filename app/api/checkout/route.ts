import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const squareToken = process.env.SQUARE_ACCESS_TOKEN;

  if (!squareToken) {
    // Payments not yet configured — save order manually
    const { items, customerEmail, customerName } = await req.json();
    const { getDB, saveDB } = await import('@/lib/orders');
    const db = getDB();
    const orderId = `ORD-${Date.now()}`;
    db.orders.push({
      id: orderId,
      type: 'product',
      customerName,
      customerEmail,
      items,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
      note: 'Payment pending — Square not yet configured',
    });
    saveDB(db);
    return NextResponse.json({ url: null, orderId, paymentPending: true });
  }

  try {
    const { SquareClient, SquareEnvironment } = await import('square');
    const crypto = await import('crypto');

    const client = new SquareClient({
      token: squareToken,
      environment:
        process.env.SQUARE_ENVIRONMENT === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });

    const { items, customerEmail, customerName, couponCode, shippingCost, shippingLabel, shippingAddress } = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const lineItems = items.map((item: { productName: string; price: number; quantity: number }) => ({
      name: item.productName,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(Math.round(item.price * 100)),
        currency: 'USD',
      },
    }));

    // Add shipping as a line item if provided
    if (shippingCost && shippingCost > 0) {
      lineItems.push({
        name: shippingLabel || 'Shipping',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(Math.round(shippingCost * 100)),
          currency: 'USD',
        },
      });
    }

    // Apply coupon discount if valid and not expired
    const validCoupons: Record<string, { name: string; percentage: string; expiresAt: string }> = {
      'TESTFREE': { name: 'Test Discount', percentage: '100', expiresAt: '2026-03-01T23:59:59Z' },
      'FRIENDS50': { name: '50% Off - Friends & Family', percentage: '50', expiresAt: '2026-03-01T23:59:59Z' },
    };
    const couponEntry = couponCode ? validCoupons[couponCode.toUpperCase()] : undefined;
    const coupon = couponEntry && new Date() < new Date(couponEntry.expiresAt) ? couponEntry : undefined;

    const orderDiscounts = coupon
      ? [{
          name: coupon.name,
          percentage: coupon.percentage,
          scope: 'ORDER' as const,
        }]
      : undefined;

    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems,
        discounts: orderDiscounts,
      },
      checkoutOptions: {
        askForShippingAddress: true,
        redirectUrl: `${baseUrl}/order-success`,
      },
      prePopulatedData: {
        buyerEmail: customerEmail,
        ...(shippingAddress && {
          buyerAddress: {
            addressLine1: shippingAddress.address,
            locality: shippingAddress.city,
            administrativeDistrictLevel1: shippingAddress.state,
            postalCode: shippingAddress.zip,
            country: 'US',
          },
        }),
      },
      paymentNote: `Order for ${customerName}`,
    });

    return NextResponse.json({
      url: response.paymentLink?.url,
      orderId: response.paymentLink?.orderId,
    });
  } catch (error) {
    console.error('Square checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
