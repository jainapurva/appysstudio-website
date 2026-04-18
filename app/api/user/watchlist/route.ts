import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toggleWatchlistItem, findUserByEmail } from '@/lib/users';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await req.json();
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  const watchlist = toggleWatchlistItem(session.user.email, productId);
  return NextResponse.json({ watchlist });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = findUserByEmail(session.user.email);
  return NextResponse.json({ watchlist: user?.watchlist || [] });
}
