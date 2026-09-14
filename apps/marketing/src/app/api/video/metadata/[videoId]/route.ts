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
      // Forward the backend's body (incl. codes like `video_not_found`) so the client can gate on it —
      // e.g. reject an unavailable video BEFORE reserving credits (TAAK 2). A generic error would hide it.
      const body = await response.json().catch(() => ({ error: 'Failed to fetch metadata' }))
      return NextResponse.json(body, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'api/video/metadata', video_id: videoId } });
    await Sentry.flush(2000);
    return NextResponse.json({ error: 'Metadata fetch failed' }, { status: 500 })
  }
}
