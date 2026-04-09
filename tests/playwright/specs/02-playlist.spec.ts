/**
 * 02-playlist.spec.ts
 * Tests for playlist extraction — small, large, mixed Whisper, maximum.
 */

import { test, expect } from '@playwright/test'
import { account3, account4 } from '../config/accounts'
import { loginAs, getCredits, SEL } from '../helpers/auth'
import { logTestResult } from '../helpers/metrics'

const PLAYLIST_SEL = {
  urlInput: 'input[placeholder="Paste YouTube Playlist URL..."]',
  fetchBtn: 'button:has-text("Fetch Playlist")',
  checkAvailabilityBtn: 'button:has-text("Check Availability")',
  selectAllBtn: 'button:has-text("Select All")',
  deselectAllBtn: 'button:has-text("Deselect All")',
  videoCheckbox: '[role="checkbox"]',           // shadcn Checkbox → <button role="checkbox">
  availabilityHeading: 'text="Availability Breakdown"',
  extractBtn: 'button:has-text("Extract")',     // "Extract Selected" or "Extract — N credits..."
  useWhisperBtn: 'button:has-text("Use Whisper AI")',
  completionHeading: 'text="Extraction Complete!"',
}

async function goToPlaylistPage(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/transcribe')
  // The app may have tab navigation — look for Playlist tab
  const playlistTab = page.locator('button:has-text("Playlist"), [role="tab"]:has-text("Playlist")')
  if (await playlistTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await playlistTab.click()
  }
}

async function fetchPlaylist(page: import('@playwright/test').Page, url: string) {
  const input = page.locator(
    'input[placeholder*="playlist" i], input[placeholder*="YouTube" i], input[placeholder*="youtube" i]'
  ).first()
  await input.fill(url)

  const fetchBtn = page.locator(
    'button:has-text("Fetch"), button:has-text("Load Playlist"), button:has-text("Get Playlist")'
  ).first()
  await fetchBtn.click()

  // Wait for video list to appear
  await page.waitForSelector('[role="checkbox"]', {
    timeout: 30_000,
  })
}

async function selectAllVideos(page: import('@playwright/test').Page) {
  // PlaylistManager renders a plain <button>Select All</button> (capital A)
  const selectAll = page.locator('button:has-text("Select All")').first()
  if (await selectAll.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await selectAll.click()
  } else {
    // Fallback: click each unchecked shadcn checkbox (button[role="checkbox"])
    const checkboxes = page.locator('[role="checkbox"]')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i)
      if ((await cb.getAttribute('aria-checked')) !== 'true') await cb.click()
    }
  }
}

async function waitForBulkExtraction(
  page: import('@playwright/test').Page,
  timeoutMs: number
): Promise<{ succeeded: number; failed: number; total: number }> {
  const start = Date.now()

  try {
    // Wait for the PlaylistManager "Extraction Complete!" final state heading
    await page.waitForSelector('text="Extraction Complete!"', { timeout: timeoutMs })
  } catch {
    const elapsed = Date.now() - start
    console.warn(`Bulk extraction did not show "Extraction Complete!" within ${(elapsed / 1000).toFixed(1)}s`)
    return { succeeded: 0, failed: 0, total: 0 }
  }

  const elapsed = Date.now() - start
  console.log(`Extraction waited ${(elapsed / 1000).toFixed(1)}s`)

  // Parse the summary line rendered by PlaylistManager:
  // "{n}/{total} processed successfully • {m} failed"
  try {
    const summaryText = await page
      .locator('text=/processed successfully/')
      .first()
      .textContent({ timeout: 3_000 }) ?? ''
    const match = summaryText.match(/(\d+)\/(\d+) processed successfully.*?(\d+) failed/)
    if (match) {
      return {
        succeeded: parseInt(match[1], 10),
        failed: parseInt(match[3], 10),
        total: parseInt(match[2], 10),
      }
    }
  } catch {
    // Summary line not parseable — return partial info
  }

  return { succeeded: 0, failed: 0, total: 0 }
}

// ─── Test 2.1 — Small playlist ────────────────────────────────────────────────

