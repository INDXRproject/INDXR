/**
 * E2E test-account provisioning (replaces the stale, password-in-a-file model).
 *
 * Industry pattern (cf. GitLab's E2E framework): provision a fresh test user per run via an admin
 * token, generate its password in-process, and never persist that password to a repo file. Fall back
 * to a fixed account from env-vars only when the environment cannot create users (no service-role key).
 *
 * - Credentials come from env-vars / are generated per run — never from a committed file.
 * - Provisioned users get a per-run prefix (e2e-<runId>-<n>@indxr.ai) and `is_internal = true` so they
 *   don't pollute the admin/growth dashboards.
 * - Teardown is BUILT but gated behind E2E_TEARDOWN=1 (default OFF). This module never deletes an
 *   account unless that flag is explicitly set — absolute rule #227 stays intact.
 *
 * The generated passwords live only in an ephemeral, git-ignored runtime file
 * (tests/playwright/.e2e-run-accounts.json) that global-setup rewrites every run.
 */
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface ProvisionedAccount {
  email: string
  password: string
  userId: string
  credits: number
  role: 'auto-captions' | 'whisper' | 'playlist' | 'stress'
  provisioned: boolean // true = created this run; false = env-var fallback
}

export const ROLES: ProvisionedAccount['role'][] = ['auto-captions', 'whisper', 'playlist', 'stress']
export const RUNTIME_ACCOUNTS_FILE = path.resolve(__dirname, '../.e2e-run-accounts.json')

const TARGET_CREDITS = 200

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

/** Short, filesystem-safe run id. Not for crypto — just to namespace this run's accounts. */
export function newRunId(): string {
  return `${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`
}

function generatePassword(): string {
  // Meets Supabase complexity; regenerated per run, never committed.
  return `E2e!${crypto.randomBytes(18).toString('base64url')}`
}

/**
 * Create one fresh, confirmed, internal test user and top it up to TARGET_CREDITS.
 * Throws on failure so the caller can fall back to env-vars.
 */
export async function provisionTestUser(
  admin: SupabaseClient,
  runId: string,
  index: number,
  role: ProvisionedAccount['role'],
): Promise<ProvisionedAccount> {
  const email = `e2e-${runId}-${index}@indxr.ai`
  const password = generatePassword()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { e2e: true, run_id: runId, role },
  })
  if (error || !data.user) throw new Error(`createUser(${email}) failed: ${error?.message}`)
  const userId = data.user.id

  // Mark internal (keeps them out of the admin/growth dashboards) AND complete onboarding — a fresh
  // account with username=null / onboarding_completed=false is bounced from /dashboard to /onboarding,
  // which breaks every authed spec. Best-effort: the signup trigger creates the profile row
  // synchronously, but don't fail provisioning if a column differs.
  const { error: pErr } = await admin
    .from('profiles')
    .update({ is_internal: true, onboarding_completed: true, username: `e2e-${runId}-${index}` })
    .eq('id', userId)
  if (pErr) console.warn(`  provision: could not set profile fields for ${email} — ${pErr.message}`)

  // Top up credits via the authoritative RPC (never INSERT directly).
  const { error: cErr } = await admin.rpc('add_credits', {
    p_user_id: userId,
    p_amount: TARGET_CREDITS,
    p_reason: 'E2E provisioning top-up',
    p_metadata: { source: 'e2e_provision', run_id: runId },
  })
  if (cErr) console.warn(`  provision: credit top-up failed for ${email} — ${cErr.message}`)

  return { email, password, userId, credits: TARGET_CREDITS, role, provisioned: true }
}

/**
 * Provision the four role accounts for a run. If no service-role key is available, fall back to a
 * single fixed account from env-vars (E2E_FALLBACK_EMAIL / E2E_FALLBACK_PASSWORD / E2E_FALLBACK_USER_ID),
 * reused for every role. Returns [] if neither path is possible (caller should skip authed specs).
 */
export async function provisionSuite(): Promise<ProvisionedAccount[]> {
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

  const runId = newRunId()
  const out: ProvisionedAccount[] = []
  for (let i = 0; i < ROLES.length; i++) {
    out.push(await provisionTestUser(admin, runId, i + 1, ROLES[i]))
  }
  return out
}

/** Persist this run's accounts to the ephemeral, git-ignored runtime file for config/accounts.ts. */
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

/**
 * Teardown — BUILT but gated. Always lists the run's accounts. Only deletes when E2E_TEARDOWN=1 is set
 * explicitly. Default behaviour deletes NOTHING (rule #227). To activate safely, Khidr would run with
 * E2E_TEARDOWN=1 after confirming from the printed list that only e2e-<runId>-* accounts are targeted.
 */
export async function teardownTestUsers(accounts: ProvisionedAccount[]): Promise<void> {
  const created = accounts.filter((a) => a.provisioned)
  console.log(`\nprovision: this run created ${created.length} account(s):`)
  for (const a of created) console.log(`  - ${a.email} (${a.userId})`)

  if (process.env.E2E_TEARDOWN !== '1') {
    console.log('provision: E2E_TEARDOWN not set — leaving all accounts in place (rule #227).')
    return
  }
  const admin = adminClient()
  if (!admin) {
    console.warn('provision: E2E_TEARDOWN=1 but no service-role key — cannot delete; leaving accounts.')
    return
  }
  for (const a of created) {
    const { error } = await admin.auth.admin.deleteUser(a.userId)
    console.log(error ? `  ✗ delete ${a.email}: ${error.message}` : `  ✓ deleted ${a.email}`)
  }
}
