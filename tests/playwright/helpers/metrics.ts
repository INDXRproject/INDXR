import * as fs from 'fs'
import * as path from 'path'

export interface MetricEntry {
  timestamp: string
  test_name: string
  success: boolean
  processing_time_ms: number
  video_duration_minutes?: number
  word_count?: number
  credits_used?: number
  error_type?: string
  video_id?: string
  method?: 'whisper' | 'auto-captions' | 'playlist' | 'unknown'
  extra?: Record<string, unknown>
}

const RESULTS_DIR = path.resolve(__dirname, '../../results')

function getMetricsFilePath(): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return path.join(RESULTS_DIR, `metrics_${date}.json`)
}

/**
 * Append a single metric entry to today's metrics file.
 * Thread-safe via JSON array append pattern.
 */
export function logTestResult(testName: string, data: Omit<MetricEntry, 'timestamp' | 'test_name'>): void {
  const entry: MetricEntry = {
    timestamp: new Date().toISOString(),
    test_name: testName,
    ...data,
  }

  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true })
    const filePath = getMetricsFilePath()

    let existing: MetricEntry[] = []
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      } catch {
        existing = []
      }
    }

    existing.push(entry)
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write metrics:', err)
  }
}

/**
 * Estimate word count from page body text, excluding nav/UI chrome.
 */
export function estimateWordCount(bodyText: string): number {
  // Strip HTML-ish noise and count words
  return bodyText.trim().split(/\s+/).filter((w) => w.length > 1).length
}

/**
 * Log to the per-video processing_times.json (backwards-compat with test spec).
 */
export function logProcessingTime(entry: {
  video_id: string
  duration_minutes: number
  processing_time_ms: number
  word_count: number
  method: string
}): void {
  const filePath = path.join(RESULTS_DIR, 'processing_times.json')

  let existing: typeof entry[] = []
  try {
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch {
    existing = []
  }

  existing.push({ ...entry })
  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify(existing, null, 2),
      'utf-8'
    )
  } catch (err) {
    console.error('Failed to write processing times:', err)
  }
}
