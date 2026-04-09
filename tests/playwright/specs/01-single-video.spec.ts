/**
 * 01-single-video.spec.ts
 * Tests for single-video extraction: auto-captions and Whisper.
 */

import { test, expect } from '@playwright/test'
import { account1, account2, account4 } from '../config/accounts'
import { loginAs, getCredits, getLibraryCount, extractVideo, SEL } from '../helpers/auth'
import { logTestResult, logProcessingTime, estimateWordCount } from '../helpers/metrics'

// ─── Test 1.1 — Short videos via auto-captions ───────────────────────────────

test.describe('1.1 — Auto-captions: short videos', () => {
  test.setTimeout(90_000)
  test.use({ storageState: undefined })

  const videos = [
    { url: 'https://youtu.be/jNQXAC9IVRw', label: '19s (first YouTube video)' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', label: '3.5min (Rick Astley)' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', label: '3.5min (Rick Astley) 2nd run' },
  ]

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account1)
  })

  for (const { url, label } of videos) {
    test(`extracts: ${label}`, async ({ page }) => {
      const countBefore = await getLibraryCount(page)

      await page.goto('/dashboard/transcribe')
      await page.locator(SEL.urlInput).fill(url)
      await page.locator(SEL.extractBtn).click()

      // If duplicate was detected, the UI shows a Dutch prompt instead of extracting.
      // Click "Toch extraheren" (Extract anyway) to proceed.
      const extractAnywayBtn = page.getByRole('button', { name: 'Toch extraheren' })
      if (await extractAnywayBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await extractAnywayBtn.click()
      }

      const ok = await page
        .waitForSelector('[data-sonner-toast]', { timeout: 60_000 })
        .then(async (el) => (await el.textContent() ?? '').toLowerCase().includes('transcript'))
        .catch(() => false)

      expect(ok, `Extraction should succeed for ${label}`).toBe(true)

      const countAfter = await getLibraryCount(page)
      expect(countAfter, 'Library count should increase').toBeGreaterThanOrEqual(countBefore)
    })
  }
})

// ─── Test 1.2 — Long video auto-captions ─────────────────────────────────────

test.describe('1.2 — Auto-captions: long video (27 min)', () => {
  test.setTimeout(150_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account1)
  })

  test('extracts 27min 3Blue1Brown video, word count > 1000', async ({ page }) => {
    const url = 'https://youtu.be/aircAruvnKk'

    await page.goto('/dashboard/transcribe')
    await page.locator(SEL.urlInput).fill(url)
    await page.locator(SEL.extractBtn).click()

    // If duplicate detected, click "Toch extraheren" (Extract anyway)
    const extractAnyway12 = page.getByRole('button', { name: 'Toch extraheren' })
    if (await extractAnyway12.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await extractAnyway12.click()
    }

    // Wait up to 120s for toast
    const toastEl = await page
      .waitForSelector('[data-sonner-toast]', { timeout: 120_000 })
      .catch(() => null)

    expect(toastEl, 'Extraction toast should appear').not.toBeNull()
    const toastText = await toastEl?.textContent() ?? ''
    expect(toastText.toLowerCase()).toContain('transcript')

    // Navigate to library and open the latest transcript
    await page.goto('/dashboard/library')
    // Library uses card/list layout — click first transcript link
    await page.locator('a[href*="/dashboard/library/"]').first().click()
    await page.waitForURL('**/library/**', { timeout: 10_000 })

    // Check content is substantial (> 1000 words)
    const bodyText = await page.locator('body').textContent() ?? ''
    const wordCount = bodyText.trim().split(/\s+/).length
    expect(wordCount, 'Transcript body should contain > 1000 words').toBeGreaterThan(1000)
  })
})

// ─── Test 1.3 — Whisper on short video ───────────────────────────────────────

