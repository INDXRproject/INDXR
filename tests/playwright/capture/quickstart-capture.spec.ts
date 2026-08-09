/**
 * Docs-screenshot capture machine (NOT a functional test). Produces the stills shown by the docs
 * pages (quickstart, how-indxr-works, the three guides). Because it drives the real UI by role/text,
 * a renamed button or a moved control makes the matching capture fail — that failure IS the
 * route/label regression signal.
 *
 * Run (ONE command, produces every asset in BOTH themes):
 *   BASE_URL=https://app.indxr.ai <pnpm-playwright> test --config=playwright.capture.config.ts
 * (LIVE captures need the real backend, so run against app.indxr.ai — a local `next start` can't reach
 *  the extraction backend. STUBBED captures use page.route and run anywhere. The 9 functional specs
 *  live in a different testDir and are unaffected.)
 *
 * ── CAPTURE STANDARD (screenshot-machine.md) — applied to every shot via frameShot() ──
 *  • One fixed frame width for ALL captures (FRAME_W). A narrower subject is CENTERED; the frame is
 *    always equally wide, so figures on one page never wildly differ in width.
 *  • Breathing room (PAD) around the subject — never flush to the card edge.
 *  • Background = the ACTIVE THEME's real page background (var(--bg)), never transparent.
 *  • The frame draws ONE border+radius; DocsFigure draws none (no double outline).
 *  • Height follows content; a disproportionately tall subject is shot compacter (fewer rows / a
 *    dropped panel) rather than clamped, so heights stay comparable.
 *  • Every subject is shot twice — light and dark — as <name>-light.png / <name>-dark.png. DocsFigure
 *    swaps them by [data-theme] with pure CSS.
 *
 * LIVE vs STUBBED is marked per capture. A stubbed card proves the FRONTEND renders that state,
 * NOT that the backend emits that code in that situation.
 */
import { test, type Page, type Locator } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const OUT = path.resolve(__dirname, '../../../apps/marketing/public/docs/screenshots')
const VIDEO_URL = 'https://www.youtube.com/watch?v=kBdfcR-8hEY'
// Stubbed captures use a dummy 11-char video id so the "already in your library" dedup prompt never
// intercepts the Extract click (the stub ignores which video it is — only the rendered card matters).
const STUB_URL = 'https://www.youtube.com/watch?v=STUBCARD001'
const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6'

// ── Capture-standard constants ────────────────────────────────────────────────
const FRAME_W = 1000 // fixed frame width for every capture (CSS px; DSR 2 → 2000px PNG)
const PAD = 28       // breathing room around the subject

fs.mkdirSync(OUT, { recursive: true })

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem('theme', t) } catch {}
  }, theme)
}

// Pin light theme before first paint so there's no flash; each capture flips to dark itself.
async function prep(page: Page) {
  await page.addInitScript(() => {
    try {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    } catch {}
  })
}

/**
 * Frame a subject to the capture standard and shoot it in BOTH themes. A CLONE of the subject is
 * placed inside a fixed-width, padded, single-bordered frame on the theme's page background; the
 * clone is static so flipping [data-theme] restyles both the frame vars and the clone's token/
 * Tailwind classes with no reflow risk to the live React tree. Writes <name>-light.png + <name>-dark.png.
 */
