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
// Video-to-text article captures. The MP4 lives in the repo (docs/wiki/testing) so the upload
// captures are reproducible client-side (no cost); the transcript/subtitle captures read a REAL
// AI transcription of it, seeded once into account1's library (title = the filename). See
// screenshot-machine.md → "Video-to-text seed". Do NOT delete that library row.
const VIDEO_FILE = path.resolve(__dirname, '../../../docs/wiki/testing/What Brought Dave Chappelle Back - PowerfulJRE (360p).mp4')
const VIDEO_TRANSCRIPT_TITLE = 'What Brought Dave Chappelle' // substring to find the seeded upload row

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

// ── LIVE UI: empty Upload tab (accepted formats + size limit in view) ─────────
test('uploader-empty', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/transcribe?mode=audio')
  const hint = page.getByText('Drag and drop your file here', { exact: false })
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

// ── LIVE (opt-in, CAPTURE_PLAYLIST_RUN=1): a REAL ~8-video playlist run with one AI video, so all
// three credit kinds occur (free caption / paid caption / AI-per-minute). Shoots the three screens
// the machine was missing: the URL input + cost footer, the running card (per-video rows + counter),
// and the completion receipt. GATED because it spends real credits on account1 (internal). Fixture:
// TED-Ed uploads (short, well-captioned). See screenshot-machine.md → "Playlist run captures".
const PLAYLIST_RUN_URL = 'https://www.youtube.com/playlist?list=UUsooa4yRKGN_zEE8iknghZA'
test('playlist-run', async ({ page }) => {
  test.skip(process.env.CAPTURE_PLAYLIST_RUN !== '1', 'opt-in: spends real credits on a live playlist extraction')
  test.setTimeout(420_000)
  await prep(page)
  await page.goto('/dashboard/transcribe?mode=playlist')

  // (1) URL input + cost footer — empty field (placeholder) + the "First N caption videos free…" line,
  // cloned side by side into one clean frame.
  const input = page.getByPlaceholder('Paste YouTube Playlist URL...')
  await input.waitFor({ state: 'visible' })
  await page.getByText(/First \d+ caption videos free/).waitFor({ state: 'visible' })
  await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder="Paste YouTube Playlist URL..."]') as HTMLElement | null
    const inputRow = inp?.closest('div.flex') as HTMLElement | null
    const footSpan = [...document.querySelectorAll('span')].find((s) => /caption videos free/.test(s.textContent || ''))
    const footer = footSpan?.closest('div') as HTMLElement | null
    const holder = document.createElement('div')
    holder.id = '__plhold'
    holder.style.cssText = 'display:flex;flex-direction:column;gap:14px;width:600px;align-items:stretch'
    if (inputRow) holder.appendChild(inputRow.cloneNode(true))
    if (footer) holder.appendChild(footer.cloneNode(true))
    document.body.appendChild(holder)
  })
  await frameShot(page, page.locator('#__plhold'), 'playlist-url-input')
  await page.evaluate(() => document.getElementById('__plhold')?.remove())

  // Start the real run: fetch → trim the preselected 10 down to 8 → toggle the 5th video to AI → Extract.
  await input.fill(PLAYLIST_RUN_URL)
  await page.getByRole('button', { name: 'Fetch playlist' }).click()
  await page.getByRole('button', { name: /Review extraction/ }).waitFor({ state: 'visible', timeout: 120_000 })
  // Trim the preselected set toward 8: uncheck the last checked ROW checkbox until "N of M selected"
  // reads <= 8. Select-all reads aria-checked="mixed" when partial, so the "true" filter hits only
  // rows. A short settle between clicks avoids a re-render eating a click. An unreadable count defaults
  // to 99 (keep trimming) — NOT 0 (which would stop early and leave the full preselect).
  const counter = page.getByText(/\d+ of \d+ selected/).first()
  await counter.waitFor({ state: 'visible' })
  for (let guard = 0; guard < 12; guard++) {
    const label = await counter.textContent()
    const n = parseInt(label?.match(/(\d+)\s+of/)?.[1] ?? '99', 10)
    if (n <= 8) break
    const checkedRows = page.locator('[role="checkbox"][aria-checked="true"]')
    const c = await checkedRows.count()
    if (c === 0) break
    await checkedRows.nth(c - 1).click()
    await page.waitForTimeout(300)
  }
  await page.getByRole('button', { name: /Review extraction/ }).click()
  await page.getByRole('heading', { name: 'Before you start' }).waitFor({ state: 'visible', timeout: 30_000 })
  // 5th selected video (playlist index 4) → AI; it sits in the default 5 visible progress rows.
  await page.getByRole('button', { name: 'Use AI' }).nth(4).click()
  const extractBtn = page.getByRole('button', { name: /^Extract — \d+ credits$/ })
  await extractBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await extractBtn.click()

  // (2) Running card — freeze it at the AI-transcribing moment (captions all attempted by then).
  await page.getByText('Extracting playlist').waitFor({ state: 'visible', timeout: 30_000 })
  await Promise.race([
    page.getByText('Transcribing with AI').first().waitFor({ state: 'visible', timeout: 180_000 }),
    page.getByText(/[1-9] \/ 8/).first().waitFor({ state: 'visible', timeout: 180_000 }),
  ]).catch(() => {})
  const runCard = page.getByText('Runs in the background — safe to close this tab.')
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
  await runCard.waitFor({ state: 'visible' })
  await frameShot(page, runCard, 'playlist-progress')

  // (3) Completion + receipt.
  await page.getByRole('button', { name: 'Start new extraction' }).waitFor({ state: 'visible', timeout: 300_000 })
  await page.getByText('Charged', { exact: false }).first().waitFor({ state: 'visible', timeout: 40_000 }).catch(() => {})
  const doneCard = page.getByRole('button', { name: 'Start new extraction' })
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
  await frameShot(page, doneCard, 'playlist-complete')
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

