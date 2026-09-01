#!/usr/bin/env node
// End-to-end proof of the PostHog identity bridge (ADR-103) WITHOUT Google — the login and email-
// verification paths, which is where the bridge actually lives (AuthContext reads ph_did and aliases
// after identify; that is path-independent). Proves the real success criterion: one PostHog person whose
// distinct_ids[] contains BOTH the pre-login anonymous UUID AND the user-id.
//
// STATUS: written but NOT yet executed — it is BLOCKED on a PostHog personal API key (see gate below).
// It is intentionally gated so that running it without that key creates NOTHING in production.
//
// Run (once the key exists):
//   POSTHOG_PERSONAL_API_KEY=phx_...            # personal key, scopes: person:read AND person:delete
//   POSTHOG_PROJECT_ID=298689
//   POSTHOG_API_HOST=https://eu.posthog.com     # CONFIRM region — see note below
//   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...
//   MARKETING_URL=https://indxr.ai  APP_URL=https://app.indxr.ai
//   node scripts/verify-posthog-bridge.mjs
//
// REGION NOTE: the repo config is inconsistent — apps/*/.env.local has NEXT_PUBLIC_POSTHOG_HOST=
// https://us.i.posthog.com, but PostHogProvider hardcodes ui_host https://eu.posthog.com and next.config
// defaults to https://eu.i.posthog.com. The persons API must hit the region the project (298689) actually
// lives in. Confirm in the PostHog UI (Project settings) and set POSTHOG_API_HOST accordingly
// (eu.posthog.com or us.posthog.com — the app/UI host, not the i.* ingestion host).

