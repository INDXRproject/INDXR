# LESSONS.md

Terugkerende valkuilen voor INDXR.AI. Lees bij sessiestart. Append-only door CC bij elke correctie van Khidr op een patroon (niet one-off).

Format: `[YYYY-MM-DD] <gebied>: <wat fout ging> → <regel om herhaling te voorkomen>`

---

[2026-05-04] arq: ack_late bestaat niet in arq 0.28.0 (Celery-concept) → bij crash-recovery design: ga uit van idempotency-vlaggen + watchdog cron, niet van library-features.
[2026-05-04] supabase: playlist-status enum is `'complete'` niet `'completed'` → wijk niet af van migratie-SQL als bron van waarheid voor status-strings.
[2026-05-04] supabase: `idempotency_keys` tabel is in ADR-019 beschreven maar nooit aangemaakt → verifieer tabel-bestaan via `information_schema.tables` voordat je ernaar verwijst in code.
[2026-05-04] yt-dlp: hergebruik van zelfde proxy-session bij retry helpt niet bij bot-detection → voor retries: nieuwe session-suffix.
[2026-05-04] sentry: serverless functions sturen geen envelope vóór process kill → altijd `await Sentry.flush(2000)` na captureException + `export const runtime = 'nodejs'` op API routes die capturen.
[2026-05-04] credits: nooit credits aftrekken via direct INSERT → altijd `deduct_credits_atomic` RPC of de geüpgrade `update_playlist_video_progress` RPC.
[2026-05-04] tiptap: `immediatelyRender: true` veroorzaakt SSR hydration mismatch → altijd `immediatelyRender: false`.
[2026-05-04] logging: uvicorn override't `logging.basicConfig` zonder `force=True`; Sentry SDK reset root logger ná init → na `sentry_sdk.init()` expliciet `logging.getLogger().setLevel(INFO)` zetten.
[2026-05-05] wiki-vs-code: known-issues.md claimde "rate limiting bewust uitgeschakeld" maar src/lib/ratelimit.ts deed wél echte Redis-calls totdat UPSTASH_* env vars op Vercel op Development scope werden gezet → 500K Upstash commands in 5 dagen mede-veroorzaakt door dit blinde-vlek. Verifieer wiki-claims over runtime-gedrag tegen bron-code, vooral bij infrastructuur-statements.
[2026-05-05] supabase: refresh_token_not_found in middleware veroorzaakt infinite refresh-loop in browser → blow-out van Vercel rate-limit Redis quota. Fix: in updateSession() try/catch om getUser(), bij auth error sb-* cookies clearen op response (met juiste domain + maxAge:0). Dit voorkomt dat één stale cookie per user uren-lang Vercel API resources opvreet. Migratie naar parent-domain cookies maakt dit kritiek omdat stale state op alle hosts blijft hangen.
[2026-05-05] next-server-actions: window.location.href na await serverAction() veroorzaakt "Error in input stream" TypeError omdat de browser de RSC action-response stream aborteert mid-transmission (Next.js GitHub #81377) → nooit window.location.href of router.push na een Server Action aanroep; gebruik redirect() in de Server Action zelf voor cross-host navigatie.
[2026-05-05] subdomain-split: redirect("/<auth-path>") in Server Components op app.indxr.ai veroorzaakt 307 → middleware 308 → cross-origin chain die RSC prefetch parser breekt → TypeError "Error in input stream". Server-side redirects MOETEN absolute marketing-URL gebruiken (NEXT_PUBLIC_MARKETING_URL) in subdomain-split setup, niet relatief.
[2026-05-04] subdomain-split: alle `<Link href="/<marketing-path>">` in components die op de app-host renderen (niet alleen shell-components zoals Header/Footer, ook alle children van dashboard pages zoals VideoTab, AudioTab, PlaylistTab, TranscriptViewer, TranscriptCard) veroorzaken Next.js prefetch-crash → TypeError: Error in input stream. Fix: vervang door `<a href={marketingHref(...)}>`. Inventaris-grep moet ALLE src/components/ + src/app/(app)/ scannen, niet alleen shells.
[2026-05-05] cross-host-links: audit cross-host links op drie patronen, niet alleen <Link>: (1) `<Link href="/pad">`, (2) `<a href="/pad">`, (3) `window.location.href = '/pad'`. Alle drie vereisen appHref()/marketingHref() wanneer de component op een andere host gerenderd kan worden.
[2026-05-05] env-vars: vermijd meerdere env-var-namen voor hetzelfde concept (NEXT_PUBLIC_SITE_URL naast NEXT_PUBLIC_APP_URL + NEXT_PUBLIC_MARKETING_URL is verwarrend). Eén concept = één var. Bij subdomain-split: NEXT_PUBLIC_APP_URL voor app-host, NEXT_PUBLIC_MARKETING_URL voor marketing-host.
[2026-05-05] vercel-limits: directe browser→Railway POST voor audio uploads omzeilt Vercel's 4.5MB request body limiet (AudioTab.tsx). Noem de env-var expliciet NEXT_PUBLIC_AUDIO_UPLOAD_URL zodat het doel helder is — niet NEXT_PUBLIC_PYTHON_BACKEND_URL hergebruiken voor dit specifieke geval.
[2026-05-05] git-workflow: CC heeft git commit uitgevoerd zonder expliciete toestemming → CC voert NOOIT git add/commit/push uit zonder expliciete toestemming per taak. Khidr geeft commit-toestemming in de taakprompt of in een vervolgbericht.
