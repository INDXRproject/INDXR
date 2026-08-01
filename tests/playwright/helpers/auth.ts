import { type Page, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import type { TestAccount } from '../config/accounts'

// Supabase project config for minting a session (read once from apps/app/.env.local).
function supabaseConfig(): { url: string; anon: string } {
  const p = path.resolve(__dirname, '../../../apps/app/.env.local')
  const env = fs.readFileSync(p, 'utf8')
  return {
    url: env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)![1].trim(),
    anon: env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)![1].trim(),
  }
}

// Build the Supabase auth cookie(s) for a session, chunked the way @supabase/ssr reads them,
// scoped to the host we're testing (prod: `.indxr.ai`, local: `localhost`).
function sessionCookies(session: unknown, supabaseUrl: string, baseURL: string) {
  const ref = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase/)![1]
  const name = `sb-${ref}-auth-token`
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64')
  const MAX = 3180
  const parts =
    value.length <= MAX
      ? [{ name, value }]
      : Array.from({ length: Math.ceil(value.length / MAX) }, (_, i) => ({
          name: `${name}.${i}`,
          value: value.slice(i * MAX, (i + 1) * MAX),
        }))
  const u = new URL(baseURL)
  const secure = u.protocol === 'https:'
  const domain = u.hostname === 'localhost' ? 'localhost' : '.' + u.hostname.split('.').slice(-2).join('.')
  return parts.map((c) => ({ ...c, domain, path: '/', httpOnly: false, secure, sameSite: 'Lax' as const }))
}

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
 * Authenticate by minting a Supabase session and injecting its cookie into the browser
 * context, then navigate to the dashboard. The headless UI login form is flaky (PKCE cookie
 * timing) and doesn't persist across navigations, so we use the same cookie-injection the
 * reusable prod-check does. Reliable against both prod (app.indxr.ai) and local dev.
 */
export async function loginAs(page: Page, account: TestAccount): Promise<void> {
  const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'
  const { url, anon } = supabaseConfig()
  const sb = createClient(url, anon)
  const { data, error } = await sb.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })
  if (error) throw new Error(`loginAs(${account.email}) failed: ${error.message}`)
  await page.context().addCookies(sessionCookies(data.session, url, baseURL))
  await page.goto('/dashboard/library')
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
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
