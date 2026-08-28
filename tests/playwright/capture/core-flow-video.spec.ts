/**
 * Core-flow VIDEO capture (NOT a functional test). Records the product doing the one thing it's for:
 * a YouTube link lands in the field → the method is chosen → extraction starts → the transcript
 * appears. AI transcription is used so the progress PHASES show, but the backend is STUBBED so the run
 * is deterministic and spends no credits (a real run would burn 55). Title + duration are the fixture's.
 *
 * Legal note (FASE 0 — ADR): the youtube.com page is never shown. The clip starts inside our own input
 * field where the link is pasted; only our product's UI is on screen. YouTube's brand rules require
 * prior approval to feature their interface in marketing, so we don't.
 *
 * Run (ONE command):
 *   BASE_URL=https://app.indxr.ai NODE_PATH=node_modules/.pnpm/node_modules \
 *     node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
 *     test --config=playwright.video.config.ts
 *
 * Output: tests/playwright/capture/recordings/core-flow.webm (overwritten each run). The stubs
 * (page.route) intercept before the network, so this runs against the LIVE app the same way the
 * screenshot machine does — the real UI, a deterministic backend.
 */
import { test, type Route } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { installCursor, clickLikeHuman, typeLikeHuman, moveMouseXY, beat, TEMPO } from './video-helpers'

const STORAGE_STATE = path.resolve(__dirname, 'capture-state.json')
const OUT_DIR = path.resolve(__dirname, 'recordings')
// CAPTURE_THEME=dark records the SAME flow in dark mode → core-flow-dark.webm, the sibling of the
// light core-flow.webm. Default is light, so the existing one-command run is byte-for-byte unchanged.
const THEME: 'light' | 'dark' = process.env.CAPTURE_THEME === 'dark' ? 'dark' : 'light'
const OUT_FILE = path.join(OUT_DIR, THEME === 'dark' ? 'core-flow-dark.webm' : 'core-flow.webm')

// The fixture, kBdfcR-8hEY — "Justice: What's The Right Thing To Do? Episode 01" (Harvard University).
// Duration 3296 s → ceil(3296/60) = 55 credits (product-truth §8). We type the real watch URL into our
// own field; we never navigate to it.
const VIDEO_URL = 'https://www.youtube.com/watch?v=kBdfcR-8hEY'
const FIXTURE_TITLE = "Justice: What's The Right Thing To Do? — Episode 01"
const FIXTURE_DURATION = 3296

// The transcript that "appears" is the fixture's REAL opening captions — verbatim from the generated
// homepage samples (apps/marketing/src/lib/homeExportSamples.ts, SRT cues 3–5). Nothing invented.
const SEGMENTS = [
  { offset: 33.509, duration: 4.241, text: 'This is a course about Justice and we begin with a story' },
  { offset: 37.750, duration: 6.890, text: "suppose you're the driver of a trolley car, and your trolley car is hurdling down the track at sixty miles an hour" },
  { offset: 44.640, duration: 4.750, text: 'and at the end of the track you notice five workers working on the track' },
]

const VIEW = { width: 1280, height: 720 }

test('core-flow', async ({ browser }) => {
  test.setTimeout(180_000)
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

  // Pin the chosen theme before first paint (matches the still machine); the ThemeProvider reads
  // localStorage 'theme', so setting it here in an init script beats the storageState's light value.
  await page.addInitScript((theme) => {
    try { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme) } catch {}
  }, THEME)

  // ── Deterministic backend (page.route intercepts before the network) ─────────
  // Metadata → fixture title + duration, so the cost card reads the fixture's 55 credits.
  await page.route('**/api/video/metadata/**', (r) =>
    r.fulfill({ json: { duration: FIXTURE_DURATION, title: FIXTURE_TITLE } }))
  // Starting the job returns a stub id; the poll below carries it through the phases.
  await page.route('**/api/transcribe/whisper', (r) =>
    r.fulfill({ json: { job_id: 'stub-core-flow', status: 'pending' } }))
  // The "you already have this transcript" duplicate check is a client-side Supabase query
  // (transcripts?video_id=eq.…). account1 owns the fixture, so it would flash that banner mid-flow.
  // Return empty for exactly that lookup so the recording plays the clean first-time path.
  await page.route('**/rest/v1/transcripts**', async (route) => {
    if (route.request().url().includes('video_id=eq.')) {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: '[]' })
    } else {
      await route.continue()
    }
  })

  // Phase timeline driven by WALL-CLOCK since the first poll — robust to multiple pollers and to the
  // polling backoff (every poller sees the same phase for a given moment). ~8 s end to end.
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
      body = {
        status: 'complete', duration_seconds: FIXTURE_DURATION, credits_cost: 55,
        transcript_id: 'stub-core-flow-transcript', channel: 'Harvard University', language: 'en',
        transcript: SEGMENTS,
      }
    }
    await route.fulfill({ json: body })
  })

  // ── Drive the flow, human tempo ──────────────────────────────────────────────
  await page.goto('/dashboard/transcribe')
  await page.waitForLoadState('networkidle').catch(() => {})
  // Rest the cursor at a neutral spot, then let the empty page breathe.
  await moveMouseXY(page, 220, 170, 1)
  await beat(page, TEMPO.beatLong)

  // 1) The link lands in the field.
  const urlField = page.getByPlaceholder('https://www.youtube.com/watch?v=...')
  await typeLikeHuman(page, urlField, VIDEO_URL)
  await beat(page, TEMPO.beatLong)

  // 2) The method is chosen — AI transcription (so the phases show).
  await clickLikeHuman(page, page.getByRole('radio', { name: /AI transcription/ }))
  await beat(page, TEMPO.beatShort)

  // 3) Extraction starts: first Extract → cost card, then the priced confirm.
  await clickLikeHuman(page, page.getByRole('button', { name: /Extract|Checking/ }))
  const priced = page.getByRole('button', { name: /^Extract — \d+\+? credits$/ })
  await priced.waitFor({ state: 'visible', timeout: 20_000 })
  await beat(page, TEMPO.beatLong) // let the viewer read the 55-credit cost card
  await clickLikeHuman(page, priced)

  // 4) The phases play out (Downloading audio → Transcribing → Saving), then the transcript appears.
  await page.getByText('Downloading audio', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  // TranscriptCard renders once transcript segments arrive on the 'complete' poll.
  await page.getByText(SEGMENTS[0].text, { exact: false }).waitFor({ state: 'visible', timeout: 30_000 })
  await beat(page, TEMPO.beatLong)
  await beat(page, TEMPO.beatLong) // hold on the result

  // Finalize the video: close the context, then save the finished file to a stable path.
  const video = page.video()
  await context.close()
  if (video) {
    await video.saveAs(OUT_FILE)
    await video.delete().catch(() => {})
  }
  // eslint-disable-next-line no-console
  console.log(`  ✔ ${path.relative(process.cwd(), OUT_FILE)}`)
})
