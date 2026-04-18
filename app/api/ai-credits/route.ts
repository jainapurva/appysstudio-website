import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAiCreditInfo } from '@/lib/users';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';

export const CREDIT_PACKS = [
  { id: 'starter',  label: 'Starter',  credits: 5,  price: 1.99, popular: false },
  { id: 'popular',  label: 'Popular',  credits: 15, price: 4.99, popular: true  },
  { id: 'pro',      label: 'Pro',      credits: 40, price: 9.99, popular: false },
] as const;

export type PackId = typeof CREDIT_PACKS[number]['id'];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://appysstudio.com';

// GET — return current credit balance
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const info = getAiCreditInfo(session.user.email);
  return NextResponse.json(info ?? { freeRemaining: 0, paidCredits: 0, totalRemaining: 0 });
}

// POST — create Square payment link for a credit pack
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { packId } = await req.json();
  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
  }

  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  const client = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  const idempotencyKey = randomUUID();
  const result = await client.checkout.paymentLinks.create({
    idempotencyKey,
    order: {
      locationId: process.env.SQUARE_LOCATION_ID,
      lineItems: [{
        name: `AI 3D Generator — ${pack.label} Pack (${pack.credits} generations)`,
        quantity: '1',
        basePriceMoney: { amount: BigInt(Math.round(pack.price * 100)), currency: 'USD' },
      }],
      metadata: {
        type: 'ai-credits',
        packId: pack.id,
        credits: String(pack.credits),
        userEmail: session.user.email,
      },
    },
    checkoutOptions: {
      redirectUrl: `${BASE_URL}/3d-generator?credits_purchased=1&pack=${pack.id}`,
      merchantSupportEmail: process.env.GMAIL_USER || '',
    },
    prePopulatedData: {
      buyerEmail: session.user.email,
    },
  });

  const url = result.paymentLink?.url;
  const squareOrderId = result.paymentLink?.orderId;

  if (!url || !squareOrderId) {
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }

  return NextResponse.json({ url, squareOrderId, pack });
}