// ── LIVE: the library as an ORGANISED archive (landing "Your library") — search box + Filters/Sort
// controls, a selected-collection chip, and rows carrying the collection badge. Selecting the seeded
// "Uploads from TED-Ed" collection (account1 seed) guarantees the chip + badges + a bounded row count.
test('library-organized', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library?collection=7f1ec96e-9f5e-4922-b869-5fbce7bd9d5b')
  await page.getByText('Collection:', { exact: false }).first().waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('a[href*="/dashboard/library/"]').first().waitFor({ state: 'visible', timeout: 20_000 })
  // The content column: h1 + controls + collection chip + rows. Clip to one screen (controls + a few
  // rows) rather than the full list.
  const col = page.locator('div.flex-1.space-y-0').first()
  await topShot(page, col, 'library-organized', 640)
})

// ── LIVE: a transcript open in the plain reading view (landing "What you get") — the Justice fixture
// has no diarisation, so it reads as clean paragraphs with timestamps (distinct from the speaker shot). ─
test('transcript-reader', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library')
  const row = page.locator('a[href*="/dashboard/library/"]', { hasText: 'Justice' })
  await row.first().waitFor({ state: 'visible', timeout: 20_000 })
  await row.first().click()
  const pane = page.locator('.ProseMirror:visible').first()
  await pane.waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByText('trolley', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await topShot(page, pane, 'transcript-reader', 640)
})

// ══ Video-to-text article captures (real MP4 upload; seeded real transcription) ══
// The four figures for /articles/video-to-text. #1/#2 set the real test MP4 client-side (no cost,
// the browser reads its 319 s duration → 6 credits). #3/#4 read the seeded real AI transcription
// of that same file (2 speakers, title = the filename). See screenshot-machine.md.

