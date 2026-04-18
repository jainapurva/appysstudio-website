import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAiCreditInfo, deductAiCredit } from '@/lib/users';

const MESHY_API = 'https://api.meshy.ai';

export async function POST(req: NextRequest) {
  // Require authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Please sign in to use the AI 3D Generator.', code: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MESHY_API_KEY not configured' }, { status: 503 });
  }

  // Check credits before calling Meshy
  const creditInfo = getAiCreditInfo(session.user.email);
  if (!creditInfo || creditInfo.totalRemaining === 0) {
    return NextResponse.json({ error: 'No credits remaining. Purchase a pack to continue.', code: 'NO_CREDITS' }, { status: 402 });
  }

  try {
    const body = await req.json();
    const { mode, prompt, imageUrl } = body;

    let endpoint: string;
    let payload: Record<string, unknown>;

    if (mode === 'image') {
      endpoint = `${MESHY_API}/openapi/v1/image-to-3d`;
      payload = { image_url: imageUrl, enable_pbr: true };
    } else {
      endpoint = `${MESHY_API}/openapi/v2/text-to-3d`;
      payload = { mode: 'preview', prompt, art_style: 'realistic', should_remesh: true };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Meshy error:', err);
      return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
    }

    const data = await res.json();

    // Deduct credit only after successful Meshy task creation
    deductAiCredit(session.user.email);

    const updatedCredits = getAiCreditInfo(session.user.email);
    return NextResponse.json({ taskId: data.result, mode, creditsRemaining: updatedCredits?.totalRemaining ?? 0 });
  } catch (err) {
    console.error('3D generate error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
