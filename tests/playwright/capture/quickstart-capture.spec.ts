/**
 * Docs-screenshot capture machine (NOT a functional test). Produces the stills used by
 * /docs/quickstart. Because it drives the real UI by role/text, a renamed button or a moved
 * control makes the matching capture fail — that failure IS the route/label regression signal.
 *
 * Run:  BASE_URL=http://localhost:3001 npx playwright test --config=playwright.capture.config.ts
 * (Needs: local app on :3001, the capture account signed in with 500 credits, live Railway backend
 *  for the LIVE captures. The 9 functional specs live in a different testDir and are unaffected.)
 *
 * LIVE vs STUBBED is marked per capture. A stubbed card proves the FRONTEND renders that state,
 * NOT that the backend emits that code in that situation.
 */
import { test, type Page, type Locator } from '@playwright/test'
import { loginAs } from '../helpers/auth'
import { account1 } from '../config/accounts'
import * as path from 'path'
import * as fs from 'fs'

const OUT = path.resolve(__dirname, '../../../apps/marketing/public/docs/screenshots')
const VIDEO_URL = 'https://www.youtube.com/watch?v=kBdfcR-8hEY'
const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6'
const CONSENT = JSON.stringify({
  ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted',
  ad_personalization: 'granted', version: '1', ts: 1785000000000,
})

fs.mkdirSync(OUT, { recursive: true })

async function prep(page: Page) {
  await page.addInitScript((consent) => {
    localStorage.setItem('indxr_consent', consent as string)
    localStorage.setItem('theme', 'light')
    try { document.documentElement.setAttribute('data-theme', 'light') } catch {}
  }, CONSENT)
  await page.emulateMedia({ colorScheme: 'light' })
  await loginAs(page, account1) // cookie-injected session; navigates to /dashboard/library
}

async function save(el: Locator, name: string) {
  await el.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log(`  ✔ captured ${name}.png`)
}

test.describe.configure({ mode: 'default', timeout: 120_000 })

// ── LIVE: method chooser ────────────────────────────────────────────────────
test('method-choice (live)', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/transcribe')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(VIDEO_URL)
  const chooser = page.getByRole('radiogroup', { name: 'Transcription method' })
  await chooser.waitFor({ state: 'visible' })
  // include the "Transcription method" caption above the radiogroup
  await save(chooser.locator('xpath=..'), 'method-choice')
})

// ── LIVE: AI cost card (real metadata → 55 credits), then Cancel (never confirm) ─
test('cost-card-ai (live, cancel)', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/transcribe')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(VIDEO_URL)
  await page.getByRole('radio', { name: /AI transcription/ }).click()
  await page.getByRole('button', { name: /Extract|Checking/ }).click()
  const extractBtn = page.getByRole('button', { name: /^Extract — \d+\+? credits$/ })
  await extractBtn.waitFor({ state: 'visible' })
  const card = extractBtn.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
  await save(card, 'cost-card-ai')
  await page.getByRole('button', { name: 'Cancel' }).click() // safety: never charge
})

// ── LIVE: captions extraction → result card + export menu (retry — bot_detection is possible) ─
test('captions-result + export-menu (live)', async ({ page }) => {
  test.setTimeout(340_000)
  await prep(page)
  let ok = false
  for (let attempt = 1; attempt <= 6 && !ok; attempt++) {
    await page.goto('/dashboard/transcribe')
    await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(VIDEO_URL)
    await page.getByRole('button', { name: /^Extract$/ }).click()
    try {
      await page.getByText('Transcript ready', { exact: false }).waitFor({ state: 'visible', timeout: 40_000 })
      ok = true
    } catch { console.log(`  captions attempt ${attempt} did not complete, retrying…`) }
  }
  if (!ok) { test.skip(true, 'captions extraction bot-blocked in 6 attempts') ; return }
  const card = page.getByText('Transcript ready').locator('xpath=ancestor::*[contains(@class,"shadow-sm")][1]')
  await save(card, 'captions-result')
  await page.getByRole('button', { name: 'Export' }).click()
  const menu = page.getByRole('menu')
  await menu.waitFor({ state: 'visible' })
  await save(menu, 'export-menu')
})

// ── LIVE: library row of the just-made transcript (with method badge) ─────────
test('library-row (live)', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library')
  // Each list row is a direct child div of the divide-y container (TranscriptList.tsx:609-618).
  const row = page.locator('div.divide-y > div').first()
  await row.waitFor({ state: 'visible', timeout: 20_000 })
  await save(row, 'library-row')
})

