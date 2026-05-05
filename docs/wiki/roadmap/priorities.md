# Launch Priorities (Plan van Aanpak)

Bijgewerkt: 2026-04-26. Single source of truth voor pre-launch volgorde, na strategische sessie met Claude Desktop.

Deze lijst is het Plan van Aanpak (PVA) tot launch. Volgorde is geoptimaliseerd voor solo-developer, met afhankelijkheden in acht genomen. Status-markers per item: `[ ]` todo, `[~]` in progress, `[x]` done, `[!]` blocked.

Voor de strategische "waarom" achter de architectuur-keuzes in Fase 1, zie ADR-019 t/m ADR-024.

---

## Fase 1 — Pre-launch blockers

Geschatte totale doorlooptijd: 13–17 werkdagen.

### Zachte landing — geïsoleerde quick wins (eerst)

Reden voor deze volgorde: Sentry vroeg = we vangen onze eigen wijzigingen op. Smart polling, caption cache en User Feedback widget zijn los staand zonder onderlinge afhankelijkheden.

- [x] **1.1 — Sentry frontend + backend** ✅ 2026-04-27
    **Geïnstalleerd:** `@sentry/nextjs@^10.50.0`, `sentry-sdk[fastapi]==2.58.0`
    **Geverifieerd:** "Sentry backend test — intentional error" zichtbaar in INDXR-BACKEND project; frontend error zichtbaar in INDXR-FRONTEND project.
    **Instrumentation:** `instrumentation.ts` + `instrumentation-client.ts` nieuw aangemaakt (Next.js 16 App Router patroon). Geen gotcha's.
    Doel: error tracking actief vóór alle andere Fase 1 werk.
    Stack: `@sentry/nextjs` (frontend), `sentry-sdk[fastapi]` (backend), `tracesSampleRate: 0.1`, source map upload geconfigureerd.
    Zie [ADR-023](../decisions/023-observability-stack.md).
    **Geïnstalleerd:** `@sentry/nextjs@^10.50.0`, `sentry-sdk[fastapi]==2.58.0`
    **Instrumentation:** `instrumentation.ts` + `instrumentation-client.ts` nieuw aangemaakt (geen bestaand bestand gevonden).
    **Gotcha's:** Geen — Next.js 16.1.4 + @sentry/nextjs@10 zonder problemen.

- [x] **1.2 — Sentry User Feedback widget** ✅ 2026-04-27
    Plek: `/dashboard/account` — "Report a Problem" card onderaan (SentryFeedbackCard client component).
    Sentry.setUser() gezet via useEffect; dialog via createForm() → appendToDom() → open().
    Geverifieerd: test-report binnengekomen in Sentry Inbox.

- [x] **1.3 — Smart polling backoff** ✅ 2026-04-27
    `getPollingInterval()` in `src/lib/pollingBackoff.ts`: 1s (0–30s) → 5s (30–300s) → 15s (300s+).
    VideoTab + AudioTab: elapsed-based interval in for-loop. PlaylistTab: setInterval → recursive setTimeout.
    Geverifieerd op 8-min AssemblyAI job — polls bouwden op van ~1s naar ~5s.

- [x] **1.4 — Caption cache in Redis** — geverifieerd door Khidr
    Doel: 30–60% reductie in yt-dlp calls voor herhaalde video's, bescherming tegen bot-detection, kostenbesparing op AssemblyAI.
    Sleutel: `caption:{video_id}:{lang}`, TTL 30 dagen, op bestaande Upstash Redis.
    PostHog-events: `cache_hit`, `cache_miss`.
    Cross-user cache geverifieerd via tweede account — HIT op DZ6mNMS0HQ0 in <200ms, geen yt-dlp call.

### Architectuur-fundament

Reden voor deze volgorde: ARQ-queue is fundament voor 1.6 t/m 1.10. yt-dlp cascade hangt aan queue (cascade-stappen worden queue-jobs). Graceful shutdown logisch ná queue. R2 logisch vóór master_transcripts (transcripts worden in R2 opgeslagen).

