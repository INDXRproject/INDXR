/**
 * TEST 1 — Cross-host redirects (308)
 * Verifies that auth paths on app.indxr.ai issue a permanent redirect to indxr.ai.
 */

import { test, expect } from '@playwright/test'

const MARKETING = process.env.BASE_URL_MARKETING ?? 'https://indxr.ai'
const APP = process.env.BASE_URL_APP ?? 'https://app.indxr.ai'

// No auth needed — these are unauthenticated redirect checks
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('TEST 1 — Cross-host 308 redirects', () => {
  for (const path of ['/login', '/signup', '/forgot-password']) {
    test(`app${path} → 308 → marketing${path}`, async ({ request }) => {
      const response = await request.fetch(`${APP}${path}`, { maxRedirects: 0 })
      expect(response.status()).toBe(308)
      expect(response.headers()['location']).toBe(`${MARKETING}${path}`)
    })
  }
})
