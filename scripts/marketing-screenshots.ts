/**
 * Marketing screenshots for the demo library (Product Hunt, AlternativeTo, site).
 *
 * Logs in as demo@indxr.ai (a seeded, is_internal demo account — never a real user's library)
 * against https://app.indxr.ai and captures the fixed shot list into
 * docs/marketing/screenshots/2026-11/. Run via the e2e-runner shim, which resolves
 * @playwright/test + @supabase/supabase-js from the pnpm store (neither is hoisted to root):
 *
 *   DEMO_PASSWORD=... node tests/playwright/e2e-runner.mjs --script scripts/marketing-screenshots.ts
 *
 * (See tests/playwright/e2e-runner.mjs — it also accepts being pointed at an arbitrary script via
 * node's module loader, since this file is plain @playwright/test, not a spec run through the test
 * runner.) Simplest invocation is the one documented in README-style below the script.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { chromium, devices, type Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? "https://app.indxr.ai";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@indxr.ai";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const OUT_DIR = path.resolve(__dirname, "../docs/marketing/screenshots/2026-11");

if (!DEMO_PASSWORD) {
  console.error("DEMO_PASSWORD env var is required (the demo account's current password).");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Preset theme=light and an already-granted consent choice so neither the cookie banner nor a
// dark-mode flash ever enters a shot. Shape must match packages/shared/src/lib/consent.ts.
async function presetBrowserState(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light");
    window.localStorage.setItem(
      "indxr_consent",
      JSON.stringify({
        ad_storage: "granted",
        analytics_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        version: "1",
        ts: Date.now(),
      }),
    );
  });
}

const LOGIN_URL = process.env.LOGIN_URL ?? "https://indxr.ai/login";

async function login(page: Page) {
  await page.goto(LOGIN_URL);
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#password", DEMO_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

async function shoot(page: Page, name: string) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(OUT_DIR, name) });
  console.log("saved", name);
}

async function main() {
  const browser = await chromium.launch();

  // ── Desktop ────────────────────────────────────────────────────────────────
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktop = await desktopCtx.newPage();
  await presetBrowserState(desktop);
  await login(desktop);

  // 1. Library — All Transcripts, 3 collections visible in the sidebar.
  await desktop.goto(`${BASE_URL}/dashboard/library`);
  await shoot(desktop, "library-all.png");

  // 2. Library — PHIL 101 collection (6 transcripts; wait for the count to flip from "15" so we
  // don't catch the previous page's content mid-navigation, then for the spinner to clear).
  const philLink = desktop.getByRole("button", { name: /PHIL 101/ }).first();
  await philLink.click();
  await desktop.waitForURL(/collection=/);
  await desktop.getByText("6 transcripts").waitFor();
  await desktop.locator(".animate-spin").waitFor({ state: "detached" }).catch(() => {});
  await shoot(desktop, "library-collection.png");

  // 3. Library — search "trolley" (hit from transcript text, not title).
  await desktop.goto(`${BASE_URL}/dashboard/library`);
  await desktop.fill('input[placeholder="Search titles and transcript text…"]', "trolley");
  await desktop.waitForTimeout(500); // debounce
  await desktop.waitForLoadState("networkidle");
  await shoot(desktop, "library-search.png");

  // Open "Justice 01" for the transcript/summary/export shots.
  await desktop.goto(`${BASE_URL}/dashboard/library`);
  await desktop.getByText("Justice 01", { exact: false }).first().click();
  await desktop.waitForURL(/\/dashboard\/library\/[0-9a-f-]+/);

  // 4. Source card (desktop right column). Wait for the published-date lookup (fires once, on
  // first view) so the citation shows a real year instead of "n.d.".
  await desktop.getByText("Published").waitFor({ timeout: 15_000 }).catch(() => {});
  await shoot(desktop, "transcript-source-card.png");

  // 5. Transcript — Timestamps view.
  await desktop.getByRole("button", { name: "Timestamps" }).click();
  await shoot(desktop, "transcript-timestamps.png");

  // 6. Transcript — Paragraphs view.
  await desktop.getByRole("button", { name: "Paragraphs" }).click();
  await shoot(desktop, "transcript-paragraphs.png");

  // 7. Summary tab.
  await desktop.getByRole("tab", { name: "Summary" }).click();
  await desktop.waitForURL(/tab=summary/);
  await shoot(desktop, "summary.png");

  // 8. Export menu open (on the transcript view).
  await desktop.getByRole("tab", { name: "Transcript" }).click();
  await desktop.waitForURL(/tab=original|\/dashboard\/library\/[0-9a-f-]+$/);
  await desktop.getByRole("button", { name: "Export" }).click();
  await desktop.waitForTimeout(200);
  await shoot(desktop, "export-menu.png");
  await desktop.keyboard.press("Escape");

  // 9. Dashboard home.
  await desktop.goto(`${BASE_URL}/dashboard`);
  await shoot(desktop, "dashboard-home.png");

  // 10. Transcribe → YouTube, URL filled, not submitted.
  await desktop.goto(`${BASE_URL}/dashboard/transcribe?mode=video`);
  await desktop.fill('input[placeholder="https://www.youtube.com/watch?v=..."]', "https://www.youtube.com/watch?v=KqzW0eHzDSQ");
  await shoot(desktop, "transcribe-youtube.png");

  await desktopCtx.close();

  // ── Mobile (iPhone 14) ───────────────────────────────────────────────────
  const mobileCtx = await browser.newContext({ ...devices["iPhone 14"] });
  const mobile = await mobileCtx.newPage();
  await presetBrowserState(mobile);
  await login(mobile);

  await mobile.goto(`${BASE_URL}/dashboard/library`);
  await shoot(mobile, "mobile-library.png");

  await mobile.getByText("Justice 01", { exact: false }).first().click();
  await mobile.waitForURL(/\/dashboard\/library\/[0-9a-f-]+/);
  await shoot(mobile, "mobile-transcript.png");

  // 12. Mobile — zoomed crop on title + compact source row + sticky toolbar (the three things a
  // screenshot needs to sell "mobile works too"), not the full scrollable page.
  await mobile.waitForLoadState("networkidle");
  const toolbar = mobile.locator(".sticky.top-0.z-10").first();
  const toolbarBox = await toolbar.boundingBox();
  const viewport = mobile.viewportSize()!;
  if (toolbarBox) {
    await mobile.screenshot({
      path: path.join(OUT_DIR, "mobile-transcript-toolbar.png"),
      clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, toolbarBox.y + toolbarBox.height + 8) },
    });
    console.log("saved mobile-transcript-toolbar.png");
  } else {
    await shoot(mobile, "mobile-transcript-toolbar.png");
  }

  await mobileCtx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
