import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface VideoAvailability {
  videoId: string
  title: string
  duration: number
  thumbnail: string
  status: 'has_captions' | 'needs_whisper' | 'unavailable'
  estimatedCredits: number
  reason?: string
  errorType?: 'deleted' | 'private' | 'geo_blocked' | 'member_only' | 'restricted' | 'unknown'
}

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Block suspended users
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('suspended')
        .eq('id', user.id)
        .single()
      if (profile?.suspended) {
        return NextResponse.json(
          { error: 'Account suspended. Contact support@indxr.ai' },
          { status: 403 }
        )
      }
    }

    const { videos } = await request.json()

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: videos array required' },
        { status: 400 }
      )
    }

    const results: VideoAvailability[] = []
    const CONCURRENCY_LIMIT = 5
    
    // Process videos in chunks
    for (let i = 0; i < videos.length; i += CONCURRENCY_LIMIT) {
      const chunk = videos.slice(i, i + CONCURRENCY_LIMIT)
      
      const chunkPromises = chunk.map(async (video) => {
        const videoId = video.id
        try {
          // Try to extract captions (this checks availability and caption status)
          const response = await fetch(`${PYTHON_BACKEND_URL}/api/extract/youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoIdOrUrl: videoId }),
          })

          const data = await response.json()

          if (response.ok && data.success && data.transcript && data.transcript.length > 0) {
            // Has captions - free extraction
            const duration = data.duration || estimateDurationFromTranscript(data.transcript) || video.duration || 0
            return {
              videoId,
              title: data.title || video.title || 'Unknown Title',
              duration,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              status: 'has_captions' as const,
              estimatedCredits: 0
            }
          } else if (data.error && (data.error.includes('No captions') || data.error.includes('captions'))) {
            // No captions - needs Whisper
            // Use provided metadata to estimate credits instantly
            const duration = video.duration || 0
            const durationMinutes = Math.ceil(duration / 60)
            const credits = Math.max(1, Math.ceil(durationMinutes / 8))
            
            return {
              videoId,
              title: video.title,
              duration: duration,
              thumbnail: video.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              status: 'needs_whisper' as const,
              estimatedCredits: credits
            }
          } else {
            // Video unavailable - categorize error
            return {
              videoId,
              title: video.title || 'Unavailable Video',
              duration: video.duration || 0,
              thumbnail: video.thumbnail || '',
              status: 'unavailable' as const,
              estimatedCredits: 0,
              reason: data.error || 'Video unavailable',
              errorType: categorizeError(data.error || 'unknown')
            }
          }
        } catch (error) {
          // Network or parsing error
          console.error(`Error checking video ${videoId}:`, error)
          return {
            videoId,
            title: video.title || 'Error Checking Video',
            duration: video.duration || 0,
            thumbnail: video.thumbnail || '',
            status: 'unavailable' as const,
            estimatedCredits: 0,
            reason: error instanceof Error ? error.message : 'Unknown error',
            errorType: 'unknown' as const
          }
        }
      })
      
      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)
    }

    // Calculate totals
    const summary = {
      total: results.length,
      hasCaptions: results.filter(r => r.status === 'has_captions').length,
      needsWhisper: results.filter(r => r.status === 'needs_whisper').length,
      unavailable: results.filter(r => r.status === 'unavailable').length,
      totalCredits: results.reduce((sum, r) => sum + r.estimatedCredits, 0)
    }

    return NextResponse.json({
      success: true,
      results,
      summary
    })

  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json(
      { error: 'Failed to check playlist availability' },
      { status: 500 }
    )
  }
}

// Helper to get video metadata from YouTube API
async function getVideoMetadata(videoId: string): Promise<{ title: string; duration: number; thumbnail: string } | null> {
  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/video/metadata/${videoId}`)
    if (!response.ok) return null
    
    const data = await response.json()
    return {
      title: data.title || 'Unknown Title',
      duration: data.duration || 0,
      thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    }
  } catch (error) {
    console.error(`Failed to get metadata for ${videoId}:`, error)
    return null
  }
}

// Helper to estimate duration from transcript
function estimateDurationFromTranscript(transcript: any[]): number {
  if (!transcript || transcript.length === 0) return 0
  const lastItem = transcript[transcript.length - 1]
  return Math.ceil((lastItem.offset || 0) + (lastItem.duration || 0))
}

function categorizeError(errorMessage: string): VideoAvailability['errorType'] {
  const msg = errorMessage.toLowerCase()
  
  if (msg.includes('deleted') || msg.includes('removed')) return 'deleted'
  if (msg.includes('private')) return 'private'
  if (msg.includes('geo') || msg.includes('region') || msg.includes('country')) return 'geo_blocked'
  if (msg.includes('member') || msg.includes('membership')) return 'member_only'
  if (msg.includes('restricted') || msg.includes('age')) return 'restricted'
  
  return 'unknown'
}
