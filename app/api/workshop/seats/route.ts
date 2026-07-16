import { NextResponse } from 'next/server';
import { seatsRemaining } from '@/lib/workshop-registrations';
import { WORKSHOP } from '@/lib/workshop';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    remaining: seatsRemaining(),
    capacity: WORKSHOP.capacity,
  });
}
