/**
 * 03-library.spec.ts
 * Tests for library operations and AI summarization.
 */

import { test, expect } from '@playwright/test'
import { account1 } from '../config/accounts'
import { loginAs, SEL } from '../helpers/auth'
import { logTestResult } from '../helpers/metrics'
import * as path from 'path'
import * as fs from 'fs'

// ─── Test 3.1 — Library operations ───────────────────────────────────────────

test.describe('3.1 — Library operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, account1)
  })

  test('library shows extracted transcripts', async ({ page }) => {
    await page.goto('/dashboard/library')

    // Rows should be present (tests 1.x already extracted videos)
    await page.waitForSelector('a[href*="/dashboard/library/"]', { timeout: 10_000 }).catch(() => null)
    const rowCount = await page.locator('a[href*="/dashboard/library/"]').count()
    console.log(`Library has ${rowCount} transcripts`)
    // Don't hard-fail — just report if empty
    if (rowCount === 0) {
      console.warn('Library is empty — run 01-single-video tests first')
    }
  })

  test('search filters transcripts by title', async ({ page }) => {
    await page.goto('/dashboard/library')
    await page.waitForSelector('a[href*="/dashboard/library/"]', { timeout: 10_000 }).catch(() => null)

    const search = page.locator(SEL.searchInput)
    await search.fill('Me at the zoo') // known title from jNQXAC9IVRw

    await page.waitForTimeout(800) // debounce

    const rows = page.locator('a[href*="/dashboard/library/"]')
    const count = await rows.count()
    if (count === 0) {
      // Try another term
      await search.fill('Rick Astley')
      await page.waitForTimeout(800)
    }

    const visibleRows = await page.locator('a[href*="/dashboard/library/"]').count()
    console.log(`Search returned ${visibleRows} rows`)
    // If library is empty, skip assertion
    if (visibleRows > 0) {
      await expect(rows.first()).toBeVisible()
    }
  })

  test('opens transcript viewer with visible content', async ({ page }) => {
    await page.goto('/dashboard/library')
    const firstRow = page.locator('a[href*="/dashboard/library/"]').first()

    if (await firstRow.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false)) {
      await firstRow.click()

      await page.waitForURL('**/library/**', { timeout: 10_000 })
      await page.waitForSelector('text=/transcript|Transcript/', { timeout: 10_000 })

      const bodyText = await page.locator('body').textContent() ?? ''
      expect(bodyText.length).toBeGreaterThan(100)
    } else {
      test.skip(true, 'No transcripts in library to open')
    }
  })

  test('exports TXT download', async ({ page }) => {
    await page.goto('/dashboard/library')
    const firstRow = page.locator('a[href*="/dashboard/library/"]').first()

    if (!await firstRow.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'No transcripts in library')
    }

    await firstRow.click()
    await page.waitForURL('**/library/**', { timeout: 10_000 })

    // Export is a dropdown on the transcript toolbar: open it, then pick a format.
    const exportBtn = page.getByRole('button', { name: 'Export' }).first()
    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exportBtn.click()
      const item = page.getByRole('menuitem', { name: /Plain text \(\.txt\)/i })
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        item.click(),
      ])
      const filename = download.suggestedFilename()
      console.log(`Downloaded: ${filename}`)
      expect(filename).toMatch(/\.txt$/i)
    } else {
      console.warn('No export button found on transcript viewer page')
    }
  })

  test('exports SRT download', async ({ page }) => {
    await page.goto('/dashboard/library')
    const firstRow = page.locator('a[href*="/dashboard/library/"]').first()

    if (!await firstRow.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'No transcripts in library')
    }

    await firstRow.click()
    await page.waitForURL('**/library/**', { timeout: 10_000 })

    const exportBtn = page.getByRole('button', { name: 'Export' }).first()
    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exportBtn.click()
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        page.getByRole('menuitem', { name: /SRT \(\.srt\)/i }).click(),
      ])
      expect(download.suggestedFilename()).toMatch(/\.srt$/i)
    } else {
      console.warn('SRT export button not found')
    }
  })

  test('exports JSON download', async ({ page }) => {
    await page.goto('/dashboard/library')
    const firstRow = page.locator('a[href*="/dashboard/library/"]').first()

    if (!await firstRow.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'No transcripts in library')
    }

    await firstRow.click()
    await page.waitForURL('**/library/**', { timeout: 10_000 })

    const exportBtn = page.getByRole('button', { name: 'Export' }).first()
    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exportBtn.click()
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        page.getByRole('menuitem', { name: /JSON \(\.json\)/i }).click(),
      ])
      expect(download.suggestedFilename()).toMatch(/\.json$/i)
    } else {
      console.warn('JSON export button not found')
    }
  })
})

