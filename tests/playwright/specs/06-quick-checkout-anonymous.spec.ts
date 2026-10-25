/**
 * 06-quick-checkout-anonymous.spec.ts
 *
 * growth-plan.md §6.3 H3-H7: real-browser verification of the anonymous snelle-balie upload flow
 * (/transcribe, no login) across viewport + color-scheme combinations. Generates a short silent
 * WAV via ffmpeg (no fixture file existed in the repo) so this spec is self-contained — no login,
 * no account provisioning needed (the whole point of this page).
 */

import { test, expect } from '@playwright/test'
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const FIXTURE_PATH = path.join(os.tmpdir(), 'indxr-e2e-quick-checkout-test-tone.wav')

test.beforeAll(() => {
  // 3s, 440Hz tone, mono 8kHz — tiny file, has a real decodable audio stream (passes
  // has_usable_audio), short enough that AssemblyAI submit+poll for the free preview finishes
  // well within this spec's timeout.
  execFileSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
    '-ar', '8000', '-ac', '1', FIXTURE_PATH,
  ])
})

test.afterAll(() => {
  fs.rmSync(FIXTURE_PATH, { force: true })
})

const VIEWPORTS = [
  { name: 'mobile-375', viewport: { width: 375, height: 812 } },
  { name: 'desktop-1280', viewport: { width: 1280, height: 900 } },
] as const
const SCHEMES = ['light', 'dark'] as const

for (const vp of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    test.describe(`${vp.name} / ${scheme}`, () => {
      test.use({ viewport: vp.viewport, colorScheme: scheme })

      test(`anonymous quick-checkout renders (${vp.name}, ${scheme})`, async ({ page }) => {
        await page.goto('/transcribe')

        // H6/H2-correction: this must NOT redirect to /login (that was the bug the piloot found
        // and fixed in Onderdeel E) — confirm we're still on /transcribe.
        await expect(page).toHaveURL(/\/transcribe/)
        await expect(page).toHaveTitle('Transcribe a file — INDXR.AI')

        // H6: the dropzone + "No account needed" copy should be visible immediately.
        await expect(page.getByRole('heading', { name: 'No account needed' })).toBeVisible({ timeout: 10_000 })

        await page.screenshot({ path: `tests/playwright-report/quick-checkout-empty-${vp.name}-${scheme}.png` })

        // Upload via the hidden native input (Playwright's setInputFiles works on hidden inputs).
        await page.setInputFiles('#quick-checkout-upload-input', FIXTURE_PATH)
        await expect(page.getByText('indxr-e2e-quick-checkout-test-tone.wav')).toBeVisible()

        await page.getByRole('button', { name: 'Get a price' }).click()

        // H4: the quote screen should show a price ("Total") — give the backend (duration probe +
        // R2 write) a generous timeout since this hits the real Railway backend.
        await expect(page.getByText('Total', { exact: true })).toBeVisible({ timeout: 30_000 })

        await page.screenshot({ path: `tests/playwright-report/quick-checkout-quote-${vp.name}-${scheme}.png`, fullPage: true })
      })
    })
  }
}
