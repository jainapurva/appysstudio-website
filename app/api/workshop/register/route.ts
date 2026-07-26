import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/orders';
import { seatsRemaining } from '@/lib/workshop-registrations';
import { WORKSHOP } from '@/lib/workshop';
import { sendWorkshopRegistrationPendingToOwner } from '@/lib/email';

interface RegisterBody {
  name: string;
  email: string;
  phone?: string;
  seats: number;
  attendeeNames?: string;
  experience?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  let body: RegisterBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const seats = Number(body.seats);

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!Number.isInteger(seats) || seats < 1 || seats > WORKSHOP.capacity) {
    return NextResponse.json({ error: 'Please choose a valid number of seats.' }, { status: 400 });
  }

  const remaining = seatsRemaining();
  if (remaining <= 0) {
    return NextResponse.json({ error: 'This workshop is fully booked.', soldOut: true }, { status: 409 });
  }
  if (seats > remaining) {
    return NextResponse.json(
      { error: `Only ${remaining} seat${remaining === 1 ? '' : 's'} left — please lower the number of seats.`, remaining },
      { status: 409 },
    );
  }

  const registrationId = `WS-${Date.now()}`;
  const amountPaid = seats * WORKSHOP.pricePerSeat;

  const registration = {
    id: registrationId,
    workshopId: WORKSHOP.id,
    customerName: name,
    customerEmail: email,
    customerPhone: (body.phone || '').trim() || undefined,
    seats,
    attendeeNames: (body.attendeeNames || '').trim() || undefined,
    experience: (body.experience || '').trim() || undefined,
    notes: (body.notes || '').trim() || undefined,
    amountPaid,
    status: 'pending_payment' as const,
    createdAt: new Date().toISOString(),
    squarePaymentId: undefined as string | undefined,
  };

  const squareToken = process.env.SQUARE_ACCESS_TOKEN;

  // Square not configured (local dev): record the registration and let the
  // customer know we'll follow up for payment, rather than hard-failing.
  if (!squareToken) {
    const db = getDB();
    db.registrations.push(registration);
    saveDB(db);
    await sendWorkshopRegistrationPendingToOwner(registration).catch(() => {});
    return NextResponse.json({ url: null, registrationId, paymentPending: true });
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: [
          {
            name: `${WORKSHOP.title} — ${WORKSHOP.date}`,
            quantity: String(seats),
            note: `${WORKSHOP.startTime}–${WORKSHOP.endTime} · ${WORKSHOP.venue.city}, ${WORKSHOP.venue.state}`,
            basePriceMoney: {
              amount: BigInt(Math.round(WORKSHOP.pricePerSeat * 100)),
              currency: 'USD',
            },
          },
        ],
      },
      checkoutOptions: {
        // A workshop seat isn't shipped anywhere — don't ask for an address.
        askForShippingAddress: false,
        redirectUrl: `${baseUrl}/workshop/success`,
      },
      prePopulatedData: {
        // Deliberately no buyerPhoneNumber: Square hard-rejects the whole
        // checkout (INVALID_PHONE_NUMBER) on anything its validator dislikes.
        // Phone is an optional convenience field and must never block a sale —
        // we keep the raw value on the registration for our own follow-up.
        buyerEmail: email,
      },
      paymentNote: `Workshop registration — ${name} (${seats} seat${seats === 1 ? '' : 's'})`,
    });

    const squareOrderId = response.paymentLink?.orderId;
    registration.squarePaymentId = squareOrderId;

    const db = getDB();
    db.registrations.push(registration);
    saveDB(db);

    return NextResponse.json({
      url: response.paymentLink?.url,
      registrationId,
      squareOrderId,
    });
  } catch (error) {
    console.error('Workshop registration error:', error);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }
}
