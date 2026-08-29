/**
 * Home-clip VIDEO capture (NOT a functional test). Records the product story as ONE continuous, real,
 * scripted run — the same machine that makes core-flow.webm, extended end to end:
 * paste → choose AI → downloading → transcribing → saving → Transcript ready → click "View in Library"
 * → the library list (Justice on top) → open it → the diarised reading pane → rename two speakers in one
 * fluid gesture (only the two show, no flash of the others) → the renamed labels move through the running
 * text → Timestamps → the Export menu, on the SAME transcript with the speakers still visible. Real
 * navigation, real clicks on LIVE element boxes (no reused fractions), a visible cursor (installCursor),
 * NO zoom anywhere. Every screen is full in view. NO summary step in this version. The brand intro/outro
 * frames are added to the final mp4 with ffmpeg (not recorded here).
 *
 * Deterministic + free: the transcribe backend is STUBBED (metadata/whisper/jobs + the dedup query), so
 * the run spends no credits. Library/viewer/rename/timestamps/export all use the REAL diarised Justice AI
 * transcript (AI_ID, 14 speakers). The rename writes speaker_names; the runner reverts it (and the
 * library-top-row created_at seed) afterwards.
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
const AI_ID = '9d072903-15d7-4722-9140-d64ee3efad59'   // diarised AI transcript (14 speakers) → viewer/rename/timestamps/export
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
  // recordVideo starts at page creation; t0 anchors the assembly's trims to the recording clock.
  const t0 = Date.now()
  const marks: Record<string, number> = {}
  await installCursor(page)
  await page.addInitScript((theme) => {
    try { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme) } catch {}
  }, THEME)
  // Cover ONLY the first page load with a solid theme-bg splash, so the credit balance loading from 0→N
  // is never on screen. It's torn down (window.__revealApp) once the real balance is painted; a
  // sessionStorage flag keeps it to the first load, so later navigations (the library fetch, #3) show
  // their own real loading. Colour = the theme's --bg (light/dark), so it flows from the brand intro.
  const SPLASH_BG = THEME === 'dark' ? 'oklch(0.165 0.008 70)' : 'oklch(0.985 0.004 70)'
  await page.addInitScript((bg) => {
    try { if (sessionStorage.getItem('__splashDone')) return } catch { return }
    const add = () => {
      if (document.getElementById('__splash') || !document.documentElement) return
      const o = document.createElement('div')
      o.id = '__splash'
      o.style.cssText = `position:fixed;inset:0;z-index:2147483645;background:${bg};`
      document.documentElement.appendChild(o)
    }
    ;(window as unknown as { __revealApp: () => void }).__revealApp = () => {
      document.getElementById('__splash')?.remove()
      try { sessionStorage.setItem('__splashDone', '1') } catch {}
    }
    add()
    document.addEventListener('DOMContentLoaded', add)
  }, SPLASH_BG)

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

  // ══ 1) Open the workbench — but only reveal it once the credit balance has REALLY loaded (its real
  //       value is present, not the 0 placeholder), so the 0→N flash never shows on screen. ══
  await page.goto('/dashboard/transcribe')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=...').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction(() => {
    const el = document.querySelector('a[aria-label$="credits — buy more"]')
    const m = el?.getAttribute('aria-label')?.match(/^(\d+) credits/)
    return !!m && parseInt(m[1], 10) > 0
  }, { timeout: 15_000 }).catch(() => {})
  await page.evaluate(() => (window as unknown as { __revealApp?: () => void }).__revealApp?.())
  marks.reveal_ms = Date.now() - t0 // the splash is torn down here → the assembly trims everything before it
  await moveMouseXY(page, 220, 170, 1)
  await beat(page, TEMPO.beatLong)

  // ══ 2) The link lands in the field — filled in one go (a real action on the real field, without the
  //       time a character-by-character type would cost). ══
  const urlField = page.getByPlaceholder('https://www.youtube.com/watch?v=...')
  await clickLikeHuman(page, urlField, 120)
  await urlField.fill(VIDEO_URL)
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

  // ══ 5) Click "View in Library" (real <a href="/dashboard/library">). The library then shows a real
  //       loading step; the assembly caps how much of it is on screen to ≤0.5 s (libnav → liblist). ══
  await clickLikeHuman(page, page.getByRole('link', { name: 'View in Library' }))
  marks.libnav_ms = Date.now() - t0
  await page.waitForURL('**/dashboard/library', { timeout: 20_000 })
  await page.locator('a[href*="/dashboard/library/"]').first().waitFor({ state: 'visible', timeout: 20_000 })
  marks.liblist_ms = Date.now() - t0
  await beat(page, TEMPO.beatLong)

  // ══ 6) The library list — Justice is the seeded top row → open it ══
  const justiceRow = page.locator('a[href*="/dashboard/library/"]', { hasText: 'Justice' }).first()
  await justiceRow.waitFor({ state: 'visible', timeout: 20_000 })
  await clickLikeHuman(page, justiceRow)
  await page.locator('.ProseMirror:visible').first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByText('Speaker B:', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await beat(page, TEMPO.beatLong) // BEFORE: the diarised reading pane (Speaker A:/B: …)

  // ══ 7) Rename FOUR speakers in one fluid gesture — the professor (B) plus three students with real,
  //       multi-sentence contributions (D, E, K). Two would under-sell the diarisation; all fourteen
  //       would be noise (eight are one-word "Yes."/"What?" speakers with no meaningful name). Hide every
  //       OTHER detected-speaker row BEFORE the dialog opens, so only these four ever show (no flash),
  //       then type straight through all four. Sorted labels A,B,C,D,E,…,K → rows 2,4,5,11.
  await page.addStyleTag({ content: '[role="dialog"] .space-y-3.py-1 > div:not(:nth-child(2)):not(:nth-child(4)):not(:nth-child(5)):not(:nth-child(11)){display:none!important}' })
  await clickLikeHuman(page, page.getByRole('button', { name: 'Speakers' }))
  await page.getByText('Rename speakers').waitFor({ state: 'visible', timeout: 10_000 })
  await beat(page, TEMPO.beatShort)
  const NAMES: [string, string][] = [['Speaker B', 'Prof. Sandel'], ['Speaker D', 'Anna Reyes'], ['Speaker E', 'Marcus Lee'], ['Speaker K', 'Priya Shah']]
  for (const [label, name] of NAMES) {
    const input = page.locator('[role="dialog"] div.flex.items-center.gap-3', { has: page.getByText(label, { exact: true }) }).getByRole('textbox')
    await typeLikeHuman(page, input, name)
  }
  await beat(page, TEMPO.beatShort)
  await clickLikeHuman(page, page.getByRole('button', { name: 'Save names' }))
  await page.getByText('Prof. Sandel:', { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 })
  await beat(page, TEMPO.beatLong) // the professor's paragraphs now read "Prof. Sandel:"
  // Show the effect in the RUNNING text: the professor is already at the top; smooth-scroll to each of the
  // three renamed students in turn so all four new names appear in the flowing transcript.
  for (const name of ['Anna Reyes', 'Marcus Lee', 'Priya Shah']) {
    const lbl = page.getByText(`${name}:`, { exact: false }).first()
    await lbl.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {})
    await lbl.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })).catch(() => {})
    await beat(page, TEMPO.beatLong)
  }

  // ══ 8) Timestamps view — same transcript ══
  await clickLikeHuman(page, page.getByRole('button', { name: 'Timestamps' }))
  await beat(page, TEMPO.beatLong)

  // ══ 9) The Export menu (all formats) — SAME transcript, speakers still visible. Open the menu only;
  //       do NOT click a format (no download) and do NOT click Edit (it stays a visible option). ══
  await clickLikeHuman(page, page.getByRole('button', { name: 'Export' }))
  await page.getByRole('menu').waitFor({ state: 'visible', timeout: 10_000 })
  await beat(page, TEMPO.beatLong)

  // Finalize the video + the trim marks the assembly reads (splash removal + library-load cap).
  const video = page.video()
  await context.close()
  if (video) {
    await video.saveAs(OUT_FILE)
    await video.delete().catch(() => {})
    fs.writeFileSync(OUT_FILE.replace(/\.webm$/, '.timings.json'), JSON.stringify(marks))
  }
  // eslint-disable-next-line no-console
  console.log(`  ✔ ${path.relative(process.cwd(), OUT_FILE)}  marks=${JSON.stringify(marks)}`)
})