async function frameShot(page: Page, subject: Locator, name: string) {
  await subject.scrollIntoViewIfNeeded().catch(() => {})
  await subject.evaluate((node, { FRAME_W, PAD }) => {
    document.getElementById('__capframe')?.remove()
    const wrap = document.createElement('div')
    wrap.id = '__capframe'
    Object.assign(wrap.style, {
      position: 'fixed', left: '0px', top: '0px', zIndex: '2147483647',
      width: FRAME_W + 'px', boxSizing: 'border-box', padding: PAD + 'px',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      background: 'var(--bg)',
      border: '1px solid var(--border)', borderRadius: '14px',
    })
    const clone = node.cloneNode(true) as HTMLElement
    clone.style.margin = '0'
    clone.style.maxWidth = '100%'
    clone.style.flex = '0 1 auto'
    wrap.appendChild(clone)
    document.body.appendChild(wrap)
  }, { FRAME_W, PAD })

  const frame = page.locator('#__capframe')
  await frame.waitFor({ state: 'visible' })

  await setTheme(page, 'light')
  await page.waitForTimeout(150)
  await frame.screenshot({ path: path.join(OUT, `${name}-light.png`) })

  await setTheme(page, 'dark')
  await page.waitForTimeout(150)
  await frame.screenshot({ path: path.join(OUT, `${name}-dark.png`) })

  await page.evaluate(() => document.getElementById('__capframe')?.remove())
  await setTheme(page, 'light')
  console.log(`  ✔ ${name}-{light,dark}.png`)
}

test.describe.configure({ mode: 'default', timeout: 120_000 })

// ── LIVE UI: method chooser (client-side; no backend) ─────────────────────────
test('method-choice', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/transcribe')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(VIDEO_URL)
  const chooser = page.getByRole('radiogroup', { name: 'Transcription method' })
  await chooser.waitFor({ state: 'visible' })
  await frameShot(page, chooser.locator('xpath=..'), 'method-choice') // include the caption above the group
})

// ── STUBBED metadata: AI cost card (deterministic credit count), then Cancel ──
test('cost-card-ai', async ({ page }) => {
  await prep(page)
  await page.route('**/api/video/metadata/**', (r) =>
    r.fulfill({ json: { duration: 3296, title: 'Justice: What’s The Right Thing To Do? — Episode 01' } }))
  await page.goto('/dashboard/transcribe')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(STUB_URL)
  await page.getByRole('radio', { name: /AI transcription/ }).click()
  await page.getByRole('button', { name: /Extract|Checking/ }).click()
  const extractBtn = page.getByRole('button', { name: /^Extract — \d+\+? credits$/ })
  await extractBtn.waitFor({ state: 'visible' })
  const card = extractBtn.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
  await frameShot(page, card, 'cost-card-ai')
})

// ── LIVE UI: empty Audio uploader (accepted formats + size limit in view) ─────
test('uploader-empty', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/transcribe?mode=audio')
  const hint = page.getByText('Drag and drop your audio file here', { exact: false })
  await hint.waitFor({ state: 'visible' })
  const dropzone = hint.locator('xpath=ancestor::div[contains(@class,"border-dashed")][1]')
  await frameShot(page, dropzone, 'uploader-empty')
})

// ── LIVE: playlist review screen (fetch is free; NEVER start the paid job) ────
test('playlist-review', async ({ page }) => {
  test.setTimeout(140_000)
  await prep(page)
  await page.goto('/dashboard/transcribe?mode=playlist')
  await page.getByPlaceholder('Paste YouTube Playlist URL...').fill(PLAYLIST_URL)
  await page.getByRole('button', { name: 'Fetch playlist' }).click()
  const reviewBtn = page.getByRole('button', { name: /Review extraction/ })
  await reviewBtn.waitFor({ state: 'visible', timeout: 90_000 })
  const review = reviewBtn.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
  await frameShot(page, review, 'playlist-review')
})

// ── LIVE: the Library LIST (several rows → reads as an archive; account seeded) ─
test('library-list', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library')
  const rowLink = page.locator('a[href*="/dashboard/library/"]').first()
  await rowLink.waitFor({ state: 'visible', timeout: 20_000 })
  // Frame the whole divide-y list (all rows), not a single row.
  const list = rowLink.locator('xpath=ancestor::div[contains(@class,"divide-y")][1]')
  await frameShot(page, list, 'library-list')
})

