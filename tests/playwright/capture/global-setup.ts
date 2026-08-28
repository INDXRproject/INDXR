import { chromium } from "@playwright/test"
import { loginAs } from "../helpers/auth"
import { account1 } from "../config/accounts"
import * as path from "path"

// Log in ONCE and persist the session + consent + theme to a storageState file, so every
// capture reuses it instead of minting a Supabase session per test (that per-test login is
// what pushed a full live run over the timeout). See playwright.capture.config.ts (use.storageState).
export const STORAGE_STATE = path.resolve(__dirname, "capture-state.json")

export default async function globalSetup() {
  const baseURL = process.env.BASE_URL ?? "http://localhost:3001"
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ baseURL })
  const page = await ctx.newPage()
  await loginAs(page, account1) // mints the Supabase session, injects cookies, lands on /dashboard
  // next-themes (attribute="data-theme", defaultTheme="system") reads localStorage 'theme'; an explicit
  // stored value wins over colorScheme. The session persisted here carries it, so a CAPTURE_THEME=dark
  // run records in dark. Default stays light → the still machine and the default video run are unchanged.
  const theme = process.env.CAPTURE_THEME === "dark" ? "dark" : "light"
  await page.evaluate((theme) => {
    localStorage.setItem(
      "indxr_consent",
      JSON.stringify({
        ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted",
        ad_personalization: "granted", version: "1", ts: 1785000000000,
      }),
    )
    localStorage.setItem("theme", theme)
  }, theme)
  await ctx.storageState({ path: STORAGE_STATE })
  await browser.close()
}
