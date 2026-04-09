import { type Page, expect } from '@playwright/test'
import type { TestAccount } from '../config/accounts'

// --- Selectors (derived from UI audit) ---
const SEL = {
  email: '#email',
  password: '#password',
  submit: 'button[type="submit"]',
  urlInput: 'input[placeholder="https://www.youtube.com/watch?v=..."]',
  extractBtn: 'button:has-text("Extract")',
  whisperToggle: 'button[role="switch"]',
  confirmExtract: 'button:has-text("Confirm & Extract")',
  transcriptResult: '[data-transcript-result], .transcript-content, text=/\\d+ words/',
  // Sonner toast — appears as [data-sonner-toast] in DOM
  toastSuccess: '[data-sonner-toast]:has-text("Transcript")',
  toastError: '[data-sonner-toast][data-type="error"]',
  // Library uses card/list layout — items are linked via /dashboard/library/:id
  libraryRow: 'a[href*="/dashboard/library/"]',
  searchInput: 'input[placeholder="Search…"]',
} as const

/**
 * Log in via the UI and wait for the dashboard to load.
 */
export async function loginAs(page: Page, account: TestAccount): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator(SEL.email).fill(account.email)
  await page.locator(SEL.password).fill(account.password)
  await page.locator('form').getByRole('button', { name: 'Log In' }).click()
  // May land on /dashboard or /onboarding (accounts that haven't finished onboarding)
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
  if (page.url().includes('/onboarding')) {
    await page.goto('/dashboard/transcribe')
    await page.waitForURL('**/dashboard**', { timeout: 10_000 })
  }
}

/**
 * Read the credit balance from the sidebar/navbar.
 * Returns -1 if the balance element is not found.
 */
export async function getCredits(page: Page): Promise<number> {
  try {
    // CreditBalance component renders as <a href="/pricing">...<span>{n}</span><span>credits</span></a>
    const text = await page
      .locator('a[href="/pricing"]:has-text("credits")')
      .first()
      .textContent({ timeout: 5_000 })
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : -1
  } catch {
    return -1
  }
}

/**
 * Navigate to the transcribe page, submit a YouTube URL, and wait for
 * success or failure. Returns 'success' | 'error' | 'duplicate' | 'timeout'.
 */
export async function extractVideo(
  page: Page,
  url: string,
  options: {
    useWhisper?: boolean
    timeout?: number
  } = {}
): Promise<'success' | 'error' | 'duplicate' | 'timeout'> {
  const timeout = options.timeout ?? 60_000

  await page.goto('/dashboard/transcribe')
  await page.locator(SEL.urlInput).fill(url)

  if (options.useWhisper) {
    const toggle = page.locator(SEL.whisperToggle)
    const checked = await toggle.getAttribute('aria-checked')
    if (checked !== 'true') await toggle.click()
  }

  await page.locator(SEL.extractBtn).click()

  // May show Whisper confirm dialog
  const confirmBtn = page.locator(SEL.confirmExtract)
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmBtn.click()
  }

  // Wait for outcome
  try {
    const result = await Promise.race([
      page.waitForSelector('[data-sonner-toast]', { timeout }).then(async (el) => {
        const text = await el.textContent() ?? ''
        if (text.toLowerCase().includes('transcript')) return 'success' as const
        if (text.toLowerCase().includes('already') || text.toLowerCase().includes('al ')) return 'duplicate' as const
        return 'error' as const
      }),
      page.waitForSelector('text=/transcript extracted/i', { timeout }).then(() => 'success' as const),
      page.waitForSelector('text=/error|failed|invalid/i', { timeout: 15_000 }).then(() => 'error' as const),
    ])
    return result
  } catch {
    return 'timeout'
  }
}

/**
 * Wait for extraction to complete (success or error toast).
 * Returns true if succeeded, false if error/timeout.
 */
export async function waitForExtraction(
  page: Page,
  timeout = 60_000
): Promise<boolean> {
  try {
    await Promise.race([
      page.waitForSelector('[data-sonner-toast]:has-text("Transcript")', { timeout }),
      page.waitForSelector('text=/transcript extracted/i', { timeout }),
    ])
    return true
  } catch {
    return false
  }
}

/**
 * Count transcripts currently visible in the library.
 * The library uses a card/list layout with links to /dashboard/library/:id.
 */
export async function getLibraryCount(page: Page): Promise<number> {
  await page.goto('/dashboard/library')
  // Wait for items to load (or for the empty-state to appear)
  await page.waitForSelector('a[href*="/dashboard/library/"], text=/0 transcripts/', { timeout: 10_000 }).catch(() => null)
  return page.locator('a[href*="/dashboard/library/"]').count()
}

export { SEL }
