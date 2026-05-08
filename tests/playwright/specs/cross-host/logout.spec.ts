/**
 * TEST 6 — Logout from app.indxr.ai
 * TEST 7 — Logout from indxr.ai (marketing)
 *
 * Each test logs in fresh to avoid state pollution between tests.
 */

import { test, expect, type Page } from '@playwright/test'
import { account1 } from '../../config/accounts'

const MARKETING = process.env.BASE_URL_MARKETING ?? 'https://indxr.ai'
const APP = process.env.BASE_URL_APP ?? 'https://app.indxr.ai'

async function loginFresh(page: Page) {
  await page.goto(`${MARKETING}/login`)
  await page.waitForLoadState('networkidle')
  await page.locator('#email').fill(account1.email)
  await page.locator('#password').fill(account1.password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.waitForURL(`${APP}/dashboard**`, { timeout: 20_000 })
}

test.describe('TEST 6 — Logout from app.indxr.ai', () => {
  // Fresh context per test (no shared storageState — we test the logout itself)
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logout from AvatarDropdown redirects to marketing login', async ({ page }) => {
    await loginFresh(page)

    // Open AvatarDropdown and click Sign Out
    const avatarBtn = page.locator('button').filter({ has: page.locator('span[class*="avatar"], img[alt*="avatar"], span[class*="Avatar"]') }).first()
    // Fallback: find the last button in the topbar header (Avatar is the rightmost)
    await page.locator('header button').last().click()
    await page.getByText('Sign Out').first().click()

    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    expect(page.url()).toContain(`${MARKETING}/login`)
  })

  test('after logout, accessing /dashboard redirects to login', async ({ page }) => {
    await loginFresh(page)

    // Logout via AvatarDropdown
    await page.locator('header button').last().click()
    await page.getByText('Sign Out').first().click()
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })

    // Now try to access dashboard without session
    await page.goto(`${APP}/dashboard`)
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    expect(page.url()).toContain(`${MARKETING}/login`)
  })

  test('after logout, .indxr.ai auth cookies are cleared', async ({ page }) => {
    await loginFresh(page)

    await page.locator('header button').last().click()
    await page.getByText('Sign Out').first().click()
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })

    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(
      (c) => c.name.startsWith('sb-') && c.domain === '.indxr.ai'
    )
    expect(authCookies.length).toBe(0)
  })
})

test.describe('TEST 7 — Logout from indxr.ai (marketing)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logout from marketing header redirects to login, removes logged-in state', async ({ page }) => {
    await loginFresh(page)

    // Navigate to a marketing page while logged in
    await page.goto(`${MARKETING}/pricing`)
    await page.waitForLoadState('networkidle')

    // Find and click the Sign Out button in the marketing Header
    await page.getByText('Sign Out').first().click()

    // Should redirect to login or show logged-out state
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })
    expect(page.url()).toContain(`${MARKETING}/login`)
  })
})