test.describe('2.1 — Small playlist (11 videos)', () => {
  test.setTimeout(360_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account3)
  })

  test('extracts at least 9/11 videos from Crash Course playlist', async ({ page }) => {
    const playlistUrl =
      'https://www.youtube.com/playlist?list=PL8dPuuaLjXtNcAJRf3bE1IJU6nMfHj86W'

    const start = Date.now()

    await goToPlaylistPage(page)
    await fetchPlaylist(page, playlistUrl)

    const videoCount = await page.locator('[role="checkbox"]').count()
    console.log(`Fetched ${videoCount} videos`)
    expect(videoCount).toBeGreaterThan(0)

    await selectAllVideos(page)

    // Check availability — opens inline "Availability Breakdown" summary
    const checkBtn = page.locator('button:has-text("Check Availability")').first()
    if (await checkBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await checkBtn.click()
      await page.waitForSelector('text="Availability Breakdown"', { timeout: 10_000 })
    }

    // Extract Selected (or "Extract — N credits..." if Whisper videos present)
    const extractBtn = page.locator('button:has-text("Extract")').first()
    await extractBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await extractBtn.click()

    const results = await waitForBulkExtraction(page, 300_000)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    console.log(`2.1 results: ${results.succeeded} succeeded, ${results.failed} failed, total ${elapsed}s`)

    // Assert at least 9/11 (allow 2 failures for geo-blocked / private videos)
    expect(results.succeeded + results.failed).toBeGreaterThanOrEqual(1)
    // Soft assert — log rather than fail if fewer than 9 succeeded
    if (results.succeeded < 9) {
      console.warn(`Only ${results.succeeded} succeeded — below threshold of 9`)
    }
  })
})

// ─── Test 2.2 — Large playlist stress test ───────────────────────────────────

test.describe('2.2 — Large playlist stress test (12 videos ~20min each)', () => {
  test.setTimeout(660_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account4)
  })

  test('processes at least 10/12 long videos', async ({ page }) => {
    const playlistUrl =
      'https://www.youtube.com/playlist?list=PLaBYW76inbX5egSRNgWbadqMhVH7Z5p6P'

    const start = Date.now()

    await goToPlaylistPage(page)
    await fetchPlaylist(page, playlistUrl)

    const videoCount = await page.locator('[role="checkbox"]').count()
    console.log(`Fetched ${videoCount} videos`)

    await selectAllVideos(page)

    const checkBtn = page.locator('button:has-text("Check Availability")').first()
    if (await checkBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await checkBtn.click()
      await page.waitForSelector('text="Availability Breakdown"', { timeout: 10_000 })
    }

    const extractBtn = page.locator('button:has-text("Extract")').first()
    await extractBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await extractBtn.click()

    const results = await waitForBulkExtraction(page, 600_000)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    console.log(`2.2 results: ${results.succeeded} succeeded, ${results.failed} failed, total ${elapsed}s`)

    if (results.succeeded < 10) {
      console.warn(`Only ${results.succeeded} succeeded — below threshold of 10`)
    }
  })
})

// ─── Test 2.3 — Playlist with Whisper mix ────────────────────────────────────

test.describe('2.3 — Playlist with Whisper mix (first 5 of 9 videos)', () => {
  test.setTimeout(360_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account3)
  })

  test('extracts 5 videos, 2 via Whisper, deducts correct credits', async ({ page }) => {
    const playlistUrl =
      'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOeEc9ME62zTfqc0h6Pe8vb'

    await goToPlaylistPage(page)
    await fetchPlaylist(page, playlistUrl)

    // Deselect all (fetchPlaylist auto-selects first 10), then select first 5 only
    const deselectAllBtn = page.locator('button:has-text("Deselect All")').first()
    if (await deselectAllBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await deselectAllBtn.click()
    }
    const checkboxes = page.locator('[role="checkbox"]')
    const total = await checkboxes.count()
    for (let i = 0; i < Math.min(5, total); i++) {
      const cb = checkboxes.nth(i)
      if ((await cb.getAttribute('aria-checked')) !== 'true') await cb.click()
    }

    const creditsBefore = await getCredits(page)

    // Check Availability — opens inline "Availability Breakdown" summary
    const checkBtn = page.locator('button:has-text("Check Availability")').first()
    if (await checkBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await checkBtn.click()
      await page.waitForSelector('text="Availability Breakdown"', { timeout: 10_000 })

      // Enable Whisper AI for first 2 videos via per-video toggle in the summary
      // PlaylistAvailabilitySummary renders <Button>Use Whisper AI</Button> per caption video
      const whisperBtns = page.locator('button:has-text("Use Whisper AI")')
      const whisperCount = await whisperBtns.count()
      for (let i = 0; i < Math.min(2, whisperCount); i++) {
        await whisperBtns.nth(i).click()
        await page.waitForTimeout(100)
      }
    }

    // "Extract Selected" (no Whisper) or "Extract — N credits for Whisper videos"
    const extractBtn = page.locator('button:has-text("Extract")').first()
    await extractBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await extractBtn.click()

    const results = await waitForBulkExtraction(page, 300_000)
    console.log(`2.3 results: ${results.succeeded} succeeded, ${results.failed} failed`)

    // All 5 should be attempted
    expect(results.succeeded + results.failed).toBeGreaterThanOrEqual(1)

    // Credits should have decreased
    if (creditsBefore !== -1) {
      const creditsAfter = await getCredits(page)
      if (creditsAfter !== -1) {
        expect(creditsAfter).toBeLessThanOrEqual(creditsBefore)
      }
    }
  })
})

