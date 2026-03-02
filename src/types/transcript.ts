// Unified transcript metadata interface
export interface TranscriptMetadata {
  source: 'youtube' | 'audio' | 'playlist'
  
  // Common fields
  title: string
  duration: number
  
  // Credits tracking
  creditsUsed?: number
  processingMethod?: 'youtube_captions' | 'whisper_ai'
  
  // Source-specific (optional)
  videoId?: string
  videoUrl?: string
  filename?: string
  thumbnailUrl?: string
}