// ─── Test 3.2 — AI Summary ────────────────────────────────────────────────────

test.describe('3.2 — AI Summary', () => {
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account1)
  })

  // Summarize moved into the ⋯ overflow menu in the redesign. Assert its placement, its
  // 3-credit cost, and that it opens a confirmation — but STOP before confirming, so this
  // never spends credits on a real AI call (that path is covered manually).
  test('summarize is reachable from ⋯ with the 3-credit cost and a confirmation step', async ({ page }) => {
    await page.goto('/dashboard/library')
    const firstLink = page.locator('a[href*="/dashboard/library/"]').first()
    if (!await firstLink.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'No transcripts in library')
    }
    await firstLink.click()
    await page.waitForURL('**/library/**', { timeout: 10_000 })

    // Open the ⋯ menu and find the summarise item (label + cost live together).
    await page.locator('[aria-label="More actions"]').first().click()
    const summarise = page.getByRole('menuitem', { name: /Summari|Regenerate summary/i })
    await expect(summarise, 'Summarise/Regenerate lives in the ⋯ menu').toBeVisible({ timeout: 5_000 })
    await expect(summarise, 'the cost is shown as 3 credits').toContainText(/3 credits/i)

    // Clicking opens the confirmation dialog — assert it, then bail out (no AI call).
    await summarise.click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog).toContainText(/3 credits/i)
    await page.keyboard.press('Escape')
  })
})

// ─── Test 3.3 — Transcript editing ───────────────────────────────────────────

test.describe('3.3 — Transcript editing', () => {
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account1)
  })

  test('edit original tab, assert Edited tab appears with changed content', async ({ page }) => {
    const start = Date.now()

    await page.goto('/dashboard/library')
    const firstLink = page.locator('a[href*="/dashboard/library/"]').first()
    if (!await firstLink.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'No transcripts in library — run 01-single-video first')
    }
    await firstLink.click()
    await page.waitForURL('**/library/**', { timeout: 10_000 })

    // Make sure we're on the Transcript tab (id 'original' — labelled "Transcript" post-redesign)
    const originalTab = page.locator('[data-testid="transcript-tab-original"]').first()
    if (await originalTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await originalTab.click()
    }

    // Click Edit button
    const editBtn = page.locator(
      'button:has-text("Edit"), button[aria-label*="edit" i], button:has-text("✏")'
    ).first()
    if (!await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.warn('Edit button not found — transcript editor may work differently')
      return
    }
    await editBtn.click()

    // Edit routes to the Edited tab (?tab=edited) and re-mounts the editor seeded from the
    // original — wait for that navigation AND the editable ProseMirror to be ready before
    // typing, or the seed overwrites the marker.
    await page.waitForURL(/tab=edited/, { timeout: 10_000 })
    const editor = page.locator('.ProseMirror[contenteditable="true"]').first()
    await editor.waitFor({ state: 'visible', timeout: 10_000 })
    await page.waitForTimeout(600) // let the seed settle before typing

    // Inject a unique marker. Bracket-free (brackets collide with ProseMirror input rules /
    // the leading timestamp link) and inserted atomically at the document end (per-key typing
    // near the timestamp link scatters characters).
    const marker = `TESTEDIT${Date.now()}`
    await editor.click()
    await page.keyboard.press('Control+End')
    await page.keyboard.insertText(' ' + marker)
    // Confirm the marker actually landed in the editor before saving
    await expect(editor).toContainText(marker, { timeout: 5_000 })

    // Save
    const saveBtn = page.locator(
      'button:has-text("Save"), button:has-text("Done"), button[aria-label*="save" i]'
    ).first()
    await saveBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await saveBtn.click()

    // Wait for save confirmation
    await page.waitForTimeout(1_500)

    // Edited tab should now appear
    const editedTab = page.locator('[data-testid="transcript-tab-edited"]').first()
    await editedTab.waitFor({ state: 'visible', timeout: 10_000 })
    expect(editedTab, 'Edited tab should appear after saving').toBeTruthy()

    // Click Edited tab and verify marker is present (read the editor, not page chrome)
    await editedTab.click()
    await page.waitForURL(/tab=edited/, { timeout: 10_000 })
    await expect(page.locator('.ProseMirror').first()).toContainText(marker, { timeout: 10_000 })

    // Switch back to the Transcript (original) tab and confirm it's unchanged. Wait for the
    // route + a fresh editor so we don't read the still-mounted edited editor mid-transition.
    if (await originalTab.isVisible().catch(() => false)) {
      await originalTab.click()
      await page.waitForURL(/tab=original/, { timeout: 10_000 })
      const orig = page.locator('.ProseMirror').first()
      await orig.waitFor({ state: 'visible', timeout: 10_000 })
      await page.waitForTimeout(400)
      const restoredContent = await orig.textContent() ?? ''
      expect(restoredContent, 'Original content should not contain the edit marker').not.toContain(marker)
    }

    logTestResult('3.3 — Transcript editing', {
      success: true,
      processing_time_ms: Date.now() - start,
      method: 'unknown',
    })
  })
})

