/**
 * Authenticated production DOM check (headless).
 *
 * Logs in as a real test account by injecting a Supabase session cookie into the browser
 * context (the marketing login form is flaky headless, so we mint the session via the
 * anon client and hand the cookie to Chromium). Then it drives app.indxr.ai as that user
 * and asserts on the live DOM — no local dev server needed.
 *
 * Run:  tests/playwright/prod-check.sh          (wrapper sets NODE_PATH for pnpm)
 * or:   NODE_PATH=... node tests/playwright/prod-check.cjs
 *
 * Standing checks run seed-free. The `[~]`-visual checks seed one Arabic-titled transcript +
 * collection AS the test user (RLS-scoped) and delete them afterwards.
 */
const { chromium, devices } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const APP = process.env.PROD_APP_URL || "https://app.indxr.ai";
const EMAIL = process.env.PROD_TEST_EMAIL || "test1@indxr-test.com";
const PASSWORD = process.env.PROD_TEST_PASSWORD || "TestPassword123!";

function readEnv() {
  const p = path.resolve(__dirname, "../../apps/app/.env.local");
  const env = fs.readFileSync(p, "utf8");
  return {
    url: env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(),
    anon: env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim(),
  };
}

function sessionCookies(session, supabaseUrl) {
  const ref = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase/)[1];
  const name = `sb-${ref}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
  const MAX = 3180;
  const parts = value.length <= MAX
    ? [{ name, value }]
    : Array.from({ length: Math.ceil(value.length / MAX) }, (_, i) => ({ name: `${name}.${i}`, value: value.slice(i * MAX, (i + 1) * MAX) }));
  return parts.map((p) => ({ ...p, domain: ".indxr.ai", path: "/", httpOnly: false, secure: true, sameSite: "Lax" }));
}

/** Reusable: run `fn(page, { sb, userId })` with an authenticated production browser context. */
async function withAuthedProd(fn, { device } = {}) {
  const { url, anon } = readEnv();
  const sb = createClient(url, anon);
  const { data, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error("login failed: " + error.message);
  const browser = await chromium.launch();
  const ctx = await browser.newContext(device ? { ...devices[device] } : {});
  await ctx.addCookies(sessionCookies(data.session, url));
  const page = await ctx.newPage();
  try {
    return await fn(page, { sb, userId: data.session.user.id });
  } finally {
    await browser.close();
  }
}

module.exports = { withAuthedProd };

// ── Runnable suite ───────────────────────────────────────────────────────────
if (require.main === module) {
  const results = [];
  const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`  ${ok ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`); };

  (async () => {
    // Standing, seed-free checks
    await withAuthedProd(async (page) => {
      await page.goto(`${APP}/dashboard/library`, { waitUntil: "networkidle", timeout: 40000 });
      await page.waitForTimeout(1500);
      check("library: new toolbar (filter+search testids, no grid toggle)",
        (await page.locator('[data-testid="library-filter"]').count()) > 0 &&
        (await page.locator('[data-testid="library-search"]').count()) > 0 &&
        (await page.locator('[aria-label="Grid view"]').count()) === 0);

      await page.goto(`${APP}/dashboard/credits`, { waitUntil: "networkidle", timeout: 40000 });
      await page.waitForTimeout(1000);
      const body = await page.locator("body").innerText();
      check("credits: money hub renders", /Credits balance/i.test(body) && /Buy credits/i.test(body) && /Credit activity/i.test(body));

      await page.goto(`${APP}/dashboard/billing`, { waitUntil: "networkidle", timeout: 40000 });
      await page.waitForTimeout(1000);
      check("redirect: /dashboard/billing → /dashboard/credits", page.url().includes("/dashboard/credits"));
    });

    // Mobile nav icons
    await withAuthedProd(async (page) => {
      await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle", timeout: 40000 });
      await page.waitForTimeout(1500);
      const nav = page.locator('nav[aria-label="Mobile navigation"]');
      const html = await nav.innerHTML();
      check("mobile nav: House (home) + message-square icons, no beehive/inbox",
        (await nav.isVisible()) && /lucide-house/.test(html) && /lucide-message-square/.test(html) &&
        !html.includes("M4 20.5a8 7.5 0 0 1 16 0") && !/lucide-inbox/.test(html));
    }, { device: "Pixel 7" });

    // Seeded [~] checks — Arabic RTL + mobile bulk bar + Radix-Sub focus
    const RTL_TITLE = "مرحبا اختبار الاتجاه في العنوان";
    const RTL_COLL = "مجموعة عربية للاختبار";
    await withAuthedProd(async (page, { sb, userId }) => {
      // Self-heal: clear any leftover markers from an interrupted prior run.
      await sb.from("transcripts").delete().eq("user_id", userId).in("video_id", ["vRTLchk", "vBulkChk"]);
      await sb.from("collections").delete().eq("user_id", userId).eq("name", RTL_COLL);
      // Seed as the user (RLS-scoped)
      const { data: tx } = await sb.from("transcripts").insert({
        user_id: userId, video_id: "vRTLchk", title: RTL_TITLE,
        transcript: [{ text: "x", offset: 0, duration: 1 }], duration: 300, processing_method: "youtube_captions",
      }).select("id").single();
      const { data: col } = await sb.from("collections").insert({ name: RTL_COLL, user_id: userId }).select("id").single();
      await sb.from("transcripts").update({ collection_id: col.id }).eq("id", tx.id);

      try {
        // 1) dir="auto" on the row title → computed rtl
        await page.goto(`${APP}/dashboard/library`, { waitUntil: "networkidle", timeout: 40000 });
        await page.waitForTimeout(1500);
        const rowTitle = page.locator(`a[href*="/dashboard/library/${tx.id}"]`).first();
        const rowDir = await rowTitle.getAttribute("dir");
        const rowComputed = await rowTitle.evaluate((el) => getComputedStyle(el).direction);
        check("dir=auto: row title attribute + computed rtl", rowDir === "auto" && rowComputed === "rtl", `dir=${rowDir} computed=${rowComputed}`);

        // 2) Radix Sub renders: row ⋯ → Move to collection ▸ shows the collection (Arabic)
        await rowTitle.hover();
        await page.locator('[aria-label="More actions"]').first().click();
        await page.getByText("Move to collection", { exact: true }).click();
        await page.waitForTimeout(400);
        const subCollVisible = await page.locator(`[dir="auto"]:has-text("${RTL_COLL}")`).first().isVisible().catch(() => false);
        check("Radix Sub: Move submenu opens and renders the collection", subCollVisible);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // 3) dir="auto" collection name + input focus — via the flat BULK Move menu (same component,
        //    no nested-Sub flakiness). Select the row → Move → assert dir + type into New collection.
        await page.locator('[role="checkbox"]').first().click();
        await page.waitForTimeout(400);
        await page.getByRole("button", { name: "Move", exact: true }).click();
        await page.waitForTimeout(400);
        const collSpan = page.locator(`[dir="auto"]:has-text("${RTL_COLL}")`).first();
        const collDir = await collSpan.getAttribute("dir");
        const collRtl = await collSpan.evaluate((el) => getComputedStyle(el).direction);
        check("dir=auto: Move-menu collection name (attribute + rtl)", collDir === "auto" && collRtl === "rtl", `dir=${collDir} computed=${collRtl}`);

        await page.getByText("New collection…", { exact: true }).click();
        const newInput = page.locator('input[placeholder="Collection name…"]').first();
        await newInput.fill("اختبار التركيز");
        const val = await newInput.inputValue();
        check("Move-menu focus: new-collection input keeps typed value (menu stays open)", (await newInput.isVisible()) && val === "اختبار التركيز", `val=${val}`);
        await page.keyboard.press("Escape");

        // 4) Mobile: row action sheet title carries dir=auto (RTL) — the third title location
        await page.setViewportSize({ width: 390, height: 800 });
        await page.goto(`${APP}/dashboard/library`, { waitUntil: "networkidle", timeout: 40000 });
        await page.waitForTimeout(1200);
        await page.locator('[aria-label="Row actions"]').first().click();
        await page.waitForTimeout(400);
        const sheetTitle = page.locator(`[dir="auto"]:has-text("${RTL_TITLE}")`).first();
        const stDir = await sheetTitle.getAttribute("dir");
        const stRtl = await sheetTitle.evaluate((el) => getComputedStyle(el).direction).catch(() => "n/a");
        check("dir=auto: mobile row-sheet title (attribute + rtl)", stDir === "auto" && stRtl === "rtl", `dir=${stDir} computed=${stRtl}`);
      } finally {
        // Cleanup
        await sb.from("transcripts").delete().eq("id", tx.id);
        await sb.from("collections").delete().eq("id", col.id);
      }
    });

    // 3) Mobile bulk bar never covers the tab bar (360 & 404)
    for (const width of [360, 404]) {
      await withAuthedProd(async (page, { sb, userId }) => {
        const { data: tx } = await sb.from("transcripts").insert({
          user_id: userId, video_id: "vBulkChk", title: "Bulk bar overlap check",
          transcript: [{ text: "x", offset: 0, duration: 1 }], duration: 120, processing_method: "youtube_captions",
        }).select("id").single();
        try {
          await page.setViewportSize({ width, height: 780 });
          await page.goto(`${APP}/dashboard/library`, { waitUntil: "networkidle", timeout: 40000 });
          await page.waitForTimeout(1500);
          await page.getByRole("button", { name: "Select" }).first().click().catch(() => {});
          await page.waitForTimeout(300);
          // tap the row checkbox (first checkbox in the list area)
          await page.locator('button[role="checkbox"], [role="checkbox"]').first().click().catch(() => {});
          // fallback: click the visible checkbox control
          await page.waitForTimeout(600);
          const bulk = page.locator('[data-testid="bulk-bar-mobile"]').first();
          const tabbar = page.locator('nav[aria-label="Mobile navigation"]');
          const b = await bulk.boundingBox();
          const t = await tabbar.boundingBox();
          const ok = b && t ? b.y + b.height <= t.y + 1 : false;
          check(`mobile bulk bar @${width}px sits above the tab bar (no overlap)`, ok, b && t ? `bulk.bottom=${Math.round(b.y + b.height)} tabbar.top=${Math.round(t.y)}` : "boxes not found");
        } finally {
          await sb.from("transcripts").delete().eq("id", tx.id);
        }
      }, { device: "Pixel 7" });
    }

    const failed = results.filter((r) => !r.ok);
    console.log(`\n${failed.length === 0 ? "ALL PASS ✓" : `${failed.length} FAILED ✗`} (${results.length} checks)`);
    process.exit(failed.length === 0 ? 0 : 2);
  })().catch((e) => { console.error("SUITE ERROR:", e.message); process.exit(1); });
}
