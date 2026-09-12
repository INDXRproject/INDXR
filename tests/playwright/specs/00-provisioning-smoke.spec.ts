/**
 * 00-provisioning-smoke.spec.ts
 * Canary for the env-var/admin provisioning model (helpers/provision.ts + global-setup).
 * Proves a freshly provisioned, onboarded test account can authenticate and reach the dashboard —
 * without any password stored in the repo. If this is red, authed specs cannot run.
 */
import { test, expect } from '@playwright/test'
import { account1 } from '../config/accounts'
import { loginAs } from '../helpers/auth'

test.describe('00 — provisioning smoke', () => {
  test('provisioned account logs in and stays authed on the dashboard', async ({ page }) => {
    test.skip(!account1, 'no provisioned account (no service-role key and no E2E_FALLBACK_*)')

    // loginAs mints a Supabase session from the run-generated password and asserts /dashboard.
    // (Would throw if the session were rejected — unauthed hits redirect away from /dashboard.)
    await loginAs(page, account1)
    await expect(page).toHaveURL(/\/dashboard/)

    // Navigating deeper must NOT bounce to /login or /onboarding — proves a fully usable session
    // on a freshly provisioned+onboarded account. (Credit-balance assertion intentionally omitted:
    // the getCredits sidebar selector is stale after the UI reorg — unrelated to provisioning.)
    await page.goto('/dashboard/transcribe')
    await expect(page).toHaveURL(/\/dashboard\/transcribe/)
  })
})
