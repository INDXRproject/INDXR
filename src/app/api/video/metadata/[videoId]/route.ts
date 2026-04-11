import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params

  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/video/metadata/${videoId}`,
      { signal: AbortSignal.timeout(15000) }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Metadata fetch failed' }, { status: 500 })
  }
}
