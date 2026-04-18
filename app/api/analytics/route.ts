import { NextRequest, NextResponse } from 'next/server';
import { trackEvent, getAnalyticsSummary, EventType } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    trackEvent({
      type: body.type as EventType,
      data: body.data || {},
      ip: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const pwd = req.nextUrl.searchParams.get('pwd');
  if (pwd !== (process.env.ADMIN_PASSWORD || 'printcraft2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(getAnalyticsSummary());
}