// ── LIVE UI: the upload tab with an MP4 added — accepted, mode strip (Audio tab) in view ──
test('video-upload-mp4', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/transcribe?mode=audio')
  await page.setInputFiles('input[type=file]', VIDEO_FILE)
  // File-added state: the filename heading replaces the empty "Upload a file" prompt.
  await page.getByRole('heading', { name: /Chappelle/ }).waitFor({ state: 'visible', timeout: 20_000 })
  // Frame the whole workbench card: Video/Playlist/Audio strip + the filled (green) dropzone + cost.
  const card = page.getByRole('tablist').locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
  await frameShot(page, card, 'video-upload-mp4')
})

// ── LIVE UI: the upload cost panel — filename, length, and credits before you start ──
test('video-cost-card', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/transcribe?mode=audio')
  await page.setInputFiles('input[type=file]', VIDEO_FILE)
  // Wait until the duration is read and the credit total is computed (not the fallback).
  const total = page.getByText('Total', { exact: true })
  await total.waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByText(/^\d+ credits?$/).first().waitFor({ state: 'visible', timeout: 20_000 })
  const cost = total.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
  await frameShot(page, cost, 'video-cost-card')
})

// ── LIVE: transcript reading pane WITH speaker labels — the real diarised JRE clip ──
test('video-transcript-speakers', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library')
  const row = page.locator('a[href*="/dashboard/library/"]', { hasText: VIDEO_TRANSCRIPT_TITLE })
  await row.first().waitFor({ state: 'visible', timeout: 20_000 })
  await row.first().click()
  await page.getByText('Speaker A:', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  const pane = page.locator('.ProseMirror:visible').first()
  // 74 segments would frame metres tall — clip to the first screenful (capture standard: shoot
  // compacter, don't clamp a full-height subject). cloneNode copies the inline style, so the frame
  // gets the clipped height; restore the live DOM afterwards.
  await pane.evaluate((el) => { el.style.maxHeight = '520px'; el.style.overflow = 'hidden' })
  await frameShot(page, pane, 'video-transcript-speakers')
  await pane.evaluate((el) => { el.style.maxHeight = ''; el.style.overflow = '' })
})

// ── LIVE: a real exported subtitle file (SRT) — the result, not the (too tall/narrow) menu ──
test('video-subtitles-srt', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library')
  const row = page.locator('a[href*="/dashboard/library/"]', { hasText: VIDEO_TRANSCRIPT_TITLE })
  await row.first().waitFor({ state: 'visible', timeout: 20_000 })
  await row.first().click()
  // Confirm the detail page is loaded (the library LIST has a per-row Export icon button on every
  // row, so locating Export before navigation completes hits 8 of them). Speaker text only exists
  // on the reading pane.
  await page.getByText('Speaker A:', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  const exportBtn = page.getByRole('button', { name: 'Export' })
  await exportBtn.waitFor({ state: 'visible', timeout: 20_000 })
  await exportBtn.click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: /^SRT/ }).click(),
  ])
  const srt = fs.readFileSync(await download.path(), 'utf8')
  // First cues → a readable block of the ACTUAL export (Netflix-segmented, HH:MM:SS,mmm timing,
  // in-budget "Speaker A/B:" prefixes). Rendered in a token-styled block so it reads as the file.
  const snippet = srt.split(/\r?\n\r?\n/).filter(Boolean).slice(0, 6).join('\n\n')
  await page.evaluate((text) => {
    document.getElementById('__srtblock')?.remove()
    const pre = document.createElement('pre')
    pre.id = '__srtblock'
    pre.textContent = text
    Object.assign(pre.style, {
      margin: '0', padding: '20px 24px', width: '560px', boxSizing: 'border-box',
      background: 'var(--surface)', color: 'var(--fg)',
      border: '1px solid var(--border)', borderRadius: '10px',
      fontFamily: 'var(--font-ibm-plex-mono, ui-monospace, monospace)',
      fontSize: '12.5px', lineHeight: '1.55', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    })
    document.body.appendChild(pre)
  }, snippet)
  await frameShot(page, page.locator('#__srtblock'), 'video-subtitles-srt')
  await page.evaluate(() => document.getElementById('__srtblock')?.remove())
})