- [~] **1.5 — ARQ via Upstash Redis + per-video decompositie + idempotency keys** (3 dagen)
    Doel: durable job queue die Railway container-restarts overleeft. 500-video playlist wordt 500 onafhankelijke jobs (één gefaalde video sloopt niet de hele batch).
    Stack: ARQ als aparte Railway worker-service naast bestaande FastAPI API-service.
    Idempotency: tabel `idempotency_keys` met TTL 24u op POST-endpoints.
    Zie [ADR-019](../decisions/019-arq-job-queue.md).
    Fasenplan: Fase 0 ✅ | Fase 1 ✅ | Fase 2 (Whisper→ARQ) ✅ 2026-04-27 | Fase 3a ✅ (Supabase-laag + RPC) | Fase 3b.1 ✅ (RPC status-fix) | Fase 3b.2 ✅ (per-video chain code) | Fase 3b.3 ✅ (deploy + verificatie 22-video productietest) | Fase 4 ✅ (heartbeat + stale-detectie + atomic credit-deductie + idempotency-vlaggen) | Fase 5 TBD.
    **Fase 4 opgeleverd 2026-04-30:** heartbeat (`last_heartbeat_at` elke 60s in `transcription_jobs` en `playlist_extraction_jobs`), stale-detectie in poll-endpoints (300s threshold → status `interrupted`), atomische credit-deductie via `update_playlist_video_progress` RPC (M3 migratie, `v_already_done` idempotency), `credits_deducted` vlag op `transcription_jobs` (M1), uuid5 deterministische Whisper job-IDs in playlist-keten. `ack_late=True` is **niet** geïmplementeerd — bestaat niet in arq 0.28.0 (Celery-concept). Automatische crash-recovery vereist een custom watchdog cron job (zie backlog) of library-swap. Zie ADR-019 voor volledige uitleg.
    **Fase 2 verificatie 2026-04-27:** YouTube Whisper bewezen via worker (job 2c11e87d, 26.54s end-to-end, bao5kiMmXoU). Upload-pad blijft asyncio in API-process bewezen (job fea97ef1, 9.2s). Drie deployment-issues tijdens verificatie opgelost: UPSTASH_REDIS_URL ontbrak op API-service, 8 env vars ontbraken op worker, PROXY_PASSWORD mismatch. Code zelf werkte correct.
    **ARQ library-keuze 2026-04-28:** Tijdens voorbereiding Fase 3 ontdekt dat ARQ in maintenance-only mode zit. Na grondige research besluit Khidr ARQ te houden tot post-launch heroverweging — zie ADR-026. Per-video architectuur (Fase 3) is library-onafhankelijk en wordt gebouwd op ARQ. Latere migratie naar Taskiq/streaq/Procrastinate is geschat 1-2 dagen werk omdat alle state in Supabase leeft (zie ADR-019 sectie Migratie-pad).
    Scope-beslissing: audio-upload pad blijft op asyncio.create_task (bytes in memory, korte flow); YouTube-extracties via ARQ. Zie ADR-019.
    **Fase 3b.2 geïmplementeerd 2026-04-28:** youtube_utils.py + transcription_pipeline.py nieuw; worker.py uitgebreid met process_playlist_video + process_playlist_retries; main.py: run_whisper_job + run_playlist_job verwijderd; /api/playlist/extract → ARQ enqueue.
    **Fase 3b.3 geverifieerd 2026-04-28:** 22-video playlist (Joe Rogan, 3 Whisper + 19 captions) in productie getest. 18/22 succesvol in 295s. 45cr afgetrokken. 4 failures allemaal YouTube-kant (2× bot_detection, 1× youtube_restricted, 1× extraction_error). Architecture chain volledig gevalideerd. Zie test-reports.md voor volledig rapport.

- [x] **1.5b — Error taxonomie documentatie** ✅ 2026-04-28
    Doel: één plek voor alle error_types met categorie, user-facing message, en mitigatie. Input voor taak 1.6 (cascade-prioritering), 1.10 (user-friendly messages), 1.19 (UI bugs).
    Zie [wiki/operations/error-taxonomy.md](../operations/error-taxonomy.md).
    Status: afgerond. 9 error_types gedocumenteerd. Raw yt-dlp logging bij `extraction_error` geïmplementeerd (`_classify_download_error()` logt nu raw error + video_id + job_id op WARNING). bgutil startup logging verbeterd in `main.py` + worker health check bij startup toegevoegd.

