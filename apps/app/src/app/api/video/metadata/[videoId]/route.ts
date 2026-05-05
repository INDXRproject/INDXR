import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params

  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/video/metadata/${videoId}`,
      { signal: AbortSignal.timeout(15000), headers: { 'X-Backend-Secret': process.env.BACKEND_API_SECRET || '' } }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'api/video/metadata', video_id: videoId } });
    await Sentry.flush(2000);
    return NextResponse.json({ error: 'Metadata fetch failed' }, { status: 500 })
  }
}