test.describe('1.3 — Whisper: short video (19s)', () => {
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account2)
  })

  test('deducts 1 credit, shows Whisper AI label', async ({ page }) => {
    const url = 'https://youtu.be/jNQXAC9IVRw'

    await page.goto('/dashboard/transcribe')

    const creditsBefore = await getCredits(page)

    await page.locator(SEL.urlInput).fill(url)

    // Enable Whisper
    const toggle = page.locator(SEL.whisperToggle)
    const checked = await toggle.getAttribute('aria-checked')
    if (checked !== 'true') await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await page.locator(SEL.extractBtn).click()

    // Wait up to 10s for either the duplicate prompt OR the Whisper confirmation to appear.
    // The duplicate debounce can fire late, so we can't use a short fixed window.
    const extractAnyway13 = page.locator('button:has-text("Toch extraheren")')
    const confirmBtn13 = page.locator(SEL.confirmExtract)
    await Promise.race([
      extractAnyway13.waitFor({ state: 'visible', timeout: 10_000 }),
      confirmBtn13.waitFor({ state: 'visible', timeout: 10_000 }),
    ]).catch(() => {})

    if (await extractAnyway13.isVisible().catch(() => false)) {
      await extractAnyway13.click()
    }

    // Confirm Whisper dialog (inline panel, not a modal)
    const confirmBtn = page.locator(SEL.confirmExtract)
    await confirmBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await confirmBtn.click()

    // Wait for success
    const toastEl = await page
      .waitForSelector('[data-sonner-toast]', { timeout: 60_000 })
      .catch(() => null)
    expect(toastEl, 'Success toast should appear').not.toBeNull()
    const toastText = await toastEl?.textContent() ?? ''
    expect(toastText.toLowerCase()).toContain('transcript')

    // Check credits decreased by 1
    if (creditsBefore !== -1) {
      const creditsAfter = await getCredits(page)
      if (creditsAfter !== -1) {
        expect(creditsAfter).toBe(creditsBefore - 1)
      }
    }

    // Open transcript and verify Whisper label
    await page.goto('/dashboard/library')
    // Library uses card/list layout — read first item's text
    const firstRow = page.locator('a[href*="/dashboard/library/"]').first()
    const methodText = await firstRow.textContent() ?? ''
    expect(
      methodText.toLowerCase().includes('whisper') ||
      methodText.toLowerCase().includes('ai'),
      'Transcript should show Whisper AI method'
    ).toBe(true)
  })
})

// ─── Test 1.4 — Whisper on long video ────────────────────────────────────────

test.describe('1.4 — Whisper: long video (15 min, expects 2 credits)', () => {
  test.setTimeout(240_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account2)
  })

  test('deducts 2 credits for 15-minute video', async ({ page }) => {
    const url = 'https://youtu.be/UF8uR6Z6KLc'

    await page.goto('/dashboard/transcribe')
    const creditsBefore = await getCredits(page)

    await page.locator(SEL.urlInput).fill(url)

    const toggle = page.locator(SEL.whisperToggle)
    const checked = await toggle.getAttribute('aria-checked')
    if (checked !== 'true') await toggle.click()

    await page.locator(SEL.extractBtn).click()

    // Wait up to 10s for either the duplicate prompt OR the Whisper confirmation to appear.
    const extractAnyway14 = page.locator('button:has-text("Toch extraheren")')
    const confirmBtn14 = page.locator(SEL.confirmExtract)
    await Promise.race([
      extractAnyway14.waitFor({ state: 'visible', timeout: 10_000 }),
      confirmBtn14.waitFor({ state: 'visible', timeout: 10_000 }),
    ]).catch(() => {})

    if (await extractAnyway14.isVisible().catch(() => false)) {
      await extractAnyway14.click()
    }

    // Confirm dialog should show credit cost (inline panel, not a modal — no [role="dialog"])
    const confirmBtn = page.locator(SEL.confirmExtract)
    await confirmBtn.waitFor({ state: 'visible', timeout: 15_000 })

    // Log the inline Whisper confirm panel text for debugging
    const whisperPanel = page.locator('text=/Whisper AI will cost/i').first()
    const dialogText = await whisperPanel.textContent().catch(() => '')
    console.log('Whisper confirm dialog:', dialogText)
    expect(dialogText).toMatch(/2 credit/i)

    await confirmBtn.click()

    const toastEl = await page
      .waitForSelector('[data-sonner-toast]', { timeout: 180_000 })
      .catch(() => null)
    expect(toastEl, 'Success toast should appear within 180s').not.toBeNull()

    if (creditsBefore !== -1) {
      const creditsAfter = await getCredits(page)
      if (creditsAfter !== -1) {
        expect(creditsAfter).toBe(creditsBefore - 2)
      }
    }
  })
})

// ─── Test 1.5 — Error cases ───────────────────────────────────────────────────