// ── LIVE: transcript reading pane WITH speaker labels (seeded diarised interview) ─
// Account seeded with a clean, public 2-speaker interview (screenshot-machine.md seed practice).
test('transcript-speakers', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library')
  const row = page.locator('a[href*="/dashboard/library/"]', { hasText: 'Designing for Deep Work' })
  await row.first().waitFor({ state: 'visible', timeout: 20_000 })
  await row.first().click()
  // Wait until a renamed speaker label is painted in the reading pane.
  await page.getByText('Sarah Chen:', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  const pane = page.locator('.ProseMirror:visible').first()
  await frameShot(page, pane, 'transcript-speakers')
})

// ── STUBBED: progress card (Downloading audio) ────────────────────────────────
test('progress-downloading', async ({ page }) => {
  await prep(page)
  await page.route('**/api/video/metadata/**', (r) =>
    r.fulfill({ json: { duration: 3296, title: 'Justice: What’s The Right Thing To Do? — Episode 01' } }))
  await page.route('**/api/transcribe/whisper', (r) =>
    r.fulfill({ json: { job_id: 'stub-job', status: 'pending' } }))
  await page.route('**/api/jobs/stub-job**', (r) =>
    r.fulfill({ json: { status: 'downloading', duration_seconds: 3296, credits_cost: 55, download_bytes: 2_400_000, download_total_bytes: 6_000_000 } }))
  await page.goto('/dashboard/transcribe')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(STUB_URL)
  await page.getByRole('radio', { name: /AI transcription/ }).click()
  await page.getByRole('button', { name: /Extract|Checking/ }).click()
  await page.getByRole('button', { name: /^Extract — \d+\+? credits$/ }).click() // hits STUBBED whisper → no charge
  const header = page.getByText('Downloading audio', { exact: true })
  await header.waitFor({ state: 'visible', timeout: 20_000 })
  await frameShot(page, header.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]'), 'progress-downloading')
})

// ── STUBBED: the ErrorCards that docs pages actually render ───────────────────
// Default: only the 4 shown on pages. CAPTURE_GALLERY=1 shoots the full ErrorCard set (coverage),
// still to the same dir and still dual-theme.
const RENDERED_ERROR_CODES = ['no_captions', 'youtube_restricted', 'bot_detection', 'storage_full']
const ALL_ERROR_CODES = [
  'no_captions', 'members_only', 'age_restricted', 'youtube_restricted', 'bot_detection',
  'timeout', 'connection_error', 'server_error', 'partial_write', 'proxy_error', 'ytdlp_parse',
  'extraction_error', 'no_speech', 'no_speech_detected', 'insufficient_credits', 'storage_full',
  'duration_error', 'duration_exceeds_max', 'file_too_large', 'too_many_jobs', 'too_many_videos',
  'suspended', 'unauthorized', 'channel_url', 'unsupported_file', 'api_error', 'compression_error',
  'worker_crashed', 'stuck_pending', 'credit_deduction_failed', 'credit_check_error',
  'validation_error', 'internal_error', 'invalid_request', 'watchdog_permanent_failure',
  'zzz_unknown_fallback',
]
const ERROR_CODES = process.env.CAPTURE_GALLERY === '1' ? ALL_ERROR_CODES : RENDERED_ERROR_CODES
for (const code of ERROR_CODES) {
  test(`errorcard ${code}`, async ({ page }) => {
    await prep(page)
    await page.route('**/api/extract', (r) => r.fulfill({
      status: code === 'members_only' ? 403 : 400,
      json: { success: false, error_type: code, error: 'stub', required_credits: 100 },
    }))
    await page.goto('/dashboard/transcribe')
    await page.getByPlaceholder('https://www.youtube.com/watch?v=...').fill(STUB_URL)
    await page.getByRole('button', { name: /^Extract$/ }).click()
    const card = page.locator('.border-l-error').first()
    await card.waitFor({ state: 'visible', timeout: 15_000 })
    await frameShot(page, card, `error-${code}`)
  })
}
