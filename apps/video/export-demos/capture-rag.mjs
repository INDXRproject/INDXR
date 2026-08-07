// Photograph the RAG retrieval demo (FASE 4). Loads the REAL justice.rag.json (60 chunks) into
// rag-demo.html, which runs a query and renders the best-matching chunk + its timestamp. Shoots light + dark.
// Run:  node apps/video/export-demos/capture-rag.mjs
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../../../')
const pw = await import(pathToFileURL(path.join(repoRoot, 'node_modules/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.js')).href)
const chromium = pw.chromium ?? pw.default?.chromium

const rag = JSON.parse(fs.readFileSync(path.join(here, 'fixture', 'justice.rag.json'), 'utf8'))
const pageUrl = pathToFileURL(path.join(here, 'rag-demo.html')).href

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 820, height: 640 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.addInitScript((r) => { window.__RAG__ = r }, rag)
await page.goto(pageUrl)
await page.waitForFunction(() => window.__ready === true)
await page.waitForTimeout(600) // webfonts

// Log the answer so we can verify a timestamped hit came back.
const answer = await page.evaluate(() => {
  const ts = document.querySelector('.ts')?.textContent
  const chunk = document.querySelector('.chunk')?.textContent
  const link = document.querySelector('.link')?.textContent
  return { ts, chunk, link }
})
console.log('  answer:', JSON.stringify(answer))

const card = page.locator('.card')
for (const theme of ['light', 'dark']) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(150)
  await card.screenshot({ path: path.join(here, `rag-demo-${theme}.png`) })
  console.log(`  ✔ rag-demo-${theme}.png`)
}
await browser.close()
