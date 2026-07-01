/**
 * TEST 6 — Logout from app.indxr.ai
 * TEST 7 — Logout from indxr.ai (marketing)
 *
 * Each test logs in fresh to avoid state pollution between tests.
 */

import { test, expect, type Page } from '@playwright/test'
import { account2 } from '../../config/accounts'

const MARKETING = process.env.BASE_URL_MARKETING ?? 'https://indxr.ai'
const APP = process.env.BASE_URL_APP ?? 'https://app.indxr.ai'

// Use account2 so global signOut() doesn't invalidate account1's session
// (which is stored in .auth.json and used by nav/admin tests)
async function loginFresh(page: Page) {
  await page.goto(`${MARKETING}/login`)
  await page.waitForLoadState('networkidle')
  await page.locator('#email').fill(account2.email)
  await page.locator('#password').fill(account2.password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 })
  if (page.url().includes('/onboarding')) {
    await page.goto(`${APP}/dashboard`)
    await page.waitForURL(`${APP}/dashboard**`, { timeout: 10_000 })
  }
}

test.describe('TEST 6 — Logout from app.indxr.ai', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logout from sidebar redirects to marketing login', async ({ page }) => {
    await loginFresh(page)
    // Use the sidebar Sign Out button (actual <button>, no dropdown needed)
    await page.locator('button').filter({ hasText: 'Sign Out' }).first().click()
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    expect(page.url()).toContain(`${MARKETING}/login`)
  })

  test('after logout, accessing /dashboard redirects to login', async ({ page }) => {
    await loginFresh(page)
    await page.locator('button').filter({ hasText: 'Sign Out' }).first().click()
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    await page.goto(`${APP}/dashboard`)
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    expect(page.url()).toContain(`${MARKETING}/login`)
  })

  test('after logout, .indxr.ai auth cookies are cleared', async ({ page }) => {
    await loginFresh(page)
    await page.locator('button').filter({ hasText: 'Sign Out' }).first().click()
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(
      (c) => c.name.startsWith('sb-') && c.domain === '.indxr.ai'
    )
    expect(authCookies.length).toBe(0)
  })
})

test.describe('TEST 7 — Logout from indxr.ai (marketing)', () => {
  test.use({
    storageState: { cookies: [], origins: [] },
    // Mobile viewport: marketing header hides desktop nav and shows hamburger Sheet
    viewport: { width: 390, height: 844 },
  })

  test('logout from marketing mobile menu redirects to login', async ({ page }) => {
    await loginFresh(page)
    await page.goto(`${MARKETING}/pricing`)
    await page.waitForLoadState('networkidle')
    // Open the mobile hamburger Sheet (visible only at < md breakpoint)
    await page.getByRole('button', { name: /toggle menu/i }).click()
    await page.waitForSelector('[data-state="open"]', { state: 'visible', timeout: 5_000 })
    await page.waitForTimeout(150)
    // Click Sign Out inside the Sheet
    await page.getByRole('button', { name: /sign out/i }).click()
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    expect(page.url()).toContain(`${MARKETING}/login`)
  })
})
