/**
 * Playwright global setup — runs once before any test.
 * Ensures each test account has at least 50 credits.
 * Uses Supabase admin client directly (no browser needed).
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '../../.env.local')
  const env: Record<string, string> = {}
  try {
    const raw = fs.readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      env[key] = value
    }
  } catch (err) {
    console.warn('global-setup: could not read .env.local:', err)
  }
  return env
}

const MINIMUM_CREDITS = 50
const TOP_UP_REASON = 'Playwright test suite top-up'

async function globalSetup() {
  const env = loadEnv()

  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      'global-setup: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — skipping credit top-up'
    )
    return
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Load test accounts
  const accountsPath = path.resolve(__dirname, '../test_accounts.json')
  let accounts: Array<{ user_id: string; email: string }> = []
  try {
    const raw = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'))
    accounts = raw.accounts ?? []
  } catch (err) {
    console.warn('global-setup: could not read test_accounts.json:', err)
    return
  }

  console.log(`\nglobal-setup: checking credits for ${accounts.length} test accounts...`)

  for (const account of accounts) {
    try {
      // Get current balance
      const { data: credits } = await admin
        .from('user_credits')
        .select('credits')
        .eq('user_id', account.user_id)
        .single()

      const current = credits?.credits ?? 0
      const needed = Math.max(0, MINIMUM_CREDITS - current)

      if (needed > 0) {
        const { error } = await admin.rpc('add_credits', {
          p_user_id: account.user_id,
          p_amount: needed,
          p_reason: TOP_UP_REASON,
          p_metadata: { source: 'playwright_global_setup' },
        })

        if (error) {
          console.warn(`  ✗ ${account.email}: failed to add credits — ${error.message}`)
        } else {
          console.log(`  ✓ ${account.email}: added ${needed} credits (${current} → ${current + needed})`)
        }
      } else {
        console.log(`  ✓ ${account.email}: has ${current} credits (≥ ${MINIMUM_CREDITS}, no top-up needed)`)
      }
    } catch (err) {
      console.warn(`  ✗ ${account.email}: error — ${err}`)
    }
  }

  console.log('global-setup: credit top-up complete\n')
}

export default globalSetup