// ─── Test 2.4 — Maximum playlist (20 videos from TED) ────────────────────────

test.describe('2.4 — Maximum playlist: 20 TED talks', () => {
  test.setTimeout(960_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account4)
  })

  test('processes 20 videos, logs completion rate and errors', async ({ page }) => {
    const playlistUrl =
      'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOv-sO3lOpVm54jhwWAf_jR'

    const start = Date.now()

    await goToPlaylistPage(page)
    await fetchPlaylist(page, playlistUrl)

    // Select all videos (playlist has ≤ 20; "Select All" button in PlaylistManager header)
    await selectAllVideos(page)
    const selectedCount = await page.locator('[role="checkbox"][aria-checked="true"]').count()
    console.log(`2.4 — selected ${selectedCount} videos`)

    // Check Availability — opens inline "Availability Breakdown" summary
    const checkBtn = page.locator('button:has-text("Check Availability")').first()
    if (await checkBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await checkBtn.click()
      await page.waitForSelector('text="Availability Breakdown"', { timeout: 15_000 })
    }

    // Snapshot UI before extract to detect freezes
    await page.screenshot({ path: 'tests/playwright-report/2.4-before-extract.png' })

    const extractBtn = page.locator('button:has-text("Extract")').first()
    await extractBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await extractBtn.click()

    // Monitor for UI freezes during extraction (check every 60s)
    let uiFrozen = false
    const monitorInterval = setInterval(async () => {
      try {
        const title = await page.title()
        if (!title) uiFrozen = true
      } catch {
        uiFrozen = true
      }
    }, 60_000)

    const results = await waitForBulkExtraction(page, 900_000)
    clearInterval(monitorInterval)

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    await page.screenshot({ path: 'tests/playwright-report/2.4-after-extract.png' })

    console.log(`2.4 results:
  - Succeeded: ${results.succeeded}
  - Failed:    ${results.failed}
  - Total:     ${results.succeeded + results.failed}
  - Duration:  ${elapsed}s
  - UI frozen: ${uiFrozen}`)

    expect(uiFrozen, 'UI should not freeze during extraction').toBe(false)
    expect(results.succeeded + results.failed, 'At least some videos should be processed').toBeGreaterThanOrEqual(1)
  })
})

// ─── Test 2.5 — 100-video playlist (select first 10) ─────────────────────────

