/**
 * Playwright global setup — runs once before any test.
 *
 * Prepares the FIXED pool of test accounts (e2e-1..4@indxr.ai) for this run: rotate passwords, reset
 * state, top up credits — see helpers/provision.ts. Writes them to the ephemeral, git-ignored runtime
 * file that config/accounts.ts reads. Accounts PERSIST across runs (no accumulation, no teardown, so
 * rule #227 is never even approached). If neither the pool nor an env-var fallback is possible, authed
 * specs are skipped.
 */
import { preparePool, writeRuntimeAccounts } from './helpers/provision'

async function globalSetup() {
  console.log('\nglobal-setup: preparing fixed E2E account pool…')
  const accounts = await preparePool()
  writeRuntimeAccounts(accounts)

  if (accounts.length === 0) {
    console.warn('global-setup: no accounts available — authed specs will be skipped\n')
    return
  }
  for (const a of accounts) {
    console.log(`  ${a.provisioned ? 'pool    ' : 'fallback'} ${a.role.padEnd(13)} ${a.email} (${a.credits} cr)`)
  }
  console.log('global-setup: pool ready\n')
}

export default globalSetup
