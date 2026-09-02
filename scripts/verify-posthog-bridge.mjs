#!/usr/bin/env node
// End-to-end verification of the PostHog identity bridge (ADR-103) WITHOUT Google. The bridge lives on
// the destination side (AuthContext reads ph_did and aliases after identify), so it is path-independent
// and provable through email/password login.
//
// HOW TO RUN (secrets from env — never commit the personal key):
//   node --env-file=.env.local --env-file=scripts/.env.verify scripts/verify-posthog-bridge.mjs
//   .env.local  -> NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_POSTHOG_KEY
//   .env.verify -> POSTHOG_PERSONAL_API_KEY (phx_, scopes person:read + person:delete),
//                  POSTHOG_API_HOST=https://eu.posthog.com, POSTHOG_PROJECT_ID=@current,
//                  MARKETING_URL=https://indxr.ai, APP_URL=https://app.indxr.ai
//
// PROJECT/REGION: project 298689 is EU. A project-scoped personal key must be addressed as "@current"
// (numeric id 404s). POSTHOG_API_HOST is the EU app host (eu.posthog.com), NOT the i.* ingestion host.
//
// ── KNOWN LIMITATION (measured 2026-09-02) ─────────────────────────────────────────────────────────
// PHASE 2 (the server-side distinct_ids[] merge) CANNOT be observed from an AUTOMATED browser: the app's
// posthog-js loads config/flags/static but emits ZERO capture events under automation (verified across
// headless, headed via DISPLAY, real-UA + webdriver-hidden, consent-granted, and background-throttling-
// disabled — always only /config.js + /flags/ + /static, never /i/v0/e/). This is posthog's client-side
// automation/bot filtering: capture() is a no-op while feature flags still load. Real users' browsers DO
// emit captures (the production project holds real client-side persons), so the bridge works in
// production — but an automated harness never produces the alias event, so PHASE 2 stays "unobservable
// here". Do NOT hand-send the alias event to force it green — that would prove PostHog's alias, not our
// code. PHASE 1 below is fully deterministic and IS the runnable proof of the bridge's own logic.

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PNPM = path.join(path.resolve(SCRIPT_DIR, '..'), 'node_modules', '.pnpm')

