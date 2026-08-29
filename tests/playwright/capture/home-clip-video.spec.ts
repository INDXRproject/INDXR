/**
 * Home-clip VIDEO capture (NOT a functional test). Records the WHOLE 12-moment product story as ONE
 * continuous, real, scripted run — the same machine that makes core-flow.webm, extended end to end:
 * paste → choose AI → downloading → transcribing → saving → Transcript ready → click "View in Library"
 * → the library list (Justice on top) → open it → the diarised reading pane (BEFORE) → rename two
 * speakers for real (type in the fields) → the pane shows the new names (AFTER) → Timestamps → the AI
 * summary → the Export menu. Real navigation, real clicks on LIVE element boxes (no reused fractions),
 * a visible cursor (installCursor), NO zoom anywhere. Every screen is full in view.
 *
 * Deterministic + free: the transcribe backend is STUBBED (metadata/whisper/jobs + the dedup query), so
 * the run spends no credits. The library/viewer/rename/timestamps use the REAL diarised Justice AI
 * transcript (AI_ID, 14 speakers); the summary uses the caption transcript that carries the REAL
 * 5-chapter summary (SUM_ID) — same lecture, same title. The rename writes speaker_names; the runner
 * reverts it (and the library-top-row created_at seed) afterwards.
 *
 * Run (ONE command, per theme):
 *   BASE_URL=https://app.indxr.ai CAPTURE_THEME=light|dark NODE_PATH=... \
 *     node .../@playwright/test/cli.js test --config=playwright.homeclip.config.ts
 *
 * Output: tests/playwright/capture/recordings/home-clip.webm  (+ home-clip-dark.webm for CAPTURE_THEME=dark).
 */
import { test, type Route } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { installCursor, clickLikeHuman, typeLikeHuman, moveMouseXY, beat, TEMPO } from './video-helpers'

const STORAGE_STATE = path.resolve(__dirname, 'capture-state.json')
const OUT_DIR = path.resolve(__dirname, 'recordings')
const THEME: 'light' | 'dark' = process.env.CAPTURE_THEME === 'dark' ? 'dark' : 'light'
const OUT_FILE = path.join(OUT_DIR, THEME === 'dark' ? 'home-clip-dark.webm' : 'home-clip.webm')

// Real Justice fixtures (account1 owns both; same lecture, same title).
const AI_ID = '9d072903-15d7-4722-9140-d64ee3efad59'   // diarised AI transcript (14 speakers) → viewer/rename/timestamps
const SUM_ID = '0798fa30-8056-4343-9e02-c50d93c00e4a'  // caption transcript that carries the real 5-chapter summary
const VIDEO_URL = 'https://www.youtube.com/watch?v=kBdfcR-8hEY'
const FIXTURE_TITLE = "Justice: What's The Right Thing To Do? — Episode 01"
const FIXTURE_DURATION = 3296
// The transcript that "appears" is the fixture's REAL opening captions (same as core-flow).
const SEGMENTS = [
  { offset: 33.509, duration: 4.241, text: 'This is a course about Justice and we begin with a story' },
  { offset: 37.750, duration: 6.890, text: "suppose you're the driver of a trolley car, and your trolley car is hurdling down the track at sixty miles an hour" },
  { offset: 44.640, duration: 4.750, text: 'and at the end of the track you notice five workers working on the track' },
]

const VIEW = { width: 1280, height: 720 }

