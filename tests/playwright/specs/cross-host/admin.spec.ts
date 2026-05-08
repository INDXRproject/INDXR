/**
 * TEST 12 — Admin route gating
 *
 * Non-admin users (test_accounts.json) are redirected to /dashboard.
 * Admin-can-access check requires ADMIN_EMAIL credentials — skipped (not in test_accounts.json).
 */

import { test, expect } from '@playwright/test'

const APP = process.env.BASE_URL_APP ?? 'https://app.indxr.ai'

test.describe('TEST 12 — Admin route', () => {
  // Uses saved storageState (account1 = non-admin user)

  test('non-admin user: /admin redirects to /dashboard', async ({ page }) => {
    await page.goto(`${APP}/admin`)
    // Admin layout does redirect('/dashboard') server-side for non-admin users
    await page.waitForURL(`${APP}/dashboard**`, { timeout: 15_000 })
    expect(page.url()).toContain('/dashboard')
    expect(page.url()).not.toContain('/admin')
  })

  test.skip('admin user: /admin shows admin panel — requires ADMIN_EMAIL account in test_accounts.json', async () => {
    // Manual: log in with ADMIN_EMAIL account and verify admin content is visible
  })
})
