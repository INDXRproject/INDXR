/**
 * Returns the next polling interval in ms based on how long a job has been running.
 * Reduces request volume by 5–10x for long jobs while keeping responsiveness early.
 *
 * 0–30s:   1 000ms (fast feedback on quick jobs)
 * 30–300s: 5 000ms
 * 300s+:  15 000ms
 */
export function getPollingInterval(elapsedSeconds: number): number {
  if (elapsedSeconds < 30) return 1_000
  if (elapsedSeconds < 300) return 5_000
  return 15_000
}
