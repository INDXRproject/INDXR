// Photograph the SRT-as-subtitles demo (FASE 4). Loads the REAL justice.srt into srt-demo.html,
// seeks to a cue, and shoots the player card in light + dark.
// Run:  NODE_PATH=<repo>/node_modules/.pnpm/node_modules node apps/video/export-demos/capture-srt.mjs
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
// ESM ignores NODE_PATH, and @playwright/test isn't at repo-root node_modules (pnpm hoists to .pnpm),
// so resolve it by absolute path from this file's location (../../../ = repo root).
const repoRoot = path.resolve(here, '../../../')
const pw = await import(pathToFileURL(path.join(repoRoot, 'node_modules/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.js')).href)
const chromium = pw.chromium ?? pw.default?.chromium
const srt = fs.readFileSync(path.join(here, 'fixture', 'justice.srt'), 'utf8')
const pageUrl = pathToFileURL(path.join(here, 'srt-demo.html')).href
const SEEK = 35.5 // cue 3: "This is a course about Justice and we begin…"

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 900, height: 680 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.addInitScript((s) => { window.__SRT__ = s }, srt)
await page.goto(pageUrl)
await page.waitForFunction(() => window.__ready === true)
await page.waitForTimeout(600) // let webfonts settle
await page.evaluate((t) => window.__seekTo(t), SEEK)
await page.waitForTimeout(300)

const card = page.locator('.card')
for (const theme of ['light', 'dark']) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(150)
  await card.screenshot({ path: path.join(here, `srt-demo-${theme}.png`) })
  console.log(`  ✔ srt-demo-${theme}.png`)
}
await browser.close()