- [x] **1.6 — yt-dlp fallback-cascade met client-rotatie** ✅ 2026-04-29
    Cascade-stappen 1–3 (caption extractie, gratis product) volledig geïmplementeerd en in productie geverifieerd:
    1. ✅ youtube-transcript-api (2026-04-28)
       `extract_via_youtube_transcript_api()` in youtube_utils.py; geïntegreerd in main.py + worker.py
       Metadata-aanvulling via YouTube Data API `videos.list` na stap 1 succes ✅ 2026-04-28 (ADR-028)
       Logging volledig diagnose-vriendelijk ✅ 2026-04-28 — per-exception INFO; `[YT-API] attempting {video_id}` bij elke poging
    2. ✅ yt-dlp `ios,web_embedded` client — geformaliseerd als stap 2 met [YT-DLP] logging + model_quality_rank=20 ✅ 2026-04-29
       Geverifieerd in productie 2026-04-29 — vier scenario's bewezen (cache-hit, stap 1 succes, stap 1→2 cascade overgang, MembersOnly fail-fast)
    3. ✅ yt-dlp `tv,android` client-rotatie (vervangt bgutil, zie ADR-027) — geïmplementeerd 2026-04-29
       [YT-DLP-ROT] log-prefix, model_quality_rank=15, triggered alleen bij stap 2 extraction error (niet bij no_captions/MembersOnly)

    De oorspronkelijk geplande "stap 4 (audio→AssemblyAI)" en "stap 5 (needs_manual_review)" zijn herzien
    als architectuur-keuze: AssemblyAI is een apart product (betaalde AI transcription, user-gestuurd) en
    geen cascade-stap binnen het gratis caption-product. needs_manual_review wordt vervangen door duidelijke
    error_type-gebaseerde messaging in taak 1.19b. Zie ADR-029.

- [x] **1.7 — Graceful shutdown / crash-recovery** ✅ 2026-05-01
    Doel: in-flight jobs persisteren bij Railway restart in plaats van verdwijnen.
    **Wat Fase 4 opgeleverd heeft (2026-04-30):** heartbeat (`last_heartbeat_at` elke 60s), stale-detectie in poll-endpoints (300s threshold → status `interrupted`), idempotency-vlaggen (`credits_deducted`, `v_already_done`) zodat handmatige herstart geen dubbele kosten geeft.
    **Watchdog ARQ cron (2026-05-01):** `watchdog_interrupted_jobs` cron elke 2 minuten. Pass 1: re-enqueue `interrupted` jobs met `watchdog_attempts=0`, credits deducted, geen transcript, heartbeat stale >5min. Pass 2: auto-refund voor jobs met `watchdog_attempts>=1` en heartbeat stale >5min (~10 min na mislukte re-enqueue, geen 24u-pad). Migratie: `20260501_watchdog_attempts.sql` — live op productie 2026-05-02.
    Zie [ADR-019](../decisions/019-arq-job-queue.md) en [ADR-030](../decisions/030-fase4-crash-recovery-leerervaring.md).

