/**
 * Test accounts for the authed specs. Sourced from the ephemeral runtime file that global-setup
 * writes after provisioning (helpers/provision.ts) — NOT from a committed credentials file. The old
 * tests/test_accounts.json (static emails + a shared password) is deprecated: those accounts were
 * cleaned up (verified gone from auth.users on 2026-09-13) and storing passwords in a file caused
 * silent credential drift. See docs/LESSONS.md.
 */
import { readRuntimeAccounts, type ProvisionedAccount } from '../helpers/provision'

export type TestAccount = Pick<ProvisionedAccount, 'email' | 'password' | 'userId' | 'credits' | 'role'>

function loadAccounts(): TestAccount[] {
  const accounts = readRuntimeAccounts()
  if (accounts.length === 0) {
    // global-setup couldn't provision (no service-role key / no fallback). Specs that use these
    // accounts should guard with `test.skip(!account, ...)` rather than crash at import.
    return []
  }
  return accounts.map((a) => ({
    email: a.email,
    password: a.password,
    userId: a.userId,
    credits: a.credits,
    role: a.role,
  }))
}

const accounts = loadAccounts()

export const account1 = accounts[0]  // auto-captions tester
export const account2 = accounts[1]  // whisper tester
export const account3 = accounts[2]  // playlist tester
export const account4 = accounts[3]  // stress tester

export default accounts