// ── LIVE: the export menu OPEN, showing the format list — moment-5 asset for the home-clip video.
// Unlike frameShot's clone-into-frame, a Radix dropdown is portalled to <body> and absolutely
// positioned, so we shoot the LIVE [role=menu] element itself (not the page). Re-theming via
// setTheme keeps the menu open (no outside click), and the portal is a descendant of <html>, so
// [data-theme] restyles it live. No menuitem is clicked → no download, no credit. ──
test('export-menu', async ({ page }) => {
  await prep(page)
  await page.goto('/dashboard/library')
  const row = page.locator('a[href*="/dashboard/library/"]', { hasText: VIDEO_TRANSCRIPT_TITLE })
  await row.first().waitFor({ state: 'visible', timeout: 20_000 })
  await row.first().click()
  // Same guard as video-subtitles-srt: the list has a per-row Export button, so wait for the detail
  // pane (speaker text only exists there) before locating the single Export control.
  await page.getByText('Speaker A:', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  const exportBtn = page.getByRole('button', { name: 'Export' })
  await exportBtn.waitFor({ state: 'visible', timeout: 20_000 })
  await exportBtn.click()
  const menu = page.getByRole('menu')
  await menu.waitFor({ state: 'visible', timeout: 10_000 })

  // Menu position (fractions of a 1280x720 frame) — the home-clip's beat 5 zooms the full page INTO
  // this rect, so it needs the coordinates. Logged for the composition to hardcode.
  const rect = await menu.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  console.log('  EXPORT-PAGE menu rect px (in 1280x800 viewport):', JSON.stringify(rect))

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    await page.waitForTimeout(150)
    // Full viewport (1280x800): the transcript screen with the Export button AND the whole open menu.
    // beat 5 renders this (objectFit contain) and zooms into the menu — no separate motion still.
    await page.screenshot({ path: path.join(OUT, `export-page-${theme}.png`), clip: { x: 0, y: 0, width: 1280, height: 800 } })
    // Tight crop of the menu (kept as a standalone docs asset).
    await menu.screenshot({ path: path.join(OUT, `export-menu-${theme}.png`) })
  }

  await page.keyboard.press('Escape')
  await setTheme(page, 'light')
  console.log('  ✔ export-page-{light,dark}.png + export-menu-{light,dark}.png')
})

// ══ AI summary captures (real generated summary of the seeded Justice lecture) ══
// The figures for /articles (summaries). Read a REAL AI summary (ADR-090: overview + chapters, each
// with a clickable timestamp) generated on the seeded Justice transcript (videoId → amber timestamps).
// See screenshot-machine.md → "AI-summary seed". Do NOT delete that summary/transcript.
// FROZEN FIXTURE (2026-08-25): this summary feeds the three captures below — it must NEVER be
// regenerated for a proof or a measurement (doing so silently ages these screenshots; it has bitten
// us three times). For length/quality experiments use a THROWAWAY transcript, not this one. Frozen
// state: 5 chapters, 3632-word summary vs 6987-word transcript (52%), 54:42. The transcript is from
// YouTube captions (0 credits — free); the SUMMARY costs 6 credits (calculate_summary_cost(3282)). NOT
// the 1-cr/min AI-transcription price. Full numbers: docs/wiki/content/summary-example-justice.md. See LESSONS.
const SUMMARY_TRANSCRIPT_ID = '0798fa30-8056-4343-9e02-c50d93c00e4a' // Justice lecture (kBdfcR-8hEY)

