/**
 * 04-stress.spec.ts
 * Concurrent and rapid-sequential extraction stress tests.
 * These run with workers > 1 (parallel within this file).
 */

import { test, expect } from '@playwright/test'
import { chromium } from '@playwright/test'
import { account1, account2, account3, account4 } from '../config/accounts'
import { loginAs, SEL } from '../helpers/auth'

// Stress tests use parallel workers
test.describe.configure({ mode: 'parallel' })

const SHORT_VIDEOS = [
  'https://youtu.be/jNQXAC9IVRw',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://youtu.be/QH2-TGUlwu4', // Nyan Cat 3.5min
  'https://youtu.be/kJQP7kiw5Fk', // Despacito
  'https://youtu.be/OPf0YbXqDm0', // Mark Ronson - Uptown Funk
  'https://youtu.be/9bZkp7q19f0', // Gangnam Style
  'https://youtu.be/2vjPBrBU-TM', // Shakira
  'https://youtu.be/CevxZvSJLk8', // Katy Perry
  'https://youtu.be/nfWlot6h_JM', // Taylor Swift Shake It Off
  'https://youtu.be/e-ORhEE9VVg', // PSY Gentleman
]

async function extractSingleVideo(
  page: import('@playwright/test').Page,
  url: string,
  timeoutMs = 60_000
): Promise<{ success: boolean; durationMs: number }> {
  const start = Date.now()

  await page.goto('/dashboard/transcribe')
  await page.locator(SEL.urlInput).fill(url)
  await page.locator(SEL.extractBtn).click()

  const success = await Promise.race([
    page
      .waitForSelector('[data-sonner-toast]', { timeout: timeoutMs })
      .then(async (el) => {
        const text = await el.textContent() ?? ''
        return text.toLowerCase().includes('transcript')
      })
      .catch(() => false),
    page
      .waitForSelector('text=/transcript extracted/i', { timeout: timeoutMs })
      .then(() => true)
      .catch(() => false),
  ])

  return { success, durationMs: Date.now() - start }
}

// ─── Test 4.1 — Concurrent extractions (all 4 accounts simultaneously) ────────

test('4.1 — Concurrent: 4 accounts extract simultaneously', async () => {
  test.setTimeout(180_000)

  const browser = chromium

  // Launch 4 separate browser contexts (one per account)
  const contexts = await Promise.all([
    (await (await browser.launch()).newContext()),
    (await (await browser.launch()).newContext()),
    (await (await browser.launch()).newContext()),
    (await (await browser.launch()).newContext()),
  ])

  const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()))

  // Login all accounts in parallel
  await Promise.all([
    loginAs(pages[0], account1),
    loginAs(pages[1], account2),
    loginAs(pages[2], account3),
    loginAs(pages[3], account4),
  ])

  // Run extractions concurrently
  const results = await Promise.all([
    extractSingleVideo(pages[0], 'https://youtu.be/jNQXAC9IVRw', 90_000),  // account1
    extractSingleVideo(pages[1], 'https://youtu.be/dQw4w9WgXcQ', 90_000),  // account2
    extractSingleVideo(pages[2], 'https://youtu.be/QH2-TGUlwu4', 90_000),  // account3
    extractSingleVideo(pages[3], 'https://youtu.be/OPf0YbXqDm0', 90_000),  // account4
  ])

  // Cleanup
  await Promise.all(contexts.map((ctx) => ctx.close()))

  results.forEach((r, i) => {
    console.log(`Account ${i + 1}: success=${r.success}, duration=${(r.durationMs / 1000).toFixed(1)}s`)
  })

  const successCount = results.filter((r) => r.success).length
  console.log(`4.1 concurrent results: ${successCount}/4 succeeded`)

  // At least 3/4 should succeed (allow 1 failure for rate limiting)
  expect(successCount, 'At least 3/4 concurrent extractions should succeed').toBeGreaterThanOrEqual(3)
})

// ─── Test 4.2 — Rapid sequential extractions (account4) ──────────────────────

test('4.2 — Rapid sequential: 10 videos with 2s delay', async ({ page }) => {
  test.setTimeout(720_000)

  await loginAs(page, account4)

  const results: { url: string; success: boolean; durationMs: number }[] = []

  for (let i = 0; i < SHORT_VIDEOS.length; i++) {
    const url = SHORT_VIDEOS[i]
    console.log(`Sequential ${i + 1}/10: ${url}`)

    const result = await extractSingleVideo(page, url, 90_000)
    results.push({ url, ...result })

    console.log(`  → success=${result.success}, duration=${(result.durationMs / 1000).toFixed(1)}s`)

    // 2s delay between extractions
    if (i < SHORT_VIDEOS.length - 1) {
      await page.waitForTimeout(2_000)
    }
  }

  // Report processing time trend
  const durations = results.map((r) => r.durationMs)
  const avgFirst3 = durations.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  const avgLast3 = durations.slice(-3).reduce((a, b) => a + b, 0) / 3

  console.log(`
4.2 Sequential stress results:
  Total: ${results.length}
  Succeeded: ${results.filter((r) => r.success).length}
  Failed: ${results.filter((r) => !r.success).length}
  Avg duration (first 3): ${(avgFirst3 / 1000).toFixed(1)}s
  Avg duration (last 3): ${(avgLast3 / 1000).toFixed(1)}s
  Slowdown factor: ${(avgLast3 / avgFirst3).toFixed(2)}x
  Per-video results:
${results.map((r, i) => `    ${i + 1}. ${r.success ? '✓' : '✗'} ${(r.durationMs / 1000).toFixed(1)}s`).join('\n')}
  `)

  const successCount = results.filter((r) => r.success).length
  const hadCrash = results.some((r) => r.durationMs > 90_000)

  // Assert: no crashes (no result hit the 90s timeout)
  expect(hadCrash, 'No extractions should timeout completely').toBe(false)

  // Assert: at least 7/10 succeed
  expect(successCount, 'At least 7/10 rapid sequential extractions should succeed').toBeGreaterThanOrEqual(7)

  // Warn if slowing down significantly (>2x)
  if (avgLast3 / avgFirst3 > 2) {
    console.warn(`⚠ Significant slowdown detected: ${(avgLast3 / avgFirst3).toFixed(2)}x`)
  }
})
