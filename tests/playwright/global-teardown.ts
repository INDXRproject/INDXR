/**
 * Playwright global teardown — runs once after all tests.
 *
 * Lists the accounts this run created and, ONLY when E2E_TEARDOWN=1 is explicitly set, deletes them.
 * Default behaviour deletes nothing (absolute rule #227). See helpers/provision.ts.
 */
import { teardownTestUsers, readRuntimeAccounts } from './helpers/provision'

async function globalTeardown() {
  await teardownTestUsers(readRuntimeAccounts())
}

export default globalTeardown
