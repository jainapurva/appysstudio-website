import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserByEmail, updateUserProfile } from '@/lib/users';
import { getDB } from '@/lib/orders';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = findUserByEmail(session.user.email);
  const db = getDB();
  const orders = (db.orders || []).filter(
    (o: { customerEmail: string }) => o.customerEmail === session.user!.email
  );

  return NextResponse.json({ user: user || null, orders });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const updated = updateUserProfile(session.user.email, {
    name: body.name,
    phone: body.phone,
    address: body.address,
  });

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