test('home-clip', async ({ browser }) => {
  test.setTimeout(240_000)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const context = await browser.newContext({
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
    storageState: STORAGE_STATE,
    viewport: VIEW,
    deviceScaleFactor: 1,
    colorScheme: THEME,
    recordVideo: { dir: OUT_DIR, size: VIEW },
  })
  const page = await context.newPage()
  await installCursor(page)
  await page.addInitScript((theme) => {
    try { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme) } catch {}
  }, THEME)

  // ── Deterministic transcribe backend (page.route intercepts before the network) ──
  await page.route('**/api/video/metadata/**', (r) =>
    r.fulfill({ json: { duration: FIXTURE_DURATION, title: FIXTURE_TITLE } }))
  await page.route('**/api/transcribe/whisper', (r) =>
    r.fulfill({ json: { job_id: 'stub-home-clip', status: 'pending' } }))
  // The dedup "you already have this" lookup is a client-side Supabase query; account1 owns the fixture,
  // so return empty for exactly that lookup to play the clean first-time path. Everything else (the real
  // library list, the real transcript reads) passes through untouched.
  await page.route('**/rest/v1/transcripts**', async (route) => {
    if (route.request().url().includes('video_id=eq.')) {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: '[]' })
    } else {
      await route.continue()
    }
  })
  // Phase timeline driven by wall-clock since the first poll (robust to multiple pollers/backoff).
  let jobStart = 0
  await page.route('**/api/jobs/**', async (route: Route) => {
    if (!jobStart) jobStart = Date.now()
    const t = (Date.now() - jobStart) / 1000
    let body: Record<string, unknown>
    if (t < 2.6) {
      const bytes = Math.min(6_000_000, Math.round(600_000 + 2_100_000 * t))
      body = { status: 'downloading', duration_seconds: FIXTURE_DURATION, credits_cost: 55, download_bytes: bytes, download_total_bytes: 6_000_000 }
    } else if (t < 6) {
      body = { status: 'transcribing', duration_seconds: FIXTURE_DURATION, credits_cost: 55 }
    } else if (t < 7.6) {
      body = { status: 'saving', duration_seconds: FIXTURE_DURATION, credits_cost: 55 }
    } else {
      body = { status: 'complete', duration_seconds: FIXTURE_DURATION, credits_cost: 55, transcript_id: 'stub-home-clip-t', channel: 'Harvard University', language: 'en', transcript: SEGMENTS }
    }
    await route.fulfill({ json: body })
  })

  // ══ 1) Paste the link ══
  await page.goto('/dashboard/transcribe')
  await page.waitForLoadState('networkidle').catch(() => {})
  await moveMouseXY(page, 220, 170, 1)
  await beat(page, TEMPO.beatLong)
  await typeLikeHuman(page, page.getByPlaceholder('https://www.youtube.com/watch?v=...'), VIDEO_URL)
  await beat(page, TEMPO.beatLong)

  // ══ 2) Choose AI transcription ══
  await clickLikeHuman(page, page.getByRole('radio', { name: /AI transcription/ }))
  await beat(page, TEMPO.beatShort)

  // ══ 3) Start extraction: Extract → cost card (55 credits) → the priced confirm ══
  await clickLikeHuman(page, page.getByRole('button', { name: /Extract|Checking/ }))
  const priced = page.getByRole('button', { name: /^Extract — \d+\+? credits$/ })
  await priced.waitFor({ state: 'visible', timeout: 20_000 })
  await beat(page, TEMPO.beatLong)
  await clickLikeHuman(page, priced)

  // ══ 4) Downloading → Transcribing → Saving → Transcript ready ══
  await page.getByText('Downloading audio', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByText(SEGMENTS[0].text, { exact: false }).waitFor({ state: 'visible', timeout: 30_000 })
  await beat(page, TEMPO.beatLong)

  // ══ 5) Click "View in Library" (real <a href="/dashboard/library">) ══
  await clickLikeHuman(page, page.getByRole('link', { name: 'View in Library' }))
  await page.waitForURL('**/dashboard/library', { timeout: 20_000 })
  await page.locator('a[href*="/dashboard/library/"]').first().waitFor({ state: 'visible', timeout: 20_000 })
  await beat(page, TEMPO.beatLong)

  // ══ 6) The library list — Justice is the seeded top row → open it ══
  const justiceRow = page.locator('a[href*="/dashboard/library/"]', { hasText: 'Justice' }).first()
  await justiceRow.waitFor({ state: 'visible', timeout: 20_000 })
  await clickLikeHuman(page, justiceRow)
  await page.locator('.ProseMirror:visible').first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByText('Speaker B:', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await beat(page, TEMPO.beatLong) // BEFORE: the diarised reading pane (Speaker A:/B: …)

  // ══ 7) Rename two speakers for real — dialog trimmed to B + D via nth-child CSS (survives re-render,
  //       unlike DOM removal which each keystroke's re-render would restore), type real names, Save ══
  await clickLikeHuman(page, page.getByRole('button', { name: 'Speakers' }))
  await page.getByText('Rename speakers').waitFor({ state: 'visible', timeout: 10_000 })
  // Sorted speakerLabels are A,B,C,D,… so B = 2nd row, D = 4th row. Show only those two.
  await page.addStyleTag({ content: '[role="dialog"] .space-y-3.py-1 > div:not(:nth-child(2)):not(:nth-child(4)){display:none!important}' })
  await beat(page, TEMPO.beatShort)
  const inputB = page.locator('[role="dialog"] div.flex.items-center.gap-3', { has: page.getByText('Speaker B', { exact: true }) }).getByRole('textbox')
  const inputD = page.locator('[role="dialog"] div.flex.items-center.gap-3', { has: page.getByText('Speaker D', { exact: true }) }).getByRole('textbox')
  await typeLikeHuman(page, inputB, 'Prof. Sandel')
  await beat(page, TEMPO.beatShort)
  await typeLikeHuman(page, inputD, 'Anna Reyes')
  await beat(page, TEMPO.beatShort)
  await clickLikeHuman(page, page.getByRole('button', { name: 'Save names' }))
  await page.getByText('Prof. Sandel:', { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 })
  await beat(page, TEMPO.beatLong) // AFTER: the pane now reads "Prof. Sandel:" / "Anna Reyes:"

  // ══ 8) Timestamps view ══
  await clickLikeHuman(page, page.getByRole('button', { name: 'Timestamps' }))
  await beat(page, TEMPO.beatLong)

  // ══ 9) The AI summary — the caption transcript that carries the real 5-chapter summary (same title) ══
  await page.goto(`/dashboard/library/${SUM_ID}?tab=summary`)
  await page.getByText('AI Summary', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await moveMouseXY(page, 640, 220, 1)
  await beat(page, TEMPO.beatLong)

  // ══ 10) The Export menu (all formats) — back on the transcript tab, open the menu, don't click a file ══
  await clickLikeHuman(page, page.getByRole('tab', { name: 'Transcript' }).or(page.getByRole('button', { name: /^Transcript$/ })).first())
  await page.locator('.ProseMirror:visible').first().waitFor({ state: 'visible', timeout: 20_000 })
  await beat(page, TEMPO.beatShort)
  await clickLikeHuman(page, page.getByRole('button', { name: 'Export' }))
  await page.getByRole('menu').waitFor({ state: 'visible', timeout: 10_000 })
  await beat(page, TEMPO.beatLong)

  // Finalize the video.
  const video = page.video()
  await context.close()
  if (video) {
    await video.saveAs(OUT_FILE)
    await video.delete().catch(() => {})
  }
  // eslint-disable-next-line no-console
  console.log(`  ✔ ${path.relative(process.cwd(), OUT_FILE)}`)
})
