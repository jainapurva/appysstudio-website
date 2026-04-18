import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addAiCreditsForOrder, getAiCreditInfo } from '@/lib/users';
import { SquareClient, SquareEnvironment } from 'square';
import { CREDIT_PACKS } from '../route';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { squareOrderId, packId } = await req.json();
  if (!squareOrderId || !packId) {
    return NextResponse.json({ error: 'Missing squareOrderId or packId' }, { status: 400 });
  }

  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
  }

  if (!process.env.SQUARE_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  const client = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  try {
    const orderRes = await client.orders.get({ orderId: squareOrderId });
    const order = orderRes.order;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const isPaid = order.tenders && order.tenders.length > 0;
    if (!isPaid) return NextResponse.json({ error: 'Payment not confirmed' }, { status: 402 });

    // Verify the order belongs to this user
    const orderEmail = order.metadata?.userEmail;
    if (orderEmail && orderEmail !== session.user!.email) {
      return NextResponse.json({ error: 'Order mismatch' }, { status: 403 });
    }

    const result = addAiCreditsForOrder(session.user!.email, pack.credits, squareOrderId);
    if (result === 'already_processed') {
      const info = getAiCreditInfo(session.user!.email);
      return NextResponse.json({ success: true, alreadyProcessed: true, totalCredits: info?.paidCredits ?? 0 });
    }
    if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, creditsAdded: pack.credits, totalCredits: result.aiCredits });
  } catch (err) {
    console.error('Credit verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
