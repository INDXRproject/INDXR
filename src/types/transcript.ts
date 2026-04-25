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
  collectionId?: string
  channel?: string | null
  language?: string | null

  // Duplicate handling
  duplicateId?: string
  duplicateAction?: 'replace' | 'reset'
  // Internal flag: true when reconciling a placeholder record (always writes all fields back)
  isPlaceholder?: boolean
}