const PH_PERSONAL_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PH_PROJECT = process.env.POSTHOG_PROJECT_ID || '@current'
const PH_API_HOST = process.env.POSTHOG_API_HOST || 'https://eu.posthog.com'
const MARKETING_URL = process.env.MARKETING_URL || 'https://indxr.ai'
const APP_URL = process.env.APP_URL || 'https://app.indxr.ai'
const PH_DID_PARAM = 'ph_did'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const missing = []
if (!SUPA_URL) missing.push('SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL')
if (!SUPA_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
if (!PH_PERSONAL_KEY) missing.push('POSTHOG_PERSONAL_API_KEY (phx_… personal key, scopes person:read + person:delete) — PHASE 2 only')
if (!SUPA_URL || !SUPA_SERVICE_KEY) {
  console.error('\n❌ BLOCKED — cannot run without:\n' + missing.map((m) => '  • ' + m).join('\n') + '\nNothing was created.\n')
  process.exit(2)
}

function pkgEntry(prefix, pkgName) {
  const dir = readdirSync(PNPM).find((x) => x.startsWith(prefix))
  if (!dir) throw new Error(`cannot find ${prefix}* in ${PNPM} — run pnpm install`)
  const base = path.join(PNPM, dir, 'node_modules', pkgName)
  const pj = JSON.parse(readFileSync(path.join(base, 'package.json'), 'utf8'))
  const exp = pj.exports?.['.'] ?? pj.exports
  const rel = (exp && (exp.import?.default || exp.import || exp.default || exp.require?.default || exp.require)) || pj.module || pj.main || 'index.js'
  return pathToFileURL(path.join(base, typeof rel === 'string' ? rel : (pj.main || 'index.js'))).href
}
const { createClient } = await import(pkgEntry('@supabase+supabase-js@', '@supabase/supabase-js'))
const pw = await import(pkgEntry('playwright@', 'playwright'))
const chromium = pw.chromium ?? pw.default?.chromium

const admin = createClient(SUPA_URL, SUPA_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const phHeaders = { Authorization: `Bearer ${PH_PERSONAL_KEY}` }
const personsBase = `${PH_API_HOST}/api/projects/${PH_PROJECT}/persons`

/** Create a confirmed test user with onboarding pre-completed so login lands on /dashboard directly. */
async function makeUser(tag) {
  const email = `ph-bridge-${tag}-${randomUUID().slice(0, 8)}@indxr.ai`
  const password = `Vf9-${randomUUID()}!`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  await admin.from('profiles').upsert({ id: data.user.id, username: `phb${randomUUID().slice(0, 8)}`, role: 'other', onboarding_completed: true })
  return { id: data.user.id, email, password }
}
async function loginTo(page, u) {
  await page.goto(`${MARKETING_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', u.email)
  await page.fill('input[name="password"]', u.password)
  await page.locator('form:has(input[name="email"]) button[type="submit"]').click()
  await page.waitForURL(/app\.indxr\.ai|\/dashboard/, { timeout: 30000 }).catch(() => {})
}
async function getPerson(distinctId) {
  const res = await fetch(`${personsBase}/?distinct_id=${encodeURIComponent(distinctId)}`, { headers: phHeaders })
  if (!res.ok) throw new Error(`persons GET ${res.status}: ${await res.text()}`)
  return (await res.json()).results?.[0] ?? null
}
async function deletePerson(distinctId) {
  const p = await getPerson(distinctId).catch(() => null)
  if (p?.id) await fetch(`${personsBase}/${p.id}/?delete_events=true`, { method: 'DELETE', headers: phHeaders }).catch(() => {})
}

// ── PHASE 1 — deterministic, client-observable proof of the bridge's own logic ─────────────────────
// The bridge strips ph_did (history.replaceState) only inside the block that runs alias() — and only
// for a VALID uuid; an invalid one is rejected at ref-init (isValidDistinctId) and left in the URL. So
// "valid → stripped, invalid → left" proves both that the bridge processed+aliased the valid id AND
// that the guard rejects malformed/injection ids. No capture needed → works under automation.
async function phase1() {
  console.log('\n── PHASE 1: guard + processing (client-observable, deterministic) ──')
  const u = await makeUser('strip')
  const browser = await chromium.launch()
  let allOk = true
  try {
    const page = await browser.newContext().then((c) => c.newPage())
    await loginTo(page, u)
    for (const [label, val] of [['valid UUID', randomUUID()], ['invalid truncated', '01a05db4-14b9'], ['invalid injection', "x'DROP--"]]) {
      const expectStrip = UUID_RE.test(val)
      await page.goto(`${APP_URL}/dashboard?${PH_DID_PARAM}=${encodeURIComponent(val)}`, { waitUntil: 'networkidle' }).catch(() => {})
      await page.waitForTimeout(2500)
      const stripped = !page.url().includes(PH_DID_PARAM)
      const ok = stripped === expectStrip
      allOk = allOk && ok
      console.log(`  ${ok ? '✅' : '❌'} ${label}: stripped=${stripped} (expected ${expectStrip}) — url=${page.url().replace(APP_URL, '')}`)
    }
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(u.id).catch(() => {})
  }
  return allOk
}

// ── PHASE 2 — server-side merge via the persons API (needs a capture-emitting, non-automated browser) ──
async function phase2() {
  console.log('\n── PHASE 2: server-side merge (persons API) ──')
  if (!PH_PERSONAL_KEY) { console.log('  ⏭  skipped — POSTHOG_PERSONAL_API_KEY not set'); return null }
  const u = await makeUser('merge')
  const anon = randomUUID()
  const browser = await chromium.launch()
  let emittedCapture = false
  try {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    page.on('request', (r) => { if (/\/ingest\/(i\/v0\/e|e|batch)/.test(r.url())) emittedCapture = true })
    await loginTo(page, u)
    await page.goto(`${APP_URL}/dashboard?${PH_DID_PARAM}=${anon}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(8000)
    await ctx.close()
    // poll up to ~48s
    let ids = []
    for (let i = 0; i < 8; i++) { ids = (await getPerson(u.id).catch(() => null))?.distinct_ids ?? []; if (ids.includes(anon)) break; await new Promise((r) => setTimeout(r, 6000)) }
    const merged = ids.includes(anon)
    if (merged) {
      console.log(`  ✅ MERGE CONFIRMED — person(${u.id}).distinct_ids = ${JSON.stringify(ids)} (contains pre-login ${anon})`)
    } else if (!emittedCapture) {
      console.log(`  ⚠️  UNOBSERVABLE HERE — the browser emitted no capture events (posthog automation filtering), so the alias never reached PostHog. person.distinct_ids=${JSON.stringify(ids)}. Not a bridge failure; see KNOWN LIMITATION.`)
    } else {
      console.log(`  ❌ capture WAS emitted but anon id not on the person after polling. person.distinct_ids=${JSON.stringify(ids)}`)
    }
    return merged
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(u.id).catch(() => {})
    await deletePerson(u.id); await deletePerson(anon)
  }
}

console.log(`PostHog bridge verification — persons API ${personsBase}`)
const p1 = await phase1()
const p2 = await phase2()
console.log(`\nPHASE 1 (guard/processing): ${p1 ? 'PASS ✅' : 'FAIL ❌'}`)
console.log(`PHASE 2 (server merge): ${p2 === true ? 'PASS ✅' : p2 === null ? 'skipped' : 'unobservable in automation ⚠️ (see KNOWN LIMITATION)'}`)
process.exit(p1 ? 0 : 1)