// ── LIVE: playlist review screen (fetch is free; NEVER start the paid job) ────
test('playlist-review (live)', async ({ page }) => {
  test.setTimeout(140_000)
  await prep(page)
  await page.goto('/dashboard/transcribe?mode=playlist')
  await page.getByPlaceholder('Paste YouTube Playlist URL...').fill(PLAYLIST_URL)
  await page.getByRole('button', { name: 'Fetch playlist' }).click()
  const review = page.locator('div.rounded-2xl').filter({ hasText: /videos/ }).first()
  await review.waitFor({ state: 'visible', timeout: 90_000 })
  await save(review, 'playlist-review')
})

// ── STUBBED: progress cards (Downloading audio / Transcribing) ────────────────
for (const [phase, name] of [['downloading', 'progress-downloading'], ['transcribing', 'progress-transcribing']] as const) {
  test(`${name} (stubbed)`, async ({ page }) => {
    await prep(page)
    await page.route('**/api/video/metadata/**', (r) =>
      r.fulfill({ json: { duration: 3296, title: 'Justice: What’s The Right Thing To Do? — Episode 01' } }))
    await page.route('**/api/transcribe/whisper', (r) =>
      r.fulfill({ json: { job_id: 'stub-job', status: 'pending' } }))
    await page.route('**/api/jobs/stub-job**', (r) =>
      r.fulfill({ json: { status: phase, duration_seconds: 3296, credits_cost: 55, download_bytes: 2_400_000, download_total_bytes: 6_000_000 } }))
    await page.goto('/dashboard/transcribe')
    await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(VIDEO_URL)
    await page.getByRole('radio', { name: /AI transcription/ }).click()
    await page.getByRole('button', { name: /Extract|Checking/ }).click()
    await page.getByRole('button', { name: /^Extract — \d+\+? credits$/ }).click() // hits STUBBED whisper → no charge
    const label = phase === 'downloading' ? 'Downloading audio' : 'Transcribing'
    const header = page.getByText(label, { exact: true })
    await header.waitFor({ state: 'visible', timeout: 20_000 })
    await save(header.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]'), name)
  })
}

// ── STUBBED: AI result card ───────────────────────────────────────────────────
test('ai-result (stubbed)', async ({ page }) => {
  await prep(page)
  await page.route('**/api/video/metadata/**', (r) =>
    r.fulfill({ json: { duration: 3296, title: 'Justice: What’s The Right Thing To Do? — Episode 01' } }))
  await page.route('**/api/transcribe/whisper', (r) => r.fulfill({ json: { job_id: 'stub-ai', status: 'pending' } }))
  await page.route('**/api/jobs/stub-ai**', (r) => r.fulfill({ json: {
    status: 'complete', duration_seconds: 3296, credits_cost: 55, transcript_id: '00000000-0000-0000-0000-000000000001',
    transcript: [
      { text: 'Consider the following.', offset: 0, duration: 2.4 },
      { text: 'Suppose you were the driver of a runaway trolley.', offset: 2.4, duration: 3.1 },
    ],
  } }))
  await page.goto('/dashboard/transcribe')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(VIDEO_URL)
  await page.getByRole('radio', { name: /AI transcription/ }).click()
  await page.getByRole('button', { name: /Extract|Checking/ }).click()
  await page.getByRole('button', { name: /^Extract — \d+\+? credits$/ }).click()
  const header = page.getByText('Transcript ready', { exact: false })
  await header.waitFor({ state: 'visible', timeout: 20_000 })
  await save(header.locator('xpath=ancestor::*[contains(@class,"shadow-sm")][1]'), 'ai-result')
})

// ── STUBBED: every ErrorCard the copy map knows ───────────────────────────────
const ERROR_CODES = [
  'no_captions', 'members_only', 'age_restricted', 'youtube_restricted', 'bot_detection',
  'timeout', 'connection_error', 'server_error', 'partial_write', 'proxy_error', 'ytdlp_parse',
  'extraction_error', 'no_speech', 'no_speech_detected', 'insufficient_credits', 'storage_full',
  'duration_error', 'duration_exceeds_max', 'file_too_large', 'too_many_jobs', 'too_many_videos',
  'suspended', 'unauthorized', 'channel_url', 'unsupported_file', 'api_error', 'compression_error',
  'worker_crashed', 'stuck_pending', 'credit_deduction_failed', 'credit_check_error',
  'validation_error', 'internal_error', 'zzz_unknown_fallback',
]
for (const code of ERROR_CODES) {
  test(`errorcard ${code} (stubbed)`, async ({ page }) => {
    await prep(page)
    await page.route('**/api/extract', (r) => r.fulfill({
      status: code === 'members_only' ? 403 : 400,
      json: { success: false, error_type: code, error: 'stub', required_credits: 100 },
    }))
    await page.goto('/dashboard/transcribe')
    await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(VIDEO_URL)
    await page.getByRole('button', { name: /^Extract$/ }).click()
    const card = page.locator('.border-l-error').first()
    await card.waitFor({ state: 'visible', timeout: 15_000 })
    await save(card, `error-${code}`)
  })
}