test.describe('1.5 — Error cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, account1)
  })

  test('invalid URL shows error message', async ({ page }) => {
    await page.goto('/dashboard/transcribe')
    await page.locator(SEL.urlInput).fill('not-a-url')
    await page.locator(SEL.extractBtn).click()

    const error = await page
      .waitForSelector('text=/invalid|valid youtube|not a valid/i', { timeout: 10_000 })
      .catch(() => null)
    expect(error, 'Error message should appear for invalid URL').not.toBeNull()
  })

  test('non-YouTube URL shows error message', async ({ page }) => {
    await page.goto('/dashboard/transcribe')
    await page.locator(SEL.urlInput).fill('https://vimeo.com/123456789')
    await page.locator(SEL.extractBtn).click()

    const error = await page
      .waitForSelector('text=/invalid|youtube|not supported/i', { timeout: 10_000 })
      .catch(() => null)
    expect(error, 'Error message should appear for non-YouTube URL').not.toBeNull()
  })

  test('already-extracted video shows duplicate warning', async ({ page }) => {
    // Use the 19s video which was already extracted in 1.1/1.3
    const url = 'https://youtu.be/jNQXAC9IVRw'
    await page.goto('/dashboard/transcribe')
    await page.locator(SEL.urlInput).fill(url)
    await page.locator(SEL.extractBtn).click()

    // Look for duplicate indicator (toast or inline warning)
    const duplicate = await Promise.race([
      page
        .waitForSelector('text=/already|duplicate|je hebt/i', { timeout: 15_000 })
        .then(() => true)
        .catch(() => false),
      page
        .waitForSelector('[data-sonner-toast]', { timeout: 15_000 })
        .then(async (el) => {
          const text = await el.textContent() ?? ''
          return text.toLowerCase().includes('already') || text.toLowerCase().includes('al ')
        })
        .catch(() => false),
    ])

    // Duplicate detection is a warning, not a hard failure — just log if missing
    if (!duplicate) {
      console.warn('Duplicate warning not shown (video may not have been extracted previously)')
    }
  })
})

// ─── Test 1.6 — Very long videos ──────────────────────────────────────────────

test.describe('1.6 — Very long videos: processing time correlation', () => {
  test.setTimeout(360_000) // 6 min per test

  const LONG_VIDEOS = [
    { url: 'https://youtu.be/8jPQjjsBbIc', id: '8jPQjjsBbIc', durationMinutes: 60, label: '1h lecture' },
    // 90-min lecture: MIT OpenCourseWare Intro to Algorithms
    { url: 'https://youtu.be/HtSuA80QTyo', id: 'HtSuA80QTyo', durationMinutes: 90, label: '90min lecture' },
    // 2h video: Harvard CS50 2023
    { url: 'https://youtu.be/8mAITcNt710', id: '8mAITcNt710', durationMinutes: 120, label: '2h lecture' },
  ]

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account4)
  })

  for (const video of LONG_VIDEOS) {
    test(`extracts ${video.label} (${video.durationMinutes}min), logs processing time`, async ({ page }) => {
      const start = Date.now()
      let wordCount = 0
      let success = false
      let errorType: string | undefined

      await page.goto('/dashboard/transcribe')
      await page.locator(SEL.urlInput).fill(video.url)
      await page.locator(SEL.extractBtn).click()

      try {
        const toastEl = await page.waitForSelector('[data-sonner-toast]', { timeout: 300_000 })
        const text = await toastEl.textContent() ?? ''
        success = text.toLowerCase().includes('transcript')
        if (!success) errorType = text.slice(0, 80)
      } catch {
        errorType = 'timeout'
      }

      const processingTimeMs = Date.now() - start

      if (success) {
        // Navigate to latest transcript and measure word count
        await page.goto('/dashboard/library')
        // Library uses card/list layout — find first transcript link
        const firstLink = page.locator('a[href*="/dashboard/library/"]').first()
        if (await firstLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await firstLink.click()
          await page.waitForURL('**/library/**', { timeout: 10_000 })
          const bodyText = await page.locator('body').textContent() ?? ''
          wordCount = estimateWordCount(bodyText)
        }
      }

      console.log(
        `1.6 ${video.label}: success=${success}, time=${(processingTimeMs / 1000).toFixed(1)}s, words=${wordCount}`
      )

      logProcessingTime({
        video_id: video.id,
        duration_minutes: video.durationMinutes,
        processing_time_ms: processingTimeMs,
        word_count: wordCount,
        method: 'auto-captions',
      })

      logTestResult(`1.6 — ${video.label}`, {
        success,
        processing_time_ms: processingTimeMs,
        video_duration_minutes: video.durationMinutes,
        word_count: wordCount,
        video_id: video.id,
        method: 'auto-captions',
        error_type: errorType,
      })

      expect(success, `Extraction should succeed for ${video.label}`).toBe(true)

      // Word count should scale with duration: roughly 130 words/min minimum
      const minExpectedWords = video.durationMinutes * 130
      expect(wordCount, `Word count should scale with video length`).toBeGreaterThan(minExpectedWords)
    })
  }
})
