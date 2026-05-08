/**
 * TEST 2 — Email/password login + cross-host redirect
 * TEST 3 — Unauthenticated direct app access
 */

import { test, expect } from '@playwright/test'
import { account1 } from '../../config/accounts'

const MARKETING = process.env.BASE_URL_MARKETING ?? 'https://indxr.ai'
const APP = process.env.BASE_URL_APP ?? 'https://app.indxr.ai'

// Both tests start without any session
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('TEST 2 — Login + cross-host redirect', () => {
  test('login redirects to app dashboard; .indxr.ai cookie set', async ({ page }) => {
    await page.goto(`${MARKETING}/login`)
    await page.waitForLoadState('networkidle')
    await page.locator('#email').fill(account1.email)
    await page.locator('#password').fill(account1.password)
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.waitForURL(`${APP}/dashboard**`, { timeout: 20_000 })
    expect(page.url()).toContain(`${APP}/dashboard`)

    const cookies = await page.context().cookies()
    const authCookie = cookies.find(
      (c) => c.name.startsWith('sb-') && c.domain === '.indxr.ai'
    )
    expect(authCookie, 'sb-* cookie on .indxr.ai domain should be present').toBeDefined()
  })

  test('dashboard renders after login (no error page, topbar visible)', async ({ page }) => {
    await page.goto(`${MARKETING}/login`)
    await page.waitForLoadState('networkidle')
    await page.locator('#email').fill(account1.email)
    await page.locator('#password').fill(account1.password)
    await page.getByRole('button', { name: 'Log In' }).click()
    await page.waitForURL(`${APP}/dashboard**`, { timeout: 20_000 })

    // AppTopbar logo link should be present
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('TEST 3 — Unauthenticated direct app access', () => {
  test('redirects to marketing login with ?next= pointing back to app', async ({ page }) => {
    await page.goto(`${APP}/dashboard`)
    await page.waitForURL(`${MARKETING}/login**`, { timeout: 15_000 })

    expect(page.url()).toContain(`${MARKETING}/login`)
    expect(page.url()).toContain('next=')
    expect(decodeURIComponent(page.url())).toContain(`${APP}/dashboard`)
  })
})