- [x] **1.8 — Cloudflare R2 storage helper** ✅ 2026-04-28
    `backend/storage.py`: boto3 wrapper (`r2_client`, `r2_write_json`, `r2_read_json`, `r2_generate_presigned_url`). Graceful degradatie bij ontbrekende env vars.
    **Handmatig nog te doen door Khidr:** Cloudflare R2 buckets aanmaken (`indxr-audio` + `indxr-transcripts`), API tokens per bucket, lifecycle rule 24u op `indxr-audio`, Railway env vars zetten (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
    Buckets: `indxr-audio` (TTL 24u, auto-delete na transcriptie), `indxr-transcripts` (persistent).
    Library: `boto3==1.42.97`.
    Zie [ADR-020](../decisions/020-cloudflare-r2-storage.md).

- [x] **1.9 — `master_transcripts` schema + write-logic** ✅ 2026-04-28
    Migratie: `20260428_master_transcripts_cache.sql` (tabel + index + RLS).
    `backend/master_cache.py`: `master_transcripts_write()` + constanten `CAPTION_REFRESH_DAYS=90`, `MODEL_QUALITY_RANK`, `CURRENT_PRODUCTION_AI_MODEL`.
    Write-only: cascade stap 1 + 2 schrijven na elke succesvolle caption-extractie. Read-logic (cache-hits) volgt in 1.11.
    **Handmatig nog te doen door Khidr:** Supabase migratie uitvoeren via MCP of SQL Editor.
    Afhankelijk van: 1.8.
    Zie [ADR-021](../decisions/021-master-transcripts-cache.md).

### Realtime + cache activatie

- [x] **1.10 — Supabase Realtime als primaire methode + smart polling als fallback** ✅ 2026-05-01
    Doel: instant UX-updates op job-state changes, met polling als robuuste fallback voor users achter firewalls.
    **Geïmplementeerd:** `src/hooks/useJobStatus.ts` — gedeelde hook met `postgres_changes` Realtime-subscription (gefilterd op `id=eq.{jobId}`) + backoff polling loop als fallback/data source. VideoTab, AudioTab, PlaylistTab gerefactored: `pollWhisperJob`, `runPollLoop`, `startPollInterval` vervangen door hook. RLS geverifieerd: `transcription_jobs` `USING (auth.uid() = user_id)` blokkeert cross-user Realtime events.
    Zie [ADR-022](../decisions/022-realtime-plus-polling-fallback.md).

- [x] **1.11 — `master_transcripts` cache read-logic** ✅ 2026-05-01
    Doel: cache-hits leveren bij herhaalde transcripties. Flow: bij nieuwe aanvraag → check cache op `(video_id, language, transcription_model)` → hit: kopieer naar `user_transcripts`, trek credits af, klaar → miss: normale flow, vul cache na succes.
    **Geïmplementeerd:** `master_transcripts_read()` in `backend/master_cache.py`. Geïntegreerd in `/api/extract/youtube` (main.py, na Redis miss), `_process_caption_video` (worker.py) en `run_whisper_job` (worker.py). Caption-entries verlopen na 90 dagen; AI-entries gefilterd op `model_quality_rank`. Standaard `language='en'` voor caption-lookup — non-EN valt door naar yt-dlp cascade (backlog).
    Gebruikers betalen ALTIJD voor AI-transcriptie, ook bij cache-hit (zie ADR-021).
    Zie [ADR-021](../decisions/021-master-transcripts-cache.md).

### Launch-noodzaak

- [ ] **1.12 — Anti-abuse op welcome credits** (1–2 dagen)
    Doel: voorkom credit-farming bij launch.
    Componenten: email-verificatie API (Kickbox of Clearout), Cloudflare Turnstile op signup, device fingerprint hash, disposable email blocklist (github.com/disposable/disposable). Welcome credits worden pas toegekend NA verificatie.
    Zie [ADR-024](../decisions/024-anti-abuse-welcome-credits.md).

- [ ] **1.13 — Stripe live-mode activatie + Radar config** (4u)
    Doel: live betalingen + fraud-bescherming.
    ⚠️ Vóór uitvoering: zie [ADR-012 sectie "Pricing-evolutie"](../decisions/012-pricing-tiers.md) — nieuwe prijspunten vaststellen en early-adopter strategie bepalen vóór producten aanmaken in Stripe.
    Componenten:
    - Stripe account activeren met KVK/bedrijfsinfo
    - 5 producten in live mode (Try €2.49/200cr, Basic €5.99/500cr, Plus €11.99/1100cr, Pro €24.99/2600cr, Power €49.99/5500cr) — prijzen herzien vóór aanmaken (zie ADR-012)
    - `PACKAGES` in `src/app/api/stripe/checkout/route.ts` synchroniseren met live-prijzen
    - Webhook endpoint registreren op `https://indxr.ai/api/stripe/webhook`
    - `STRIPE_WEBHOOK_SECRET` toevoegen aan Vercel
    - Radar-rules: blok > 1 charge/IP/uur, request 3DS bij risk_score > 65, blok highest risk_level, eerste-charge cap
    - `has_ever_purchased` implementeren in webhook → `profiles.has_ever_purchased = true`, `isPaidUser` boolean in `AuthContext` uitlezen.

- [ ] **1.14 — BetterStack uptime + healthchecks.io heartbeats** (1u)
    Doel: outage-detection en publieke status-page.
    Monitors: frontend, backend health, DB connectivity, transcription worker.
    Heartbeats: ARQ queue, Stripe webhook handler, daily backup.
    Zie [ADR-023](../decisions/023-observability-stack.md).

- [ ] **1.15 — Crisp chat widget** (2u)
    Doel: support-channel voor troubleshooting en bug-reports (gescheiden van Sentry User Feedback dat voor errors is).
    Embed in Next.js layout, custom fields voor authenticated users (credits, plan-tier, recent jobs).
    Zie [ADR-023](../decisions/023-observability-stack.md).

- [ ] **1.16 — Contact form voor suggesties/feedback** (3u)
    Doel: simpel inkomstenkanaal voor feature requests zonder betaalde tools (Canny later evalueren als volume rechtvaardigt).
    Implementatie: form op `/contact` of in account-settings, schrijft naar nieuwe Supabase-tabel `feedback_submissions`, email-notificatie naar Khidr.

- [ ] **1.17 — Minimaal admin-dashboard met PostHog deeplinks gefixed** (1 dag)
    Doel: launch-essentials voor user management. Volledige admin-dashboard volgt in Fase 2.
    Componenten: user search + view, suspend/unsuspend, manual credits add/remove, laatste 50 transactions, recent failed jobs met Sentry deeplinks, **bestaande PostHog deeplinks per user fixen** (werken nu niet), processing times en error rates per tijdvenster (zie known-issues).

- [ ] **1.18 — GDPR-basis** (1 dag)
    Doel: EU-compliance voor launch.
    Componenten: privacy policy met sub-processors lijst, ToS, cookie consent (PostHog cookieless mode of Klaro), data export API, data delete flow.
    Templates: iubenda of GDPR.eu als basis.

- [ ] **1.19 — Bekende UI-bugs en infrastructuur-fixes** (~2u)
    - AssemblyAI completion message: charged credits weergeven (bekende UI-bug)
    - VTT httpx timeout van 30s naar 60s
    - `LOG_LEVEL=WARNING` instellen in Railway (nu `INFO` — logs lopen vol)
    - Supabase database backups configureren in Supabase Dashboard
    - Upstash Redis rate limiting activeren in `src/lib/ratelimit.ts` (nu no-op tijdens testfase)
    - Supabase email-verificatie aanzetten (uitgeschakeld tijdens dev)

- [ ] **1.19b — Error messaging audit + AI-suggestie differentiatie** (1 dag)
    Doel: alle user-facing error messages uitwerken op basis van error-taxonomy.md, en
    AI-transcription suggestie alleen tonen waar het zinvol en eerlijk is.
    Componenten:
    - Voor elk error_type uit error-taxonomy.md: user-facing message v2 (helderder, eerlijker dan v1)
      + bepaal of AI-suggestie passend is
    - Backend: zorg dat error_type consistent wordt teruggegeven in response van
      /api/extract/youtube voor alle eindstaten
    - Frontend: AI-suggestie alleen tonen op basis van whitelist:
        - JA: no_captions (met "if no speech, full refund" disclaimer)
        - JA: bot_detection (met "wait or use AI" twee opties)
        - JA: extraction_error
        - NEE: members_only, age_restricted, youtube_restricted, no_speech
    - error-taxonomy.md uitbreiden met kolom "AI-suggestie passend?"
    Afhankelijk van: 1.5b (error taxonomy), 1.6 (cascade afgerond) ✅
    Plek in volgorde: vóór 1.20 (polish), zodat error-states correct zijn vóór cosmetische polish.
    Zie ADR-029 voor de conceptuele basis.

- [ ] **1.20 — Lichte cosmetische polish over alle UI** (1–2 dagen)
    Doel: launch-ready visuele kwaliteit zonder volledige redesign.
    Scope: typografie consistent, spacing systematiseren, één primaire kleur duidelijk vastgelegd, geen toasts (regel was al), inline error/success states polishen.
    GEEN volledige redesign — die komt in Fase 3 wanneer product-market-fit signalen er zijn.
    Plek in volgorde: laatste van Fase 1 zodat alle UI-componenten al bestaan.

### Pre-launch — buiten code (parallel uit te voeren)

- [ ] Google Search Console: domein verifiëren, sitemap indienen
- [ ] Google Analytics 4: opzetten naast PostHog (zie ADR-023 — alleen voor Google Ads attributie)
- [ ] Google Ads account aanmaken + eerste campagne voorbereiden (US markt, longtail keywords rondom YouTube transcripts en AI/RAG)

### Pre-launch — testen

- [ ] **4+ uur video stress test** — Whisper-transcriptie op video > 4 uur. Test of Railway-restart-mitigatie (1.7) werkt zoals verwacht.
- [ ] **Anonymous user flow Playwright tests** — anonieme gebruiker → free tool → gated feature → signup prompt → registratie. Voorkomt foutmeldingen waar signup-prompt hoort.

### Pre-launch — SEO content

- [ ] Longform: "How to use YouTube transcripts for RAG and vector databases" — gericht op AI/developer doelgroep, linkt naar RAG JSON export.
- [ ] Longform: "YouTube transcript JSON format — complete guide" — informationeel, hoog zoekvolume.

### Polish / deferred UI

Items die bewust buiten scope zijn gehouden in skeleton-bouw sessies. Te oppakken in Claude Design rondje of dedicated polish-sessie.

- [ ] **Format-export gating (friction case 3c)** — Anonymous users die een non-TXT export proberen (Markdown, JSON, CSV, SRT, VTT) zouden een inline `FrictionConversionCard` moeten zien i.p.v. directe download. Vereist aanpassing van `src/components/TranscriptCard.tsx`: per format-knop controleren op `user` auth-state en bij anonymous een inline card tonen. Deferred vanwege scope ("backend logica niet aanraken" in Batch 1).
- [ ] **Playlist eerste-3-free UI** — Visueel onderscheid "Free" vs "Sign up to extract" per video in de PlaylistTab/PlaylistManager. Vereist aanpassing van `src/components/PlaylistManager.tsx` om per-video-rij een badge of state te tonen. Deferred naar content/design-pass.

Zie ook `docs/wiki/architecture/page-structures/free-tool.md` voor context.

### Pre-launch — bestaande features afronden

- [ ] **Opus 249 audio format valideren en deployen** — kwaliteitstest op 50 diverse video's, dan format selector aanpassen. Zie ADR-016. ~63% reductie in proxy-bandbreedte.
- [ ] **Website copy volledig herschrijven** — landing page, pricing, FAQ, onboarding, error messages. Plaats: vóór 1.20 (polish heeft definitieve copy nodig).
- [ ] **RAG JSON: Settings chunk size ✓ feedback zichtbaarheid** — zie known-issues. Kleine fix in `DeveloperExportsCard.tsx`.
- [ ] **RAG JSON export (30-seconden chunks)** — kernfeature voor AI/developer doelgroep, zie ADR-015.

---

## Werksessie C — app.indxr.ai subdomain split

Doel: `/dashboard` en `/admin` verhuizen van `indxr.ai` naar `app.indxr.ai`. Auth-flows (login, signup, OAuth) blijven op marketing-domain; cookies op root-domain `.indxr.ai` zodat sessie cross-host werkt. Zie ADR-034 en ADR-036.

Geïmplementeerd 2026-05-04/05 (Code Sessie 1). Code Sessie 2 (mechanische sweep) nog te doen.

### Code Sessie 1 — auth / cookies / middleware

- [~] **C.1.1 — Auth-error recovery in updateSession** — geïmplementeerd 2026-05-05
  `clearAuthCookies()` toegevoegd aan `src/utils/supabase/middleware.ts`: bij `getUser()` error of exception worden alle `sb-*` cookies gewist met `maxAge: 0` en correcte `cookieDomain`. Voorkomt infinite refresh-loop bij stale/revoked tokens (root cause Upstash quota blow-out — zie C.3.1). Sentinel: `[auth-recovery]` in Vercel logs.
  **Productie-verificatie pending** — Khidr: na deploy een verlopen sessie simuleren (revoke refresh token via Supabase Dashboard → refresh pagina → verwacht: cookies verdwenen, geen retry-loop, `[auth-recovery]` in logs).

- [ ] **C.1.2 — Productie-tests na sessie 1 deploy**
  Handmatig browser-tests na Vercel-deploy met `NEXT_PUBLIC_APP_URL=https://app.indxr.ai` en `NEXT_PUBLIC_MARKETING_URL=https://indxr.ai`:
  - `sb-*` cookies staan op domain `.indxr.ai` (zichtbaar op beide hosts in DevTools)
  - `indxr.ai/dashboard` → 308 → `app.indxr.ai/dashboard`
  - `app.indxr.ai/` → redirect → `/dashboard`
  - `app.indxr.ai/dashboard` zonder sessie → `indxr.ai/login?next=https://app.indxr.ai/dashboard`
  - Na login: belandt op `app.indxr.ai/dashboard`
  - Logout: `sb-*` cookies verdwenen op beide hosts
  - `login?next=https://evil.com/steal` → belandt op `/dashboard/transcribe` (open redirect preventie)

- [ ] **C.1.3 — Google OAuth flow productie-test**
  Verifieer vóór test in Vercel Dashboard: is `NEXT_PUBLIC_ENABLE_OAUTH=true` op Production scope gezet? Als nee: OAuth-knoppen niet zichtbaar — skip test.
  Test: Google-login op `indxr.ai/login` → OAuth callback op `indxr.ai/auth/callback` → redirect naar `app.indxr.ai/dashboard/transcribe`. Controleer: cookie op `.indxr.ai`, sessie zichtbaar op beide hosts.

### Code Sessie 2 — mechanische sweep

- [ ] **C.2.1 — Manifest CORS bug** ⚠️ BEVESTIGD
  `src/app/layout.tsx:35: manifest: "/site.webmanifest"` — op `app.indxr.ai` vraagt de browser `app.indxr.ai/site.webmanifest` op; middleware geeft 308 → `indxr.ai/site.webmanifest` (cross-origin redirect) → CORS block in Console. Rapportage Khidr bevestigd via codebase.
  **Fix:** `manifest: "/site.webmanifest"` → `manifest: "https://indxr.ai/site.webmanifest"` in `src/app/layout.tsx`. Of voeg een `(app)`-groep-layout toe die de manifest-tag overschrijft.

- [ ] **C.2.2 — Header: `/dashboard` links → `appHref`** ⚠️ NIEUW (niet in advieslijst)
  `src/components/Header.tsx` heeft 3× `<Link href="/dashboard">` (regel 41 dropdown, regel 140 desktop "Go to app", regel 195 mobile). Op `indxr.ai` prefetcht Next.js `indxr.ai/dashboard` → 308 → `app.indxr.ai/dashboard` (cross-origin) → zelfde TypeError-crash als de omgekeerde fix in sessie 1. Alle drie moeten `<a href={appHref('/dashboard')}>` worden.

- [ ] **C.2.3 — Email templates audit** — handmatige check Khidr
  Supabase Dashboard → Auth → Email Templates. Controleer of `{{ .SiteURL }}` variabelen correct resolven naar `https://indxr.ai` (confirm/reset links moeten naar marketing-host verwijzen, niet naar app). Niet code-verifieerbaar.

- [ ] **C.2.4 — Python backend CORS origins** ⚠️ BEVESTIGD
  `backend/main.py:151-161`: `allow_origins` bevat `https://indxr.ai` en `https://www.indxr.ai` maar **niet** `https://app.indxr.ai`. Browser op `app.indxr.ai` maakt directe POST calls naar Railway voor audio-uploads (`NEXT_PUBLIC_PYTHON_BACKEND_URL` — gevonden op `AudioTab.tsx:349`). Deze calls falen met CORS-error.
  **Fix:** `"https://app.indxr.ai"` toevoegen aan `allow_origins` in `backend/main.py:155` (na `"https://www.indxr.ai"`).

- [ ] **C.2.5 — Robots.txt strategie voor app-host**
  `public/robots.txt` bevat `Disallow: /dashboard/` en `Disallow: /admin/` — correct voor marketing-host. Op `app.indxr.ai` geeft middleware `/robots.txt` een 308 naar `indxr.ai/robots.txt`; sommige crawlers volgen geen redirects voor robots.txt. Ideaal: `app.indxr.ai/robots.txt` retourneert `Disallow: /` inline. Optie: voeg `/robots.txt` toe als uitzonderingspad in middleware (`!isAppPath` skip) en serveer via Next.js `src/app/robots.ts` met host-detectie.

### Operationele issues

- [!] **C.3.1 — Upstash Redis quota exhausted — BLOCKER voor async jobs**
  500K commands/maand limiet bereikt op 2026-05-04. Bewezen oorzaak: stale `.indxr.ai` cookies triggerde infinite refresh-loop in browser; elke loop-call passeerde middleware met Redis rate-limit-check. C.1.1 fix sluit de oorzaak af.
  **Huidige staat:** `UPSTASH_REDIS_REST_URL` + `_TOKEN` op Development scope gezet in Vercel → `UPSTASH_ENABLED=false` in productie → `noopLimiter` actief → rate limiting uitgeschakeld, caption cache uitgeschakeld. Railway ARQ worker: vermoedelijk ook geraakt door quota (geen async jobs in productie mogelijk).
  **Beslissing nodig:** Upstash plan upgraden (Pay-as-you-go of Pro) vs Redis op Railway zelf vs wachten op maandelijkse reset. Prioriteit: vóór launch met paid users.
  **Inconsistentie met known-issues.md:** `docs/wiki/operations/known-issues.md:44-47` stelt "rate limiting is bewust uitgeschakeld". Dit was **incorrect** — de code (`src/lib/ratelimit.ts`) deed wél echte Redis-calls zolang de env vars beschikbaar waren op Production scope. Ze waren actief, niet bewust uitgeschakeld. LESSONS.md bijgewerkt.

- [~] **C.3.2 — Rate limiting en caption cache uitgeschakeld in productie**
  Direct gevolg van C.3.1-mitigatie. `noopLimiter` actief → geen rate limiting in productie. Caption cache (Upstash Redis) ook down.
  **Pre-launch actie:** herstellen zodra C.3.1 opgelost. Cross-referentie: item 1.19 ("Upstash Redis rate limiting activeren") in Fase 1.
  **Status:** tijdelijk acceptabel, geen blocker voor verdere development. Niet lanceren met paid users zonder rate limiting.

---

## Fase 2 — Eerste 30 dagen na launch (data-gestuurd)

Trigger-gebaseerd, niet vooraf gepland. Implementeer wanneer productie-data het signaal geeft.

- [ ] **2.1 — Circuit breakers via PyBreaker** rond yt-dlp, AssemblyAI, DeepSeek
    Trigger: eerste cascading failure in Sentry.
- [ ] **2.2 — Connection pooling correct gezet** (Transaction Pooler poort 6543, asyncpg `statement_cache_size=0`)
    Trigger: connection warnings of preventief bij DB-config tuning.
- [ ] **2.3 — Multi-provider transcription fallback** ontwerpen
    Trigger: eerste AssemblyAI outage > 30 min.
- [ ] **2.4 — Backup-proxy provider** geconfigureerd
    Trigger: Decodo incident of preventief in week 2.
- [ ] **2.5 — Retry caps + Sentry alerts op error spikes + dagelijkse cost-report** (AssemblyAI, DeepSeek, Decodo)
    Trigger: eerste runaway-cost incident of preventief.
- [ ] **2.6 — Volledige admin-dashboard opzet en implementatie**
    Componenten: business KPI dashboard (MRR, signups, credits sold, fail rate, marges), detailed user view, cost tracking, feature flags / kill switches, feedback en feature request management, deeplinks naar Sentry/Stripe/PostHog/Crisp per user.
    Trigger: na week 2, wanneer alle data-bronnen bekend zijn.
- [ ] **2.7 — Feature request systeem evalueren**
    Contact-form (1.16) volume rechtvaardigt iets formelers? Alternatieven voor Canny onderzoeken (Canny te duur na 100 users → €79/mnd).

---

## Fase 3 — Schaalbaarheidsfase (3–12 maanden post-launch)

- [ ] **3.1 — Volledige visuele redesign** met Claude Design (vervangt 1.20 cosmetische polish)
- [ ] **3.2 — API en yt-dlp/worker echt splitsen als services**
    Trigger: 100+ DAU.
- [ ] **3.3 — VPS-migratie van Python werklasten naar Hetzner**
    Trigger: Railway-bill > €80–100/maand.
- [ ] **3.4 — Self-hosted observability evalueren**
    Trigger: 25k+ gebruikers.
- [ ] **3.5 — Channel extractie** (heel YouTube-kanaal in één klik) — vereist queue-architectuur die in Fase 1 is gelegd.
- [ ] **3.7 — Notion / Zapier / Obsidian integraties** — OAuth per integratie.
- [ ] **3.8 — Gamification systeem** (XP, levels, reward chests) — schema bestaat, implementatie deferred tot na redesign.
- [ ] **3.9 — Referral program** (5+5 credits met abuse-preventie).
- [ ] **3.10 — Volledige credit transaction history** (nu max 20 rijen) — onbeperkt of hogere limiet, integreren in admin dashboard.
- [ ] **3.11 — Queue library heroverweging post-launch**
    Trigger: eerste van (a) zes maanden post-launch, (b) ARQ-specifieke bug die ons blokkeert, (c) productie-incident dat library-feature vereist die ARQ niet biedt.
    Kandidaten op dat moment evalueren met productie-data: Taskiq, streaq, Procrastinate. Migratie-werk geschat 1-2 dagen omdat alle state in Supabase leeft. Zie ADR-026.
- [ ] **3.12 — YouTube Data API: quota-verhoging aanvragen + single-video batching evalueren**
    Trigger: >5.000 `videos.list` units/dag (zichtbaar in Google Cloud Console).
    Acties: (a) quota-verhoging aanvragen bij Google (gratis, 1–6 weken doorlooptijd); (b) evalueren of single-video calls geclusterd kunnen worden. Noot: playlist-flow batcheert al (1 call per 50 video IDs, bestaande implementatie in `get_playlist_items()`). Zie ADR-028.
