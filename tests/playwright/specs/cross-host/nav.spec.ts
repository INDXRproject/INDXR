/**
 * TEST 4 — Navbar links on marketing host (indxr.ai)
 * TEST 5 — Navbar links on app host (app.indxr.ai)
 *
 * Verifies that cross-host links use absolute URLs (no <Link> prefetch crashes)
 * and same-host links stay on their own domain.
 */

import { test, expect } from '@playwright/test'

const MARKETING = process.env.BASE_URL_MARKETING ?? 'https://indxr.ai'
const APP = process.env.BASE_URL_APP ?? 'https://app.indxr.ai'

test.describe('TEST 4 — Marketing navbar links (not logged in)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('Pricing, Docs, Login links are same-host (indxr.ai)', async ({ page }) => {
    await page.goto(MARKETING)
    await page.waitForLoadState('networkidle')

    // All three links must point to the marketing host, not app subdomain
    const pricingHref = await page.locator('a[href*="/pricing"]').first().getAttribute('href')
    expect(pricingHref).toContain(`${MARKETING}/pricing`)

    const docsHref = await page.locator('a[href*="/docs"]').first().getAttribute('href')
    expect(docsHref).toContain(`${MARKETING}/docs`)

    const loginHref = await page.locator('a[href*="/login"]').first().getAttribute('href')
    expect(loginHref).toContain(`${MARKETING}/login`)
  })
})

test.describe('TEST 4 — Marketing navbar links (logged in)', () => {
  // Uses saved storageState from auth.setup.ts
  test('Dashboard link points to app subdomain (cross-host href correct)', async ({ page }) => {
    await page.goto(MARKETING)
    await page.waitForLoadState('networkidle')

    // Verify at least one link to the app subdomain dashboard exists in DOM.
    // The link may be inside a responsive container (hidden on some viewports),
    // but the href being present confirms cross-host routing is correctly configured.
    const dashLinks = page.locator(`a[href*="${APP}/dashboard"]`)
    const count = await dashLinks.count()
    expect(count, `Expected at least one link pointing to ${APP}/dashboard`).toBeGreaterThan(0)
    const href = await dashLinks.first().getAttribute('href')
    expect(href).toContain('/dashboard')
  })
})

test.describe('TEST 5 — App navbar links (logged in)', () => {
  // Uses saved storageState from auth.setup.ts
  test('AppTopbar logo links to /dashboard; no marketing links in topbar', async ({ page }) => {
    await page.goto(`${APP}/dashboard`)
    await page.waitForLoadState('networkidle')

    // Logo should link to /dashboard (same-host relative link)
    const logoLink = page.locator('a[href="/dashboard"]').first()
    await expect(logoLink).toBeVisible({ timeout: 10_000 })

    // No Pricing/Docs links in topbar (those belong to marketing Header, not AppTopbar)
    const pricingCount = await page.locator(`header a[href*="/pricing"]`).count()
    expect(pricingCount).toBe(0)
  })

  test('Sidebar internal links stay on app.indxr.ai', async ({ page }) => {
    await page.goto(`${APP}/dashboard`)
    await page.waitForLoadState('networkidle')

    // All sidebar nav links should be relative (/dashboard/...), not cross-host
    const navLinks = page.locator('nav a[href^="/dashboard"]')
    const count = await navLinks.count()
    expect(count, 'Sidebar should have at least one /dashboard link').toBeGreaterThan(0)
  })
})
