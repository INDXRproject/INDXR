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