// Frame a TALL subject and shoot only its top `heightCss` px, in both themes. Unlike frameShot's
// clone+maxHeight (a React re-render wipes an inline maxHeight on the live card), this builds the same
// centred frame at the viewport origin and uses page.screenshot({clip}) — a fixed viewport region —
// so the height is guaranteed regardless of the cloned content's own height. The bottom edge is a
// clean cut (the subject continues below), which is the capture standard for a disproportionate one.
async function topShot(page: Page, subject: Locator, name: string, heightCss: number) {
  await subject.scrollIntoViewIfNeeded().catch(() => {})
  await subject.evaluate((node, { FRAME_W, PAD }) => {
    document.getElementById('__capframe')?.remove()
    const wrap = document.createElement('div')
    wrap.id = '__capframe'
    Object.assign(wrap.style, {
      position: 'fixed', left: '0px', top: '0px', zIndex: '2147483647',
      width: FRAME_W + 'px', boxSizing: 'border-box', padding: PAD + 'px',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px',
      overflow: 'hidden',
    })
    const clone = node.cloneNode(true) as HTMLElement
    clone.style.margin = '0'; clone.style.maxWidth = '100%'; clone.style.flex = '0 1 auto'
    wrap.appendChild(clone)
    document.body.appendChild(wrap)
  }, { FRAME_W, PAD })
  await page.locator('#__capframe').waitFor({ state: 'visible' })
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    await page.waitForTimeout(150)
    await page.screenshot({ path: path.join(OUT, `${name}-${theme}.png`), clip: { x: 0, y: 0, width: FRAME_W, height: heightCss } })
  }
  await page.evaluate(() => document.getElementById('__capframe')?.remove())
  await setTheme(page, 'light')
  console.log(`  ✔ ${name}-{light,dark}.png`)
}

// ── LIVE: the summary overview + the chapter list beneath it (clipped to one screen) ──
test('summary-overview', async ({ page }) => {
  await prep(page)
  await page.goto(`/dashboard/library/${SUMMARY_TRANSCRIPT_ID}?tab=summary`)
  await page.getByText('AI Summary', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  const card = page.locator('#ai-summary .rounded-xl').first()
  await card.waitFor({ state: 'visible' })
  // 1794 words would frame metres tall — show the overview + the first chapter heading + timestamp.
  await topShot(page, card, 'summary-overview', 720)
})

// ── LIVE: one chapter — heading, its clickable timestamp, and the worked-out notes ──
test('summary-chapter', async ({ page }) => {
  await prep(page)
  await page.goto(`/dashboard/library/${SUMMARY_TRANSCRIPT_ID}?tab=summary`)
  const section = page.locator('#ai-summary section').first()
  await section.waitFor({ state: 'visible', timeout: 30_000 })
  await topShot(page, section, 'summary-chapter', 560)
})

// ── LIVE: the summary EDIT mode — tab strip (Edited summary active), the editor with its formatting
//    toolbar, and the seeded chapters WITH timestamps. Seeded from the generated summary; nothing is
//    saved, so the fixture row keeps no edit (no demo text left in production). ──
test('summary-edit', async ({ page }) => {
  await prep(page)
  await page.goto(`/dashboard/library/${SUMMARY_TRANSCRIPT_ID}?tab=summary_edited`)
  // Editor mounts client-side (immediatelyRender:false) and seeds from the generated summary.
  await page.getByText('AI Summary — edited', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.locator('.ProseMirror:visible').first().waitFor({ state: 'visible' })
  await page.getByRole('heading', { name: 'Overview' }).first().waitFor({ state: 'visible' })
  // Frame from the tab strip down through the editor, so the active "Edited summary" tab, the toolbar
  // and a timestamped chapter heading all land in one shot.
  const container = page.locator('[role="tablist"]').first().locator('xpath=ancestor::div[contains(@class,"flex-col")][1]')
  // Tall on purpose: the overview sits between the toolbar and the first chapter, so the frame must
  // reach past it to land a timestamped chapter heading ([0:00] …) in the same shot. page.screenshot's
  // clip is clamped to the viewport, so grow the viewport height first (width/scale unchanged).
  await page.setViewportSize({ width: 1280, height: 1460 })
  await page.waitForTimeout(150)
  await topShot(page, container, 'summary-edit', 1320)
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
