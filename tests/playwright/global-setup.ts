/**
 * Playwright global setup — runs once before any test.
 *
 * Provisions this run's test accounts via the admin API (no passwords stored in the repo; see
 * helpers/provision.ts), writes them to the ephemeral, git-ignored runtime file that config/accounts.ts
 * reads, and tops up any fixed fallback account's credits. Provisioned accounts are already topped up
 * at creation. If neither provisioning nor an env-var fallback is possible, authed specs are skipped.
 */
import { createClient } from '@supabase/supabase-js'
import {
  provisionSuite,
  writeRuntimeAccounts,
  loadEnv,
  type ProvisionedAccount,
} from './helpers/provision'

const MINIMUM_CREDITS = 50
const TOP_UP_REASON = 'Playwright test suite top-up'

async function topUpFallback(accounts: ProvisionedAccount[]) {
  // Provisioned accounts are topped up at creation; only a reused env-var fallback needs a check.
  const fallback = accounts.filter((a) => !a.provisioned)
  if (fallback.length === 0) return
  const env = loadEnv()
  const url = env['NEXT_PUBLIC_SUPABASE_URL']
  const key = env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) return
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const seen = new Set<string>()
  for (const a of fallback) {
    if (seen.has(a.userId)) continue
    seen.add(a.userId)
    try {
      const { data } = await admin.from('user_credits').select('credits').eq('user_id', a.userId).single()
      const needed = Math.max(0, MINIMUM_CREDITS - (data?.credits ?? 0))
      if (needed > 0) {
        await admin.rpc('add_credits', {
          p_user_id: a.userId,
          p_amount: needed,
          p_reason: TOP_UP_REASON,
          p_metadata: { source: 'playwright_global_setup' },
        })
        console.log(`  ✓ ${a.email}: added ${needed} credits`)
      }
    } catch (err) {
      console.warn(`  ✗ ${a.email}: top-up error — ${err}`)
    }
  }
}

async function globalSetup() {
  console.log('\nglobal-setup: provisioning E2E accounts…')
  const accounts = await provisionSuite()
  writeRuntimeAccounts(accounts)

  if (accounts.length === 0) {
    console.warn('global-setup: no accounts provisioned — authed specs will be skipped\n')
    return
  }
  for (const a of accounts) {
    console.log(`  ${a.provisioned ? 'provisioned' : 'fallback  '} ${a.role.padEnd(13)} ${a.email}`)
  }
  await topUpFallback(accounts)
  console.log('global-setup: accounts ready\n')
}

export default globalSetup
