// 1 min of AI processing per 10 min of audio
const TRANSCRIPTION_RATIO = 0.1

export type WhisperJobStatus = 'pending' | 'downloading' | 'transcribing' | 'saving'

export interface EtaResult {
  etaSeconds: number | null
  label: string
}

/**
 * Returns estimated seconds remaining given audio duration and elapsed time.
 * Returns null if duration is unknown or job hasn't started transcribing yet.
 */
export function calcEta(
  audioDurationSeconds: number | null,
  elapsedSeconds: number,
  status: WhisperJobStatus,
): EtaResult {
  if (!audioDurationSeconds || status === 'pending' || status === 'downloading') {
    return { etaSeconds: null, label: '' }
  }

  const totalEstimatedSeconds = Math.max(audioDurationSeconds * TRANSCRIPTION_RATIO, 30)
  const remaining = Math.max(0, Math.round(totalEstimatedSeconds - elapsedSeconds))

  if (remaining <= 0) {
    return { etaSeconds: 0, label: 'Almost done...' }
  }

  if (remaining < 60) {
    return { etaSeconds: remaining, label: `~${remaining}s remaining` }
  }

  const mins = Math.ceil(remaining / 60)
  return { etaSeconds: remaining, label: `~${mins} min remaining` }
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