const REQUIRED = {
  POSTHOG_PERSONAL_API_KEY: process.env.POSTHOG_PERSONAL_API_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '298689'
const PH_HOST = process.env.POSTHOG_API_HOST || 'https://eu.posthog.com'
const MARKETING_URL = process.env.MARKETING_URL || 'https://indxr.ai'
const APP_URL = process.env.APP_URL || 'https://app.indxr.ai'
const PH_DID_PARAM = 'ph_did'

// ── GATE: refuse to create ANY account/browser/event until every secret is present. Without the personal
//    API key the merge cannot be verified AND the resulting PostHog person cannot be cleaned up — so we
//    must not run at all. Fail fast, name exactly what's missing, create nothing.
const missing = Object.entries(REQUIRED).filter(([, v]) => !v).map(([k]) => k)
if (missing.length) {
  console.error('\n❌ BLOCKED — cannot run without these secrets:\n')
  for (const k of missing) {
    if (k === 'POSTHOG_PERSONAL_API_KEY') {
      console.error(`  • ${k} — a PostHog PERSONAL API key (starts with "phx_"), NOT the phc_ project key.`)
      console.error(`      Scopes required: person:read (to verify distinct_ids[]) AND person:delete (cleanup).`)
      console.error(`      Create at: ${PH_HOST}/settings/user-api-keys  ·  project id ${PROJECT_ID}.`)
    } else {
      console.error(`  • ${k}`)
    }
  }
  console.error('\nNothing was created. Re-run with the secrets set.\n')
  process.exit(2)
}

// Everything below runs ONLY when fully unblocked. ────────────────────────────────────────────────────
const { createClient } = await import('@supabase/supabase-js')
const { chromium } = await import('playwright')

const admin = createClient(REQUIRED.SUPABASE_URL, REQUIRED.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const phHeaders = { Authorization: `Bearer ${REQUIRED.POSTHOG_PERSONAL_API_KEY}` }

/** GET the PostHog person that owns `distinctId`; returns its full distinct_ids[] (empty if none yet). */
async function getPersonDistinctIds(distinctId) {
  const url = `${PH_HOST}/api/projects/${PROJECT_ID}/persons/?distinct_id=${encodeURIComponent(distinctId)}`
  const res = await fetch(url, { headers: phHeaders })
  if (!res.ok) throw new Error(`persons API ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.results?.[0]?.distinct_ids ?? []
}

async function deletePersonByDistinctId(distinctId) {
  const url = `${PH_HOST}/api/projects/${PROJECT_ID}/persons/?distinct_id=${encodeURIComponent(distinctId)}`
  const res = await fetch(url, { headers: phHeaders })
  if (!res.ok) return
  const person = (await res.json()).results?.[0]
  if (person?.id) {
    await fetch(`${PH_HOST}/api/projects/${PROJECT_ID}/persons/${person.id}/?delete_events=true`, {
      method: 'DELETE', headers: phHeaders,
    })
  }
}

/** Read the current anonymous distinct_id in the page. Prefer window.posthog; fall back to capturing it
 *  from the first /ingest event payload (memory persistence writes no cookie, so there's nothing on disk). */
async function readAnonId(page) {
  const viaWindow = await page.evaluate(() => window.posthog?.get_distinct_id?.() ?? null).catch(() => null)
  return viaWindow
}

let pass = 0, fail = 0
const results = []
async function scenario(name, { consent, phDidOverride, expectMerge, useVerificationLink }) {
  const email = `ph-bridge-${name}-${Date.now()}@indxr.ai`
  const password = 'Test-' + Math.random().toString(36).slice(2) + 'A1!'
  let userId = null, anonId = null
  const browser = await chromium.launch()
  try {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (cErr) throw cErr
    userId = created.user.id

    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    // Pre-login pageview under an anonymous id (the id we must see merged onto the person).
    await page.goto(`${MARKETING_URL}/articles/video-to-text`, { waitUntil: 'networkidle' })
    if (consent === 'granted') {
      await page.getByRole('button', { name: /accept/i }).click().catch(() => {})
    } else if (consent === 'denied') {
      await page.getByRole('button', { name: /decline|reject/i }).click().catch(() => {})
    }
    anonId = await readAnonId(page)
    if (!anonId) throw new Error('could not read anonymous distinct_id (expose window.posthog or add a network-capture fallback)')

    const phDid = phDidOverride === undefined ? anonId : phDidOverride

    if (useVerificationLink) {
      // Email-verification path WITHOUT an inbox: admin generateLink returns the action link directly.
      const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: 'signup', email, password })
      if (lErr) throw lErr
      const target = new URL(link.properties.action_link)
      if (phDid) target.searchParams.set(PH_DID_PARAM, phDid) // ride the verification link, like signup does
      await page.goto(target.toString(), { waitUntil: 'networkidle' })
    } else {
      // Login path: SPA-navigate to /login so the anon id is preserved, then submit. The login page adds
      // ph_did itself; we override the URL when testing invalid ids by navigating with the param.
      await page.goto(`${MARKETING_URL}/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard|onboarding/, { timeout: 30000 }).catch(() => {})
    }

    await page.waitForTimeout(6000) // let identify + alias flush to PostHog
    await ctx.close()

    const distinctIds = await getPersonDistinctIds(userId)
    const merged = distinctIds.includes(anonId)
    const ok = merged === expectMerge
    results.push({ name, userId, anonId, distinctIds, merged, expectMerge, ok })
    console.log(`${ok ? '✅' : '❌'} ${name}: anon=${anonId} merged=${merged} (expected ${expectMerge})`)
    console.log(`     person.distinct_ids = ${JSON.stringify(distinctIds)}`)
    ok ? pass++ : fail++
  } finally {
    // Cleanup — leave NOTHING in production.
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
    if (userId) await deletePersonByDistinctId(userId).catch(() => {})
    if (anonId) await deletePersonByDistinctId(anonId).catch(() => {})
    await browser.close()
  }
}

console.log(`\nPostHog bridge E2E — project ${PROJECT_ID} @ ${PH_HOST}\n`)
await scenario('login-granted', { consent: 'granted', expectMerge: true })
await scenario('login-denied', { consent: 'denied', expectMerge: true })
await scenario('login-invalid-truncated', { consent: 'granted', phDidOverride: '01a05db4-14b9', expectMerge: false })
await scenario('login-invalid-injection', { consent: 'granted', phDidOverride: "x';DROP--", expectMerge: false })
await scenario('verification-link', { consent: 'granted', useVerificationLink: true, expectMerge: true })

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} pass, ${fail} fail\n`)
process.exit(fail === 0 ? 0 : 1)
