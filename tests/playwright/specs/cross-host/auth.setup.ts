import { test as setup } from '@playwright/test'
import { account1 } from '../../config/accounts'

const AUTH_FILE = 'tests/playwright/specs/cross-host/.auth.json'
const MARKETING = process.env.BASE_URL_MARKETING ?? 'https://indxr.ai'

setup('authenticate as account1', async ({ page }) => {
  await page.goto(`${MARKETING}/login`)
  await page.waitForLoadState('networkidle')
  await page.locator('#email').fill(account1.email)
  await page.locator('#password').fill(account1.password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 })
  await page.context().storageState({ path: AUTH_FILE })
})
