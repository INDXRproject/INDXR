/**
 * E2E test-account FIXED POOL (replaces both the stale password-in-a-file model AND the per-run
 * "create a fresh account every run" model — the latter left 24 accounts behind in 6 runs because
 * teardown was opt-in).
 *
 * Design:
 * - Four FIXED accounts (e2e-1..4@indxr.ai) that exist once and PERSIST. No accumulation → no
 *   deletion ever needed → absolute rule #227 stays intact (this module never deletes an account).
 * - At the start of each run the pool is PREPARED: rotate each account's password via the admin API
 *   (generated per run, stored NOWHERE persistent — only in the git-ignored runtime file the config
 *   loader reads this run), reset state (wipe the account's transcripts from prior runs, top the
 *   credits back up to the start value). Because the password lives nowhere durable, the credential
 *   drift that started all this cannot recur.
 * - is_internal = true + onboarding completed, so pool accounts never pollute the dashboards and never
 *   bounce /dashboard → /onboarding.
 * - Fall back to a fixed account from env-vars (E2E_FALLBACK_*) only when the environment cannot admin
 *   the pool (no service-role key). Credentials come from env-vars, never a committed file.
 *
 * Parallel runs: Playwright here runs serial (playwright.config: workers:1, fullyParallel:false), and
 * runs are launched manually one at a time (single-dev repo). Two SIMULTANEOUS `pnpm test:e2e`
 * invocations would race on the same 4 accounts (both rotate passwords + reset state) — not a scenario
 * this repo uses. If it ever needs CI parallelism, give each shard its own pool suffix
 * (e2e-<shard>-1..4) via an env var; the pool functions already key off the email list.
 */
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export interface ProvisionedAccount {
  email: string
  password: string
  userId: string
  credits: number
  role: 'auto-captions' | 'whisper' | 'playlist' | 'stress'
  provisioned: boolean // true = a real pool/created account this run; false = env-var fallback
}

export const ROLES: ProvisionedAccount['role'][] = ['auto-captions', 'whisper', 'playlist', 'stress']
export const RUNTIME_ACCOUNTS_FILE = path.resolve(__dirname, '../.e2e-run-accounts.json')

/** The persistent fixed pool — created once, reused every run. */
export const POOL: { email: string; role: ProvisionedAccount['role'] }[] = [
  { email: 'e2e-1@indxr.ai', role: 'auto-captions' },
  { email: 'e2e-2@indxr.ai', role: 'whisper' },
  { email: 'e2e-3@indxr.ai', role: 'playlist' },
  { email: 'e2e-4@indxr.ai', role: 'stress' },
]

const START_CREDITS = 200

/** Read env-vars, preferring process.env and falling back to the repo-root .env.local for local dev. */
export function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  const envPath = path.resolve(__dirname, '../../../.env.local')
  try {
    const raw = fs.readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      const k = t.slice(0, i).trim()
      if (env[k] === undefined) env[k] = t.slice(i + 1).trim() // env-var wins over file
    }
  } catch {
    /* no .env.local — rely on process.env only */
  }
  return env
}

export function adminClient(env = loadEnv()): SupabaseClient | null {
  const url = env['NEXT_PUBLIC_SUPABASE_URL']
  const key = env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function generatePassword(): string {
  // Meets Supabase complexity; regenerated per run, never persisted anywhere durable.
  return `E2e!${crypto.randomBytes(18).toString('base64url')}`
}

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  // listUsers is paginated; scan a few large pages (this project has ~hundreds of users).
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) break
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === email.toLowerCase())
    if (u) return u
    if (data.users.length < 1000) break
  }
  return null
}

/**
 * Prepare one pool account for this run: find-or-create, rotate password, mark internal + onboarded,
 * wipe prior-run transcripts, and top credits back up to START_CREDITS. Never deletes the account.
 */
async function preparePoolAccount(
  admin: SupabaseClient,
  email: string,
  role: ProvisionedAccount['role'],
): Promise<ProvisionedAccount> {
  const password = generatePassword()
  let user = await findUserByEmail(admin, email)

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { e2e: true, pool: true, role },
    })
    if (error || !data.user) throw new Error(`createUser(${email}) failed: ${error?.message}`)
    user = data.user
    console.log(`  provision: created pool account ${email}`)
  } else {
    // Rotate the password every run — the value lives nowhere durable, so it cannot drift/leak.
    const { error } = await admin.auth.admin.updateUserById(user.id, { password })
    if (error) throw new Error(`updateUserById(${email}) failed: ${error.message}`)
  }
  const userId = user.id

  // Idempotent: keep out of dashboards + onboarding complete (else /dashboard bounces to /onboarding).
  const { error: pErr } = await admin
    .from('profiles')
    .update({ is_internal: true, onboarding_completed: true, username: email.split('@')[0] })
    .eq('id', userId)
  if (pErr) console.warn(`  provision: profile update failed for ${email} — ${pErr.message}`)

  // Reset state — wipe THIS pool account's transcripts from prior runs (scoped strictly to the pool
  // account's own user_id; never a real user). Rule #227 is about ACCOUNTS — transcripts are fair game.
  const { error: tErr } = await admin.from('transcripts').delete().eq('user_id', userId)
  if (tErr) console.warn(`  provision: transcript reset failed for ${email} — ${tErr.message}`)

  // Top credits back up to the start floor via the authoritative RPC (never a direct INSERT/UPDATE).
  const { data: bal } = await admin.from('user_credits').select('credits').eq('user_id', userId).maybeSingle()
  const current = bal?.credits ?? 0
  if (current < START_CREDITS) {
    const { error: cErr } = await admin.rpc('add_credits', {
      p_user_id: userId, p_amount: START_CREDITS - current,
      p_reason: 'E2E pool reset', p_metadata: { source: 'e2e_pool' },
    })
    if (cErr) console.warn(`  provision: credit reset failed for ${email} — ${cErr.message}`)
  }

  return { email, password, userId, credits: Math.max(current, START_CREDITS), role, provisioned: true }
}

/**
 * Prepare the whole fixed pool for a run. Falls back to a single fixed env-var account (reused for all
 * roles) when no service-role key is available; returns [] if neither path is possible (skip authed specs).
 */
export async function preparePool(): Promise<ProvisionedAccount[]> {
  const env = loadEnv()
  const admin = adminClient(env)

  if (!admin) {
    const email = env['E2E_FALLBACK_EMAIL']
    const password = env['E2E_FALLBACK_PASSWORD']
    const userId = env['E2E_FALLBACK_USER_ID']
    if (email && password && userId) {
      console.warn('provision: no service-role key — using E2E_FALLBACK_* fixed account for all roles')
      return ROLES.map((role) => ({ email, password, userId, credits: 0, role, provisioned: false }))
    }
    console.warn('provision: no service-role key and no E2E_FALLBACK_* — authed specs will be skipped')
    return []
  }

  const out: ProvisionedAccount[] = []
  for (const { email, role } of POOL) {
    out.push(await preparePoolAccount(admin, email, role))
  }
  return out
}

/** Persist this run's accounts (incl. the rotated passwords) to the ephemeral, git-ignored runtime file. */
export function writeRuntimeAccounts(accounts: ProvisionedAccount[]): void {
  fs.writeFileSync(RUNTIME_ACCOUNTS_FILE, JSON.stringify({ accounts }, null, 2))
}

export function readRuntimeAccounts(): ProvisionedAccount[] {
  try {
    return JSON.parse(fs.readFileSync(RUNTIME_ACCOUNTS_FILE, 'utf-8')).accounts ?? []
  } catch {
    return []
  }
}