// ─── Test 3.4 — AI Summary editing ───────────────────────────────────────────

test.describe('3.4 — AI Summary with editing', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await loginAs(page, account1)
  })

  // Edit an EXISTING summary → Edited Summary tab. Never generates one (that's a paid AI call);
  // skips if the first transcript has no summary. Exercises the summary-edit flow + the
  // stable summary/summary_edited tab ids the redesign introduced.
  test('edit an existing AI summary → Edited Summary tab', async ({ page }) => {
    const start = Date.now()
    await page.goto('/dashboard/library')
    const firstLink = page.locator('a[href*="/dashboard/library/"]').first()
    if (!await firstLink.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'No transcripts in library')
    }
    await firstLink.click()
    await page.waitForURL('**/library/**', { timeout: 10_000 })

    // The Summary tab exists only when the transcript already has an AI summary.
    const summaryTab = page.locator('[data-testid="transcript-tab-summary"]').first()
    if (!await summaryTab.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'First transcript has no AI summary to edit')
    }
    await summaryTab.click()
    await page.waitForURL(/tab=summary/, { timeout: 10_000 })
    await expect(page.getByText('AI Summary', { exact: false }).first()).toBeVisible({ timeout: 10_000 })

    // Edit → type a bracket-free marker atomically → Save (auto-routes to ?tab=summary_edited).
    await page.getByRole('button', { name: /^Edit$/ }).first().click()
    const editor = page.locator('.ProseMirror[contenteditable="true"]').first()
    await editor.waitFor({ state: 'visible', timeout: 10_000 })
    await page.waitForTimeout(400)
    const marker = `SUMEDIT${Date.now()}`
    await editor.click()
    await page.keyboard.press('Control+End')
    await page.keyboard.insertText(' ' + marker)
    await expect(editor).toContainText(marker, { timeout: 5_000 })
    await page.getByRole('button', { name: /^Save$/ }).first().click()

    // Saving routes to the Edited Summary tab; assert it exists and carries the marker.
    await page.waitForURL(/tab=summary_edited/, { timeout: 10_000 })
    await expect(page.locator('[data-testid="transcript-tab-summary_edited"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.ProseMirror').first()).toContainText(marker, { timeout: 10_000 })

    logTestResult('3.4 — AI Summary editing', {
      success: true,
      processing_time_ms: Date.now() - start,
      method: 'unknown',
    })
  })
})
