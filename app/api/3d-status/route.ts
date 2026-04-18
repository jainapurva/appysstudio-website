import { NextRequest, NextResponse } from 'next/server';

const MESHY_API = 'https://api.meshy.ai';

export async function GET(req: NextRequest) {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MESHY_API_KEY not configured' }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const taskId = searchParams.get('taskId');
  const mode = searchParams.get('mode') || 'text';

  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }

  const endpoint = mode === 'image'
    ? `${MESHY_API}/openapi/v1/image-to-3d/${taskId}`
    : `${MESHY_API}/openapi/v2/text-to-3d/${taskId}`;

  const res = await fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }

  const data = await res.json();
  // data.status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED'
  // data.model_urls.glb — the downloadable 3D model
  // data.thumbnail_url — preview image
  // data.progress — 0-100

  // Proxy the GLB through our server to avoid CORS issues with Meshy's CDN
  const rawGlbUrl = data.model_urls?.glb ?? null;
  const proxiedGlbUrl = rawGlbUrl
    ? `/api/3d-proxy?url=${encodeURIComponent(rawGlbUrl)}`
    : null;

  return NextResponse.json({
    status: data.status,
    progress: data.progress ?? 0,
    glbUrl: proxiedGlbUrl,
    thumbnailUrl: data.thumbnail_url ?? null,
  });
}