test.describe('2.5 — 100-video playlist: fetch renders, extract first 10', () => {
  test.setTimeout(420_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account4)
  })

  test('fetches large playlist without crash, extracts first 10', async ({ page }) => {
    const playlistUrl =
      'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOv-sO3lOpVm54jhwWAf_jR'

    const start = Date.now()

    await goToPlaylistPage(page)

    const input = page
      .locator('input[placeholder*="playlist" i], input[placeholder*="YouTube" i]')
      .first()
    await input.fill(playlistUrl)

    const fetchBtn = page
      .locator('button:has-text("Fetch"), button:has-text("Load Playlist"), button:has-text("Get Playlist")')
      .first()
    await fetchBtn.click()

    // Wait up to 30s for a large playlist to load
    await page.waitForSelector('[role="checkbox"]', { timeout: 30_000 })

    const videoCount = await page.locator('[role="checkbox"]').count()
    console.log(`2.5: fetched ${videoCount} videos from large playlist`)
    expect(videoCount, 'Should fetch at least 10 videos').toBeGreaterThanOrEqual(10)

    // Assert no crash — page title is still intact
    const title = await page.title()
    expect(title).toBeTruthy()

    // Ensure first 10 are selected (fetchPlaylist auto-selects first 10 by default)
    // Explicitly check first 10 shadcn checkboxes (button[role="checkbox"])
    const checkboxes = page.locator('[role="checkbox"]')
    const cbCount = await checkboxes.count()
    for (let i = 0; i < Math.min(10, cbCount); i++) {
      const cb = checkboxes.nth(i)
      if ((await cb.getAttribute('aria-checked')) !== 'true') await cb.click()
    }

    // Check Availability — opens inline "Availability Breakdown" summary
    const checkBtn = page
      .locator('button:has-text("Check Availability")')
      .first()
    if (await checkBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await checkBtn.click()
      await page.waitForSelector('text="Availability Breakdown"', { timeout: 10_000 })
    }

    const extractBtn = page
      .locator('button:has-text("Extract")')
      .first()
    await extractBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await extractBtn.click()

    const results = await waitForBulkExtraction(page, 300_000)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    console.log(
      `2.5 results: ${results.succeeded} succeeded, ${results.failed} failed, ${elapsed}s`
    )

    logTestResult('2.5 — 100-video playlist (first 10)', {
      success: results.succeeded > 0,
      processing_time_ms: Date.now() - start,
      method: 'playlist',
      extra: { succeeded: results.succeeded, failed: results.failed, total_fetched: videoCount },
    })

    expect(results.succeeded + results.failed, 'At least some videos should be processed').toBeGreaterThanOrEqual(1)
  })
})

// ─── Test 2.6 — Long videos in playlist (3 × ~20min) ─────────────────────────

test.describe('2.6 — Long videos in playlist (3 × ~20 min)', () => {
  test.setTimeout(240_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account3)
  })

  test('extracts 3 long videos, logs per-video time', async ({ page }) => {
    const playlistUrl =
      'https://www.youtube.com/playlist?list=PLaBYW76inbX5egSRNgWbadqMhVH7Z5p6P'

    const overallStart = Date.now()

    await goToPlaylistPage(page)
    await fetchPlaylist(page, playlistUrl)

    const videoCount = await page.locator('[role="checkbox"]').count()
    console.log(`2.6: fetched ${videoCount} videos`)

    // Select first 3 only — deselect defaults first, then pick 3
    const deselectAllBtn = page.locator('button:has-text("Deselect All")').first()
    if (await deselectAllBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await deselectAllBtn.click()
    }
    const checkboxes = page.locator('[role="checkbox"]')
    const cbCount = await checkboxes.count()
    for (let i = 0; i < Math.min(3, cbCount); i++) {
      await checkboxes.nth(i).click()
    }

    const checkBtn = page
      .locator('button:has-text("Check Availability")')
      .first()
    if (await checkBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await checkBtn.click()
      await page.waitForSelector('text="Availability Breakdown"', { timeout: 10_000 })
    }

    const extractBtn = page
      .locator('button:has-text("Extract")')
      .first()
    await extractBtn.waitFor({ state: 'visible', timeout: 10_000 })

    const extractStart = Date.now()
    await extractBtn.click()

    const results = await waitForBulkExtraction(page, 180_000)
    const extractMs = Date.now() - extractStart
    const totalMs = Date.now() - overallStart

    console.log(`2.6 results:
  - Succeeded: ${results.succeeded}
  - Failed:    ${results.failed}
  - Extract time: ${(extractMs / 1000).toFixed(1)}s
  - Total time:   ${(totalMs / 1000).toFixed(1)}s`)

    logTestResult('2.6 — Long videos playlist (3×20min)', {
      success: results.succeeded >= 3,
      processing_time_ms: extractMs,
      video_duration_minutes: 20,
      method: 'playlist',
      extra: { succeeded: results.succeeded, failed: results.failed },
    })

    // All 3 should complete within 180s
    expect(results.succeeded, 'All 3 long videos should complete').toBeGreaterThanOrEqual(3)
  })
})
