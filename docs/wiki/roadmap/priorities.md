# Launch Priorities (Plan van Aanpak)

Bijgewerkt: 2026-07-09. Single source of truth voor pre-launch volgorde, na strategische sessie met Claude Desktop.

Deze lijst is het Plan van Aanpak (PVA) tot launch. Volgorde is geoptimaliseerd voor solo-developer, met afhankelijkheden in acht genomen. Status-markers per item: `[ ]` todo, `[~]` in progress, `[x]` done, `[!]` blocked.

Voor de strategische "waarom" achter de architectuur-keuzes in Fase 1, zie ADR-019 t/m ADR-024.

---

## Fase 1 — Pre-launch blockers

**Launch-datum: 1 juli 2026.** Geschatte werkdagen niet meer relevant — datum is leidend, scope past zich aan.

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

    > **PRODUCTIE-STATUS 2026-06-30:** worker draait op Railway Redis (zie ADR-048 Fase 2, inmiddels uitgevoerd). `ARQ_REDIS_URL` verwijst naar private Railway Redis (`redis.railway.internal`). Worker gestart om 14:12 UTC 2026-06-30, watchdog-cron vuurt elke 2 minuten. ~~Worker lag plat 2026-05-06 t/m onbekende datum door Upstash quota-uitputting.~~ Opgelost via Redis-splitsing.

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
    - **4 producten** in live mode, BTW-inclusief (Test €3,49/100cr, Starter €9,99/400cr, Plus €24,99/1.300cr, Power €49,99/3.100cr) — prijzen vastgesteld in [ADR-052](../decisions/052-pricing-restructure-4-tiers.md); Stripe Tax (`txcd_10000000`, inclusief, OSS) + Adaptive Pricing (EUR-settlement) aan
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
        > **Risico — Railway single-point-of-failure** (bron: Railway-postmortems): 5 grote incidenten sinds nov 2025. Tijdens de **mei-2026 outage** waren database-backups **ontoegankelijk voor de duur van het incident** en trof het **alle klanten ongeacht plan**; de **feb-2026 postmortem** noemde "strak gekoppelde systemen met grote blast radius" als terugkerend patroon. Implicatie: (a) Supabase-backups moeten **los van Railway** staan (Supabase Pro, onafhankelijke backups) zodat een Railway-incident onze recovery-optie niet meesleurt; (b) dit **versterkt de VPS-migratie-rationale** (zie 3.3) op termijn — minder afhankelijkheid van één strak-gekoppelde provider.
    - Upstash Redis rate limiting activeren in `src/lib/ratelimit.ts` (nu no-op tijdens testfase)
    - ~~Supabase email-verificatie aanzetten~~ — **staat AL AAN** (`mailer_autoconfirm=false`, geverifieerd 2026-07-15). Resterend werk zit in 1.30 (custom SMTP; ingebouwde mailer = `rate_limit_email_sent=2`/uur).
    - **check-wiki.sh stop-hook loop** — de post-commit-hook her-appendt de commit-message aan `docs/LOG.md` bij elke commit (self-perpetuating), waardoor de working tree na elke commit opnieuw vervuilt; de stop-hook faalt bovendien intermitterend. Opruimen: de auto-append-loop stoppen of de hook-logica corrigeren zodat de working tree niet elke commit vuil wordt.

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

- [x] **1.21 — Prijs-per-credit herijken tegen werkelijke kosten** ✅ 2026-07-09 (beslist in [ADR-052](../decisions/052-pricing-restructure-4-tiers.md))
    De prijsstelling is definitief herijkt: **4 tiers, BTW-inclusief, worst-case-geprijsd** (Test €3,49/100cr · Starter €9,99/400cr · Plus €24,99/1.300cr · Power €49,99/3.100cr). Kostenbasis (juli 2026): AssemblyAI €0,0031/cr + Decodo ~€0,0034/cr → marginaal realistisch ~€0,0065/cr, worst-case ~€0,010/cr. Geprijsd tegen worst-case; elke tier houdt winst in élk scenario incl. −20% korting (Power worst-case −20% = +€0,07/100cr). Volledige matrix in [pricing.md](../business/pricing.md); rationale (vaste infra + support + onderhoud + arbeid dekken, niet slechts 2× kostprijs) in ADR-052.
    **Resterend werk = code-sync (zit in 1.13):** `PACKAGES` in `checkout/route.ts` én `packages/shared/src/lib/pricing.ts` naar de 4 tiers + Stripe live-producten. Per-job kosten-capture om marges te *bewijzen* = launch-blocker (zie known-issues + 1.24).
    Zie: [ADR-052](../decisions/052-pricing-restructure-4-tiers.md), [pricing.md](../business/pricing.md), [unit-economics.md](../business/unit-economics.md).

- [~] **1.22 — Credit-reservering bij job-start + refund van ongebruikte/gefaalde video's** (financieel-kritiek)
    Doel: los de credit-race bij concurrent jobs op; **blokkeert veilige concurrency / horizontaal schalen.**
    **STATUS (2026-07-11, geverifieerd tegen code + prod-DB):** het reserveer-model (ADR-050) draait **LIVE in productie** — `RESERVATION_ENABLED` staat op default `"true"` (`backend/credit_manager.py:20`), gate in `main.py:872,1217`; prod bevat live `kind='reservation'`/`'settlement'`/`'refund'`-rijen. De backend-kern (reserve → settle → refund + watchdog-passes 2/2b/2c + CompletionReceipt-UI) is dus **niet meer "dark/flag-off"** maar actief. Resterend onder 1.22: de losse UI-verfijningen hieronder (transactie-paginering, leesbare refund-labels — deels al door CompletionReceipt gedekt). Onderstaande "Probleem"-tekst is **historische context** van vóór de fix.
    Probleem: credits worden nu per-video op verwerkingsmoment afgetrokken, niet gereserveerd bij job-start; `deduct_credits_atomic` is niet job-idempotent (geen dedup op `job_id`) → bij concurrent uitvoering of watchdog-re-enqueue is dubbele aftrek mogelijk (zie replica-safety-audit, LOG 2026-07-06).
    Componenten (backend):
    - **Reserveer** de geschatte kosten bij job-start (som over de te verwerken video's), i.p.v. per-video best-effort aftrek. Reserveren op **`user_credits.credits`** (de gezaghebbende balans — NIET op `SUM(credit_transactions)`, dat reconcilieert niet, zie bug (a)). Per-video-duur is bij start bekend (availability-check + `video_metadata`) → vol bedrag reserveerbaar; settle tegen de **werkelijke** audio-duur en refund het verschil + duur-0-randgevallen.
    - **Refund** het ongebruikte/gefaalde deel bij afronding (per gefaalde video, en het verschil tussen reservering en werkelijk verbruik).
    - **Watchdog-claim atomair maken** — conditional UPDATE / CAS i.p.v. read-then-write: Pass 1 `UPDATE … WHERE id=X AND watchdog_attempts=0`, Pass 2 `… WHERE id=X AND status='interrupted'`, alleen handelen bij `rows_affected=1`. Sluit het dubbele-refund-risico ook als de cron-dedup ooit faalt. (Geldt al bij 1 worker; zie replica-safety-audit, LOG 2026-07-06.)
    - **[x] Deelfix opgeleverd — upload-reserve server-side probe (✅ 2026-07-07):** een audio-**upload** reserveerde `ceil(0/60)→1` credit (de duur is pas ná reserve bekend) → de overspend-gate was **leeg voor uploads** (1 credit → uur-lange upload; het meerdere werd gratis werk via de bijbetaald-cap `LEAST(-refund, balance)`). Nu bepaalt de backend de duur **server-side vóór reserve** (`estimate_upload_reserve_cost`, ffprobe; royale bestandsgrootte-schatting als fallback, **nooit stil 1**); de client-waarde wordt niet vertrouwd (directe JWT-upload). YouTube reserveerde al correct (duur uit metadata). Settle/refund **ongewijzigd** (settle blijft op de echte geprobede duur). Geverifieerd: live test 1 (reserve 1 → settle 22 → refund −21 vóór de fix) + `test_settle_refund.py` scenario's O/P (76/76). Zie [ADR-050](../decisions/050-credit-reservation-model.md).

    **Twee latente credit-bugs die deze fix meepakte (geverifieerd 2026-07-06 tegen baseline-migratie + RPC's):**
    - **(a) Tegengestelde sign-conventies in `credit_transactions`** ✅ **GEFIXT + LIVE GEVERIFIEERD (2026-07-06).** Was: whisper-debits positief (`deduct_credits_atomic`), caption-debits negatief (`update_playlist_video_progress` insert `-p_amount`), beide `type='debit'` → log reconcilieerde niet en "Credits Consumed" (`SUM WHERE type='debit'`) telde fout. **Opgelost** via `20260706172045_fix_caption_debit_sign` (RPC → `+p_amount`) + backfill `20260706172114_backfill_debit_sign` (`SET amount=ABS(amount) WHERE type='debit' AND amount<0`). Prod-check 2026-07-11: **0 negatieve debit-rijen** in elke `(type,kind)`-groep. Alle `type='debit'` dragen nu positief `amount`; richting via `type`. **NB (nieuw inzicht, reservation-mode live):** "Credits Consumed" mag nu **niet** `SUM(type='debit')` zijn (dat dubbeltelt reservation + settlement) → gebruik `SUM WHERE kind='settlement'` (het admin-dashboard doet dit al correct).
    - **(b) Asymmetrische idempotentie** 💰 — het **caption-pad is DB-transactioneel** beschermd (`v_already_done` in `update_playlist_video_progress`: aftrek + counter + idempotency-check in één `FOR UPDATE`-transactie), maar het **whisper-pad leunt op een best-effort `credits_deducted`-vlag** op `transcription_jobs` (los `.update()` in `try/except`, **niet transactioneel** met de `deduct_credits_atomic`-call → TOCTOU-venster). Bij concurrent/her-uitgevoerde whisper-jobs is dubbele aftrek mogelijk. Fix: whisper naar **DB-transactionele idempotentie** — **UNIQUE-constraint op de debit per `job_id`** (of dedup-guard in de RPC) zodat een tweede `deduct_credits_atomic` voor dezelfde job een **no-op** is.
    Componenten (user-facing refund-zichtbaarheid — de UI-helft van deze fix):
    - Huidige credit-UI (`TransactionHistoryCard`, `/dashboard/account`) toont refunds alleen als **rauwe UUID-gelabelde regels** (`Refund: transcription failed | job=<uuid>`) **zonder playlist-context** en **zonder verbruikt-vs-teruggestort-reconciliatie**.
    - Nieuw **UI-component** dat **per job/playlist** toont: **gereserveerd → werkelijk verbruikt → teruggestort**, met **leesbare redenen** i.p.v. job-UUID's.
    - Transactie-geschiedenis **volledig doorbladerbaar** maken — nu `limit(20)` met "View all" die alleen 10↔20 toggelt (oudere refunds onzichtbaar). Paginering of volledige fetch.
    Raakt: credit-logica, send/start-payload, `deduct_credits_atomic`, watchdog, `credit_transactions`-schema (UNIQUE op job_id), `TransactionHistoryCard`/account-page — audit vereist vóór implementatie.

- [ ] **1.23 — max_jobs expliciet zetten + ThreadPool-executor meeschalen** (0,5 dag)
    Doel: bewuste worker-concurrency-knop en de verborgen ThreadPool-bottleneck oplossen **vóór** horizontaal schalen.
    Reden: `max_jobs` staat nu impliciet op **10** (ARQ-default, niet gezet in `WorkerSettings`). Alle blocking-werk (yt-dlp, ffmpeg, AssemblyAI-poll, DB) loopt via `asyncio.to_thread` → de **default ThreadPoolExecutor** = `min(32, cpu_count+4)` = **12 threads op 8 vCPU**. Meer dan ~12 slots heeft nu dus geen zin — de 13e blocking-call wacht toch op een vrije thread.
    Componenten:
    - **`max_jobs=8`** op de huidige Hobby-worker (expliciet in `WorkerSettings`) — conservatief onder de 12-thread-pool, met ruimte voor heartbeat/DB-`to_thread`.
    - **Bij verhoging** (Pro-replicas): tegelijk `loop.set_default_executor(ThreadPoolExecutor(max_workers=max_jobs+8))` zetten, anders blijft de default pool de effectieve cap.
    - **Hard-cap: `max_jobs × replicas ≤ AssemblyAI-accountconcurrency`** (extern limiet — Khidr haalt op bij AssemblyAI). Overschrijding → 429 (geen client-side afhandeling → job faalt → refund).
    Koppeling: **samen met 1.22 voorwaarde voor veilig horizontaal schalen** — 1.22 sluit de credit-race, 1.23 het concurrency-/resource-plafond. Zie replica-safety-audit (LOG 2026-07-06).

- [ ] **1.24 — Admin financieel dashboard: granted-vs-purchased splitsen + kost/winst** (financieel-strategisch, koppelen aan 1.17)
    Doel: correct winst-inzicht vóór launch. **Hoeft niet perfect** — wel de cijfers moeten kloppen.
    Diagnose (2026-07-06, zie admin-audit hieronder): het overview + de users-tabel + de credits-pagina berekenen "Credits Purchased" als `SUM(amount) WHERE type='credit'` — dat telt **álle** credit-toevoegingen (Stripe-aankopen, admin-grants, welcome-bonus én refunds via `add_credits`), niet alleen aankopen. Daardoor klopt het winst-cijfer niet. (Revenue en Paying Users zijn wél correct — die filteren al op `metadata.stripe_session_id` / `metadata.amount_paid`.)
    Componenten:
    - **(a) Granted scheiden van purchased** — admin-grants (`metadata.granted_by`), welcome-bonus en refunds (`reason LIKE 'Refund:%'`) niet als "purchased" tellen. Aanpak: **aparte kolom/`source`-veld op `credit_transactions`** (of, minimaal, filteren op `metadata.stripe_session_id` zoals Revenue al doet). Zodat "Credits Purchased" = alleen echte Stripe-aankopen.
    - **(b) Kost-per-job vastleggen** — AssemblyAI-minuten (`transcription_jobs.duration_seconds`, aanwezig) + **Decodo-GB per job** tegen een **instelbare tarief-config** (nieuw: €/GB en €/min, invulbaar of automatisch gekoppeld). ⚠️ Er is nu **geen tarief-/config-tabel** (moet nieuw). ⚠️ Decodo-bytes worden per YouTube-job **nog niet gepersisteerd** (`file_size_bytes` is 0 voor de YouTube-AI-route — download gebeurt in de worker; wél gelogd, niet opgeslagen) → backend moet de gedownloade bytes per job wegschrijven.
    - **(c) Winst-overzicht** — omzet (Stripe) **minus** kosten (AssemblyAI + Decodo + vaste infra uit [unit-economics.md](../business/unit-economics.md)) op het overview-scherm.
    Raakt: `admin/page.tsx` (overview), `admin/users/UsersTable`, `admin/credits/page.tsx`, `credit_transactions`-schema (source), nieuwe tarief-config-tabel, backend job-rijen (Decodo-bytes persisteren). Koppelen aan 1.17 (minimaal admin-dashboard) en [unit-economics.md](../business/unit-economics.md).
    ⚠️ Voorwaarde voor kloppende metrics: **bug 1.22(a)** (sign-conventie) moet mee — anders blijft "Credits Consumed" fout ongeacht deze fix.

- [ ] **1.25 — Dode credit-orphans opruimen** (lagere urgentie, niet launch-blocking) 💰-hygiëne
    Diagnose (2026-07-06, credit-balans-audit — bug (c) van de drie latente credit-bugs): resten die geen callers meer hebben maar een val vormen voor toekomstige code die per ongeluk de verkeerde balans-bron pakt.
    Opruimen:
    - **`profiles.credits`** (`DEFAULT 5`) — aparte, niet-onderhouden balanskolom; geen enkele live lezer/schrijver als balans.
    - **Oude SQL-functie `deduct_credits(p_user_id, p_amount, p_transaction_type, p_metadata)`** — muteert `profiles.credits` met een negatief-amount + `transaction_type`/`balance_after`-schema; **geen callers** (de backend gebruikt de Python-wrapper die `deduct_credits_atomic` aanroept).
    - Ongebruikte kolommen die de live paden niet onderhouden: `credit_transactions.balance_after`, `credit_transactions.transaction_type` (naast de wél-gebruikte `type`), `user_credits.total_credits_purchased`, `user_credits.credits_bonus`.
    Aanpak: eerst verifiëren dat er écht geen callers/lezers zijn (grep + prod-check), dan migratie om te droppen of expliciet als deprecated markeren. Kan post-launch; documenteer nu zodat het niet verloren gaat.

- [ ] **1.26 — Schone-lei reset vóór launch** (financieel-kritiek, NÁ de reservering-fix uitvoeren) 💰
    Eén gecontroleerde reset van alle testdata zodat launch start met een leeg, consistent systeem. Nu zit er testdata van 6 test-users in (test-transacties, test-transcripts/library-entries) + master-cache-vervuiling. Een bewuste, atomaire reset is schoner dan ad-hoc rijen verwijderen.
    **Volgorde-eis:** draaien **ná** de credit-reservering-fix (ADR-050 / 1.22), zodat de reconciliatie-invariant (`user_credits.credits` == afgeleide `SUM(credit) − SUM(debit)`) intact blijft tot het moment van reset. Reset vóór de fix zou de invariant verbergen die we juist willen bewaken.
    **Scope — consistent leegmaken, niet één ervan:**
    - Balans + log + job-rijen samen: `user_credits`, `credit_transactions`, `transcription_jobs`, `playlist_extraction_jobs`, transcripts/library-entries van test-users.
    - Master-cache-reset: Upstash caption-cache + eventuele andere caches (rate-limit-buckets, metadata-cache).
    - Test-users zelf (auth + profielen).
    **Kritiek genoteerd:** `user_credits.credits` is de balans-bron. Een reset moet **balans, audit-log én job-rijen tegelijk** leegmaken — nooit alleen de balans of alleen het log, anders ontstaat precies de inconsistentie die fase-1 (`ee4c9ca`) net heeft gerepareerd. Implementeer NIET nu; dit is een pre-launch-uitvoertaak.
    **⚠️ FK-CASCADE — genuanceerd (gecorrigeerd 2026-07-09 via `pg_constraint`):** de public-tabellen HEBBEN FK's naar `auth.users`, de MEESTE met ON DELETE **CASCADE** (credit_transactions, user_credits, profiles, collections, transcription_jobs, playlist_extraction_jobs, playlist_jobs, saved_videos, messages, support_tickets). `DELETE FROM auth.users` ruimt die dus automatisch op. **Nog één uitzondering** (na 2026-07-09): **`usage_logs` = SET NULL** (rij blijft, user_id → NULL). `transcripts` was NO ACTION (blokkeerde een user-delete met transcripts) maar is 2026-07-09 op **CASCADE** gezet (migratie `20260709160000_transcripts_fk_cascade`, 0 orphans geverifieerd) → een verwijderd account neemt nu z'n transcripts automatisch mee. Verifieer ná een reset met een orphan-anti-join dat het 0 is. (Een eerdere note beweerde "geen FK-cascade" — dat was een information_schema-artefact; `pg_constraint` is authoritatief.)
    **DEELOPRUIMING GEDAAN (2026-07-09):** de 3 wegwerp-integratietest-users (`test-settle-…`, `test-reserve-…` × 2, allen `@example.invalid`, aangemaakt door `backend/test_settle_refund.py` / `test_reserve_credits.py`) zijn consistent verwijderd (3 auth-users + 11 credit_transactions + 6 transcription_jobs + 7 playlist_extraction_jobs + 3 messages + 2 user_credits; **0 orphans** geverifieerd na afloop). Zie inventaris in de sessie-LOG.
    **BEWUST BEHOUDEN (niet verwijderd):**
    - `test1@indxr-test.com` — **actieve Playwright-fixture** (`tests/test_accounts.json` bevat test1–4@indxr-test.com); verwijderen breekt de E2E-suite. Onderdeel van de uiteindelijke 1.26-reset, maar behouden tot vlak vóór launch.
    - `mbelabas@protonmail.com` — bezit 688/693 transcripts + 696/1138 credit_transactions; dev/QA-of-beta-account, **menselijke beslissing vereist** (auto-delete zou vrijwel alle library-data wissen).
    - `roblobtyu@gmail.com`, `durjoydey652@gmail.com` — echte OAuth-signups (kleine/geen footprint), geen testdata.
    - Owner-accounts `inkofknowledge@proton.me` + `contact@indxr.ai` — behouden. (Losse observatie: de 1000-credit-grant op `contact@indxr.ai` heeft reason `"test "` — een handmatige admin-self-grant; een mens kan die desgewenst nulstellen bij de reset.)
    **TRANSCRIPT-OPRUIMING (2026-07-09): niets te verwijderen.** Alle 719 transcripts horen bij echte users — mbelabas (714, NIET aanraken), `contact@indxr.ai` (3, owner), durjoydey (2, echt). De 3 verwijderde test-users + de test1-fixture hadden **0** transcripts; **0 orphans**. Er is dus geen verweesde/test-transcript-troep. `transcripts`-FK staat nu op CASCADE, dus toekomstige account-deletes nemen transcripts vanzelf mee.

- [x] **1.27 — yt-dlp bot-detectie / read-timeout bij playlist-/video-extractie — AFGEHANDELD BY DESIGN** ✅ 2026-07-09
    **Beslissing:** yt-dlp bot-detectie ("Sign in to confirm you're not a bot") is een **niet-te-winnen kat-en-muis met YouTube** — er is geen permanente technische oplossing (cookies/PO-tokens/proxy-rotatie verschuiven de detectie, ze elimineren 'm niet). Daarom wordt het **bewust by design afgehandeld**, niet "opgelost":
    - Een gefaalde video wordt correct **niet gesetteld** en de gereserveerde credits worden **gerefund** (ADR-050 ledger).
    - **ADR-051** maakt een hang bovendien onschadelijk/herstelbaar: per-video-timeout classificeert 'm als retryable `'timeout'`, de reap-pass ontzet een vastgelopen `running` playlist.
    - De gebruiker krijgt **duidelijke communicatie** (gefaalde video's zichtbaar in de summary) + een **Retry-optie** (per video of retry-all).
    Dit *is* de oplossing — er is geen openstaand werk. Waargenomen tijdens de live ADR-050-verificatie: 2/14 video's op bot-detectie, later een read-timeout op playlist `bfd1d7ed` — beide correct afgehandeld (geen credit-verlies).
    **Observatie (geen actiepunt):** de frequentie van bot-detectie/read-timeouts is via Sentry te monitoren; puur ter observatie van de gezondheid, niet iets dat "gefixt" moet worden. Zie [ADR-007](../decisions/007-bgutil-pot.md) en [ADR-051](../decisions/051-stuck-running-playlist-recovery.md).

- [x] **1.28 — Stuck-running-playlist recovery** ✅ 2026-07-09 (ADR-051, financieel-kritiek)
    Per-video download-timeout (preventie) + watchdog reap-pass voor stale `running` playlists (vangnet, refund via bestaande primitieven) + Pass 1b bounded + **caption-cap op `/api/extract/youtube` toegevoegd** (alleen geauth. users; anon ongewijzigd). 3 vastgelopen jobs worden automatisch door de cron opgevangen.
    **BESLIST & GEÏMPLEMENTEERD (2026-07-09) — Policy S:** een retry-/retry-all-job past de gratis-3 NIET opnieuw toe. Nieuwe kolom `playlist_extraction_jobs.is_retry` (migratie `20260709120000_playlist_is_retry`); de frontend-retry stuurt `is_retry:true` (via de Next.js zod-allowlist naar `PlaylistExtractRequest.is_retry`). Zowel de reserve (`_compute_playlist_reservation`) als de settle (`worker.py` `is_free = idx<3 AND NOT is_retry`, beide passes) lezen dit → **mirror-invariant reserve==settle blijft exact** (bewezen in `backend/test_retry_free_tier.py`). Auto-retry binnen dezelfde job (retry_pending/Pass 1b) blijft `is_retry=false` en behoudt de originele index — geen dubbele belasting. Revenue-lek gedicht.
    **MONITOR-NOTEN (niet fixen, alleen bewaken onder load):**
    - **`AUDIO_DOWNLOAD_TIMEOUT=600s` false-timeout watch-point.** 600s is ruim voor een grote audio over trage residential proxy, maar een écht lange video (>1u) over een pieklangzame Decodo-exit kan er tegenaan lopen → onterechte `'timeout'` → refund+retry. Bij herhaalde `timed out after 600s`-classificaties in de logs: waarde verhogen (blijft < reap-drempel van 25min). Reap-guard blijft veilig want de heartbeat tikt door tijdens de download.
    - **Orphaned-thread-nuance bij de per-video-timeout.** `asyncio.wait_for` op `asyncio.to_thread(extract_youtube_audio, …)` kan de onderliggende thread NIET killen — bij timeout draait de yt-dlp-download-thread door tot yt-dlp zijn eigen `socket_timeout`/retries uitput. Begrensd (geen unbounded leak), maar onder hoge gelijktijdige load kan dit kort extra threads/geheugen kosten. Bewaken; niet nu fixen.

- [x] **1.29 — extraction_error → retrybaar via classificatie** ✅ 2026-07-09
    Twee playlist-video's faalden met `extraction_error` (de onbekend-fout-vangbak) en kregen géén Retry-knop, terwijl de UI ze "temporary connection error — try again later" noemde (tegenstrijdig). Fix via CLASSIFICATIE, niet door de vangbak blind retrybaar te maken: `_classify_download_error` mapt nu connection/network-foutmeldingen (`connection reset/aborted/refused`, `502/503`, `bad gateway`, `service unavailable`, `temporarily unavailable`, `network is unreachable`, …) op de bestaande retryable **`timeout`**-slug. Bewust hergebruikt i.p.v. een nieuwe `connection_error`-slug: `timeout` is al door ELKE retry-gate bedraad (worker auto-retry-set, RPC `v_has_retryable`, frontend retry-filter/badge "Connection timeout") — een nieuwe slug had ~13 plekken + een RPC-migratie geraakt voor alleen weergave-granulariteit. Permanente fouten (age_restricted/members_only/youtube_restricted) blijven niet-retrybaar; de echt-onbekende rest blijft `extraction_error` (geen knop) met nu eerlijke copy ("unexpected error … try Audio Upload"). Test: `backend/test_error_classification.py`. **NB:** de exacte rauwe foutstrings van die 2 An-Najm-video's waren niet verifieerbaar (Sentry, uit Railway-buffer gerold) — de fix dekt de connection/network-klasse; of die 2 exact matchen hangt af van hun rauwe string.

### Nieuw geïdentificeerd (2026-07-09) — nog niet ingepland

Vier items die tot nu toe buiten de PVA vielen. Alleen *wat* + launch-relevantie hier — geen implementatie.

- [ ] **1.30 — Custom SMTP voor transactionele auth-mail (Resend)** — **blocker**
  Supabase's ingebouwde auth-mailer (signup-confirm, password-reset, magic-link) draait op een gedeelde SMTP met strakke rate-limits (~enkele mails/uur) en matige deliverability — niet productie-waardig. `send.indxr.ai` bestaat al als Resend-domein, maar voor **broadcast/marketing** (`sendBroadcastEmails`); de **transactionele** auth-mail loopt nog niet via een custom SMTP. Actie: Resend-SMTP koppelen in Supabase Auth → SMTP Settings. Launch-relevantie: **blocker** — zonder betrouwbare bezorging van confirm/reset-mails kan een deel van de nieuwe users niet inloggen. Koppelt aan 1.19 (Supabase email-verificatie aanzetten) en 1.12 (anti-abuse: welcome credits ná verificatie).

- [ ] **1.31 — Sentry noise-filtering vóór launch** — **belangrijk (pre-launch)**
  Bij launch moeten alerts alleen vuren op **nieuwe/relevante** errors, niet op bekende ruis: verwachte user-fouten, browser-extensie-/third-party-noise, en by-design-gerefunde `bot_detection`/`timeout`-fails (zie 1.27). Zonder filtering verdrinkt een echt signaal. Actie (later): `ignoreErrors`/`beforeSend`-filters, inbox-triage van bestaande issues, alert-rules beperken tot nieuwe of geregresseerde issues. Launch-relevantie: **belangrijk** — observability moet bruikbaar zijn op dag 1. Koppelt aan 1.14 (BetterStack/alerts) en ADR-023.

- [ ] **1.32 — PostHog session-recording field-masking** — **belangrijk (pre-launch)**
  Expliciete masking van gevoelige velden in PostHog session-recordings (e-mailadres, credit-saldo, transcript-inhoud, betaalgegevens). Nu impliciet deels gedekt onder 1.18 (GDPR-basis), maar de concrete recording-masking is niet apart belegd. PostHog neemt standaard DOM-input op; zonder `maskAllInputs` / `maskTextSelector`-config lekt PII in recordings. Launch-relevantie: **belangrijk** (GDPR/privacy). Koppelen aan 1.18.

- [ ] **1.33 — OSS-status beslissing (open-source vs source-available)** — **belangrijk (beslissing), geen code-blocker**
  Beslissen of (delen van) INDXR open-source of source-available worden en onder welke licentie. Raakt positionering, community en of de repo publiek kan. Launch-relevantie: **belangrijk maar niet code-blocking** — de keuze moet helder zijn vóór launch-**communicatie** (je kunt niet half-open lanceren), maar niets in de code blokkeert. Post-launch uitvoerbaar; nu vastgelegd zodat het niet verdwijnt. Kandidaat voor een eigen ADR.

- [~] **1.34 — Graceful worker-drain bij deploy + watchdog-resume van interrupted jobs** — **code klaar (2026-07-12), activering vereist Railway-config**
  **Werkregel (blijft gelden):** een deploy naar de **worker** doodt elke lopende job; **niet naar `master` pushen terwijl er actieve jobs lopen** (check niet-terminale `transcription_jobs`+`playlist_extraction_jobs` / `ActiveJobsIndicator`). Een re-run rekent **nooit** dubbel af — reserve/settle/refund zijn idempotent via de UNIQUE `(job_id,kind)`-index (bewezen 2026-07-12 met een rolled-back re-run-proof: balans 141→141, settle/refund-rijen 1→1, RPC's `idempotent:true`). Het legacy `deduct_credits_atomic`-pad (geen job_id/kind → geen UNIQUE-backstop, TOCTOU) is **dormant** zolang `RESERVATION_ENABLED=true` (default); niet blind aangepast (hot RPC, ook door summarize gebruikt) — benoemd rest-risico als reservation ooit uit gaat.
  **GEDAAN (code):** `WorkerSettings.job_completion_wait` (arq 0.28.0) + `handle_signals=True`, env-gated via `ARQ_JOB_COMPLETION_WAIT` (default 0 = inert). Op SIGTERM: `allow_pick_jobs=False` + wacht op in-flight jobs vóór cancel. Correcties op de eerdere hypothese: arq re-runt een hard-gekillde job **niet** zelf (ack bij pickup → watchdog herstelt); bij een *graceful* cancel re-queuet arq wél (`retry_jobs=True`). Railway's drain-grace is **default 0s** (directe SIGKILL).
  **NOG NODIG (Railway, door Khidr — geen deploy):** `ARQ_JOB_COMPLETION_WAIT=<sec>` + `RAILWAY_DEPLOYMENT_DRAINING_SECONDS >= dat` + Start Command `exec python -m arq worker.WorkerSettings` (SIGTERM-propagatie). Zie [operations/deployment.md](../operations/deployment.md#graceful-worker-drain-optioneel-aan-te-zetten-env-gated). **Optioneel later:** watchdog-resume-latency verkleinen. Koppelt aan 1.23 (worker-concurrency) en ADR-049/051.

- [ ] **1.35 — `deduct_credits_atomic` idempotent maken/verwijderen — STOP&REPORT (2026-07-12): niet blind verwijderd, vereist beslissing** — **financieel-kritiek**
  Doel was de RPC (schrijft `job_id=NULL,kind=NULL` → geen UNIQUE-idempotentie) te verwijderen. **Caller-map (feitelijk, 2026-07-12):** de RPC is **niet dormant** — actief gebruikt door: (a) **`/api/summarize`** (`main.py`, 3 credits) — de UI heeft een **"Regenerate Summary"**-knop die élke keer 3 credits herrekent; (b) **RAG single-export** (`rag-export.ts:deductRagExportCreditsAction`, `ceil(dur/900)`) — once-per-transcript (re-downloads zijn client-gated gratis); (c) **RAG bulk-export** (`bulkDeductRagExportCreditsAction`) — één atomische aftrek van de TOTAAL-som over N transcripts; (d) de **whisper-legacy** tak (`transcription_pipeline.py:327,492`, `if not reservation_mode`) — dormant zolang `RESERVATION_ENABLED=true`; (e) `scripts/fix-credit-transactions.sql` (one-off, geen runtime). **Waarom niet veilig te verwijderen zonder beslissing:** (1) summarize kan **niet** op `transcript_id`-idempotentie — dat zou elke *regenerate* GRATIS maken (billing-breuk). Een veilige idempotentie vereist een **per-request idempotency-token** (client genereert een uuid per klik → retry dedupt, nieuwe klik rekent) — een frontend+backend-feature, geen mechanische fix. (2) `reserve/settle/refund` zijn **geen** alternatief: `reserve_credits`/`refund_credits` lezen/schrijven `credits_reserved` op de **job-rij** (geverifieerd) — summarize/RAG hebben geen job-rij. (3) RAG-bulk is één atomische som over N transcripts → mapt niet op één `(job_id,kind)`; per-transcript idempotent maken verandert de "alles-of-niets"-semantiek. (4) de whisper-legacy tak verwijderen = de gedocumenteerde `RESERVATION_ENABLED=false`-rollback opgeven (architectuurbeslissing). **Kernpunt:** deduct_credits_atomic is **niet onveilig voor synchrone callers** — elke aanroep is een bewuste, losse afrekening en de RPC is atomair (`FOR UPDATE`). De "tijdbom" (ongewenste dubbele aftrek bij **automatische re-run**) geldt alléén de dormant whisper-legacy tak. **Aanbevolen veilige route (vereist Khidr's go):** idempotency-token-feature voor betaalde synchrone acties (summarize + RAG single/bulk), dán de whisper-legacy tak idempotent maken of de reservation-rollback formeel laten vallen, dán pas de RPC verwijderen. Tot die beslissing: **niets gemuteerd** (muteer geen financiële code blind). Restrisico nu: client-double-submit op summarize/RAG kan dubbel afrekenen (mitigatie: UI dis. de knop tijdens de request — te verifiëren).

- [ ] **1.36 — Arabische (RTL/niet-Latijns) transcript-naamgeving in downloads** — **content/UX, niet-blocker**
  Khidr zag bij een bulk-download van ~100 `.txt`-files dat de bestandsnaamgeving voor Arabische titels "raar" oogt (RTL/niet-Latijns schrift wordt niet netjes weergegeven zoals bij Latijnse titels). Alleen *wat* hier: onderzoek hoe de download-filename (en evt. de titel-slug) omgaat met RTL/non-ASCII — waarschijnlijk een sanitisatie/transliteratie- of encoding-kwestie in de export-naamgeving, niet in de transcript-inhoud zelf. Launch-relevantie: **cosmetisch/UX**, geen blocker. Nog niet ingepland; genoteerd zodat het niet verdwijnt. (Gemeld 2026-07-14.)

- [x] **1.38 — Onboarding-gate liet checkout-intent vallen (pricing → auth → billing)** — **OPGELOST 2026-07-15 (was blocker: pre-launch = 100% van eerste kopers is nieuwe signup)**
  Root cause: `loginAction` + `auth/callback` redirectten users met `onboarding_completed=false` onvoorwaardelijk naar `/onboarding` vóór het `next`/`redirectTo`-doel; onboarding-completion ging hardcoded naar `${APP}/dashboard` → nieuwe kopers verloren het pakket. **Fix (commit b1f5903):** doel gethread door de hele nieuwe-user-flow — `loginAction`, `signupAction` (emailRedirectTo) en `loginWithGoogleAction` (OAuth redirectTo) geven het doel mee → `/auth/callback?next=` → `/onboarding?next=`; onboarding-completion honoreert `next`; login/signup-pagina's dragen `next` door de signup-link + Google-form. Open-redirect-guard gecentraliseerd in `packages/shared/src/lib/safe-redirect.ts` (alleen `app.indxr.ai`/localhost, anders `/dashboard`). E-mailverificatie staat AAN (`mailer_autoconfirm=false`), dus de signup-route loopt via de verificatie-link. **Productie-verificatie (vers onboarding-incompleet account):** pricing → Buy Plus → `/login?next=<billing>` → login → `/onboarding?next=<billing>` → onboarding afgerond → `app.indxr.ai/dashboard/billing?checkout=plus` → **Stripe met Plus Package €25** (`cs_live_…`). Regressie: ge-onboarde users (test1 + tweede account) gaan direct naar billing/Stripe, géén onboarding-omweg. Signup-link `next`-doorgifte SSR-bevestigd (`href="/signup?next=…"`).

- [ ] **1.37 — "Cache savings"-cijfer in Finance (model-toevoeging)** — **Finance-ontwerp (Claude Desktop), niet-blocker**
  De `usage_logs.cache_hit`-vlag + `proxy_bytes=0` (ADR-057, Blok A) maken het mogelijk een **cache-besparing** af te leiden = wat cache-hits ons bespaard hebben (gem. kost-per-type × credits/omvang van cache-hit-jobs t.o.v. wat een miss zou hebben gekost). **Belangrijk principe:** credits worden bij een cache-hit **ALTIJD normaal afgerekend** (geen hiaten voor de user) — alleen de **KOST** is €0, dus het effect is **hogere marge**, niet minder omzet. Alleen *wat* hier: een aparte Finance-regel/kaart die deze marge-winst toont; het ontwerp werkt Claude Desktop uit. Launch-relevantie: **nice-to-have analytics**, geen blocker. (Gepland 2026-07-14.)

### Finance & dashboard — post-money-model follow-up (genoteerd 2026-07-15)

Openstaande punten na de money-model-/BTW-/markt-scope-sessies (ADR-055 t/m ADR-062). De revenue/VAT-keten sluit en is geverifieerd (zie status onderaan); dit zijn de resterende **formulefouten** (zelfde klasse als de gefixte cross-user pooling-bug, ADR-061), **dashboard-periode**-beslissingen, en **driver-zichtbaarheid**. Bron-detail: `docs/wiki/architecture/finance-number-provenance.md`. Elk formule-item is **financieel-kritiek** → bewijzen met ≥2 users vóór fix.

**FINANCE — formulefouten (zelfde klasse als de gefixte pooling-bug)**

- [x] **F1 — COR-pooling: `cor_against_revenue` gebruikt scope-gemiddelde share i.p.v. per-user.** ✅ **Opgelost 2026-07-15 (ADR-063).** `_geld_scope` rekent nu `Σ_user (user_period_COR × user_period_share)` per methode, met een **periode**-share (niet meer all-time-share op periode-COR — het neveninzicht is meegenomen). Verdict was: €0,17 was de echte poolingfout (per-user €0,36). Bewezen A/B (€0,01 against / €10 goodwill) + periode-share-test (feb granted → €0 against). COR-tabel toont nu volle kost (rij vermenigvuldigt) + aparte against/goodwill-splitregel. NULL-COALESCE-valkuil op per-user `sum()` opgelost (LESSONS). Onderstaande originele bevinding blijft als historie: Nu: `cor_against_revenue = scope_COR × scope-gemiddelde purchased_share` (in `_geld_scope` / `admin_finance_summary`). Moet zijn: `Σ_user(user_COR × user_share)` — dezelfde per-user-sommatie die ADR-061 voor recognitie invoerde, maar de COR-attributie is nog gepoold. Provenance §2.2. **Synthetisch bewijs (≥2 users):** A (100 granted, €10 COR, share 0) + B (100 purchased, €0,01 COR, share 1) → juist = €0,01 tegen omzet / €10 goodwill; de gepoolde formule geeft €5,00/€5,00. Raakt `against_revenue`, `against_revenue_by_method`, goodwill, gross, net. **Toets tegen ECHTE data (internal scope, juli 2026, live gezien):** COR-tabel toont AI-transcription COST €0,17 · CREDITS 3.091 · €/CREDIT €0,0033 → 3.091 × 0,0033 = €10,36 ≈ €0,17 (against-revenue) + €10,19 (goodwill in OPEX). De rij **vermenigvuldigt dus niet**: COST toont het against-revenue-deel, CREDITS toont álle verbruikte credits. Bovendien €0,17/€10,36 = 1,64% terwijl de gepoolde share 131/3.760 = 3,48% is → zoek uit of 1,64% de correcte per-user-berekening is of juist de poolingfout. Geen synthetisch geval — echte data.
- [x] **F22 — Stripe fee hoort in COR, niet in OPEX — maar moet mee-deferren.** ✅ **Opgelost 2026-07-15 (ADR-063), samen met F1.** De fee defert per lot in `_recognize_asof` (`recognized_fee`/`deferred_fee`, `purchased_fee`); `recognized_fee` in `cor_against_revenue` (revenue-matched, geen share/goodwill), `stripe_fee` uit `measured_opex`, `deferred_fee` in de Deferred-kaart. Bankkaart houdt de volle cash-fee (`bank.stripe_fee`). Bewezen (2 tiers): €1,25 → €0,76 recognized / €0,49 deferred. Originele analyse blijft als historie: Nu staat "Payment processing" als measured OPEX-regel. De dominante SaaS-praktijk is cost of revenue: de praktische test is "zou de fee naar nul gaan als de omzet naar nul gaat?" → ja, dus COR (Finlens, dat Stripe's eigen SaaS-accountinggids aanhaalt; Founderpath's COGS-definitie = Hosting + Third-Party Software + Support + Payment Processing + DevOps). De minderheidspositie (OPEX/G&A) komt uit retail-context waar de fee een bankkost is bij het innen van geld voor fysieke goederen — niet ons model. Gevolg van de huidige plaatsing: de gross margin van 95,5% negeert 9–11% transactiekosten en is dus fictie. **TIMING-VALKUIL —** naïef verplaatsen ruilt de ene fout voor de andere. Onze fee valt bij AANKOOP, onze COR bij VERBRUIK. €0,64 zonder meer in COR zetten trekt de fee van 200 gekochte credits af van de omzet van 131 verbruikte credits → marge deze periode te laag, volgende periode te hoog. Dat is exact het matching-probleem dat ADR-050+ voor de omzet oploste, opnieuw geïntroduceerd aan de kostenkant. **FIX — de fee defert mee per lot, in de bestaande FIFO-machine.** Elk lot draagt al `purchased_net` + `purchased_cr`; voeg `purchased_fee` toe zodat `_recognize_asof` naast `recognized` ook `recognized_fee` teruggeeft (zelfde loop, één veld). €0,64 / 200 cr = €0,0032/cr → × 131 verbruikt = €0,42 COR nu → × 69 deferred = €0,22 vooruitbetaalde kost. De tegenhanger bestaat al: "Deferred · Est. cost to deliver" — dit is dezelfde gedachte aan de andere kant (kosten die al betaald zijn en op hun omzet wachten). **EFFECT (live data juli 2026, internal):** gross profit €3,60 → €3,18, marge 95,5% → 84,4%. Die daling is groot omdat beide sales Try (€3,49) zijn, waar de vaste €0,25 hard aankomt; op Plus (€25) is de fee ~2,9% van de charge → de gross margin gaat structureel per tier verschillen — dat is het F16-signaal dat zichtbaar wordt in de marge i.p.v. in een percentage dat nergens staat. **SAMENHANG:** raakt F1 (als de fee in COR komt moet hij ook per-user/per-lot, niet gepoold) en F16 (drag per tier). **Overweeg F1 + F22 als één taak.** **NOOT —** dit wijkt bewust af van hoe de boekhouder de fee waarschijnlijk boekt (bankkosten in Moneybird). Dashboard = stuurinstrument, Moneybird = fiscale waarheid. Vastleggen dat ze bewust verschillen, anders lijkt het later een bug.
- [x] **F2 — AI-summary-COR valt op `transcripts.created_at` i.p.v. het moment waarop de samenvatting draaide.** ✅ **Opgelost 2026-07-16.** Nieuwe insert-only `ai_summary_usage_log` (RLS, één rij per DeepSeek-call, `generated_at`); backend appendt per run; `_geld_scope` leest summary-COR uit de log op `generated_at` (scope-totaal + per-user CTE). 2 bestaande summaries gebackfilld. Waarom een tabel i.p.v. `COALESCE(generated_at, created_at)`: regenerate UPDATE't `transcripts.ai_summary_usage` in-place → bij 2 runs 6 credits afgeschreven maar 1× COR; de log telt beide runs. Bewijs: maand-invariant identiek (0,000800); per-dag COR verschuift 07-09→07-11; synthetisch 2 users×2 periodes: cross-period shift + regenerate telt beide runs (0,0003612 vs 0,0001806). Originele bevinding als historie: attribueer de summary-COR op het `ai_summary`-debit-tijdstip (join naar de tokens), niet op de transcript-aanmaakdatum. Provenance §2 (ai_summary COR-rij).
- [x] **F3 — Storage-COR prorateert de HUIDIGE `library_bytes` over historische periodes.** ✅ **Opgelost 2026-07-16.** (1) **Meting gebouwd:** nieuwe insert-only `daily_library_bytes` (RLS); `snapshot_finance_day` schrijft per nacht per-user externe bytes. `_geld_scope` leest de dag-serie als die het venster-begin dekt, anders terugval op stand-nu met `storage_approx=true` (UI-markering op de Storage(R2)-rij — geen stille stand-nu-voor-historie). (2) **Per-user geattribueerd** (correctie 4, zelfde klasse als F1): storage schuift van flat-tegen-omzet naar de per-user COR-CTE (`user_bytes-share × consumption-share`); `admin_finance_summary` + snapshot lezen storage uit `_geld_scope`, flat-add weg. Bewijs: echte data storage=€0 → net/cor_ar ongewijzigd; synthetisch 2 users (A 15GB share0 / B 1GB share1): flat 0,0267 volledig tegen omzet vs per-user 0,0017 tegen omzet + 0,0250 goodwill; byte-serie: approx→false, leest periode-stand 22GB i.p.v. stand-nu 16GB. €0 nu (externe lib 122KB « 10GB gratis) — meting gebouwd, niet de formule getweakt. Provenance §2.8.
- [x] **F4 — Hero "Revenue" mengt flow en stock.** ✅ 2026-07-15 — hero toont nu `revenue_delivered` (flow), deferred als aparte stand-nu-regel (`SplitBar` verwijderd), delta op hetzelfde flow-getal. Bankkaart "Where the cash sits" BTW-eerst geherordend + `= Yours to keep` (`revenue_ex_vat − stripe_fee`) toegevoegd, `Settled to your bank` als losse regel met "not yet yours"-note. Geverifieerd tegen live internal scope (juli 2026): 6,98 / 1,22 / 5,76 / 0,64 / 5,12 / 6,34 exact. Alleen weergave, geen formules/capture. De hero toont `revenue_delivered + deferred_balance` (flow + stock), terwijl de delta ernaast op `revenue_delivered` alléén rekent. **Beslist:** hero wordt **periode-omzet** (flow), met een balk eronder die **deferred als stand-nu** toont, en de delta op hetzelfde (flow-)getal. `FinanceView.tsx` hero-blok. **Ook: bankkaart "Where the cash sits" — zelfde probleem.** Nu staat `Revenue ex-VAT €5,76` onder `Settled to your bank €6,34`, wat de lezer een aftrekking laat lezen die er niet is (€6,34 − €5,76 = €0,58 betekent niets). Fee en VAT zijn twee ONAFHANKELIJKE aftrekkingen van hetzelfde bruto: €6,98 − fee = wat op de bank komt; €6,98 − VAT = wat van jou is. Twee relaties (jij↔Stripe, jij↔fiscus), geen keten. **Beslist — nieuwe volgorde, BTW eerst:** `Charged to customers €6,98` → `− VAT (owed to tax office) €1,22` → `= Revenue ex-VAT €5,76` → `− Stripe fee €0,64` → `= Yours to keep €5,12`; daaronder `Settled to your bank €6,34` (waarvan €1,22 nog niet van jou is). BTW eerst omdat dat geld nooit van ons was; wat overblijft is omzet; daar gaat de fee vanaf. Elk tussengetal bestaat dan echt. `Yours to keep` (€5,12) staat nu nergens in het dashboard terwijl het het enige getal is dat volledig van ons is. `Settled to your bank` blijft als losse regel — dat is het bankafschrift. Noot: Stripe rekent zijn fee over de volle charge, inclusief de doorgegeven BTW. De aftrekvolgorde verandert de uitkomst niet (aftrekking is commutatief), maar verklaart waarom de drag 9,17% van de charge is en 11,11% van de omzet ex-BTW (zie F16).
- [x] **F5 — Oude snapshots dragen pre-ADR-061 gepoolde recognitie.** ✅ **Opgelost 2026-07-16 door verwijderen i.p.v. herschrijven (ADR-064).** De 6 bestaande snapshot-rijen (12/14/15 jul) waren allemaal oud-model **internal testruis** (externe economie leeg). Alle rijen `DELETE`'d (waarden gerapporteerd vóór de DELETE); geen backfill. De cron schrijft vanaf vannacht 02:00 UTC nieuwe ADR-063-conforme rijen; de Trend leest `MIN(snapshot_date)` per scope (niet hardcoded) en toont de echte startdatum/leegte. Backfillen blijft altijd mogelijk (`snapshot_finance_day(d)` is range-aware) — we doen het niet omdat de data testruis is, niet omdat het niet kan; de aanloop-P&L komt uit de **live** `_geld_scope`, niet uit de Trend. Zie ADR-064.
- [x] **F5b — `snapshot_finance_day` net-model loopt achter op ADR-063.** ✅ **Opgelost 2026-07-16.** `net_profit_measured` = `revenue_delivered − cor_against_revenue (usage-share + recognized_fee + storage) − (goodwill + funnels + radar)`, identiek aan `admin_finance_summary` mínus de **entered-OPEX live-overlay** (bewust niet bevroren — entered-regels zijn bewerkbaar en werken retroactief door; kolom heet daarom `net_profit_measured` = net vóór entered; zie ADR-064). Radar meegenomen voor pariteit. Bewijs 3 dag-cases: 07-13 gelijk (geen sale/verbruik), 07-11 +0,32 (volle fee gedefereerd), 07-14 −0,4192 (recognized fee); nieuw net == live per-dag. Raakte F5 (samen opgelost via clean-start).

**FINANCE — kleiner**

- [ ] **F6 — `cor_caption_estimated` staat hardcoded `false`** in `_geld_scope` (regel ~151). Sinds ADR-057 is caption-COR echt gemeten (per-caption `usage_logs`), dus de vlag hoort weg of dynamisch — nu is het een dode aanname in de output.
- [ ] **F7 — Invoicing-fee (0,4%, out-of-band) hoort als entered-regel.** De on-demand factuur wordt via `pay(paid_out_of_band:true)` betaald → **geen charge/balance_transaction** → deze Stripe-invoicing-fee zit **niet** in `fee_details` (ADR-053/060). Hoort als **entered** OPEX-regel (maandelijkse Stripe-billing), niet stilzwijgend €0. Aantal invoiced-purchases als sanity-check op het ingevoerde bedrag.
- [ ] **F8 — `cor_rag=0` staat als aanname in de UI-hint.** RAG-COR is 0 in `_geld_scope`; zolang dat een aanname is (geen gemeten RAG-kost) moet de UI-hint dat eerlijk tonen i.p.v. het als €0-feit te presenteren.

**DASHBOARD — periodes (beslist, nog niet gebouwd)**

- [ ] **F9 — Default = "This month": 1e van de maand t/m NU, inclusief vandaag, live.** Niet tot gisteren — dit is geen trendtool maar een "wat is er gebeurd en klopt het"-tool; een sale om 14:00 hoort om 14:01 zichtbaar te zijn. (Onderscheid met de nachtelijke snapshots/trend blijft: tab = live `admin_finance_summary`, trend = bevroren snapshots.)
- [ ] **F10 — Presets:** This month · Last month · This quarter · Last quarter · This year · All time · Custom. **Kwartaal staat erbij omdat het de OSS-aangiftecyclus is.**
- [ ] **F11 — Delta vergelijkt met DEZELFDE periode-lengte:** month-to-date vs 1e t/m dezelfde dag vorige maand. Anders wordt 15 dagen tegen 31 dagen afgezet en is elk percentage onzin. (Bestaande `comparison`-call moet op gelijk-aantal-verstreken-dagen mikken.)
- [ ] **F12 — Weeknummers in de datepicker.** Overal, ook Finance.
- [ ] **F13 — `business_start_date` (2026-01-01) in `finance_settings`.** "All time" begint daar; de datepicker laat niets eerder toe. De maanden vóór launch tonen dan wat ze zijn: €0 omzet, X kosten, negatief resultaat — dat is de echte P&L.
- [ ] **F14 — Aanloopkosten met terugwerkende kracht als entered lines in `opex_accrual`** (domein, Vercel, Railway, Supabase vanaf jan 2026). Khidr levert de bedragen. Voer ze in als entered-regels met `effective_from` in het verleden zodat de pre-launch-P&L klopt.

**DRIVERS ZICHTBAAR (punt 7 van de oorspronkelijke lijst)**

- [ ] **F15 — Alles is gemeten, niets afleesbaar.** AssemblyAI-minuten, proxy-bytes, DeepSeek-tokens, opslag-bytes, aantal sales, lot-€/credit — allemaal gecaptured, nergens getoond als **driver × tarief = bedrag**. **Deels opgelost 2026-07-15 (ADR-063):** de COR-tabel toont nu volle kost en de kolommen **vermenigvuldigen** (Cost = Credits × €/credit), met de against/goodwill-split als aparte regel. Nog open: de onderliggende driver zelf (minuten/bytes/tokens) is nog niet afleesbaar — alleen credits × €/credit. De OPEX-tabel toont alleen een euro (behalve de Radar-hint). Maak per COR- en OPEX-regel de onderliggende driver + tarief zichtbaar.
- [ ] **F16 — Gevangen maar nergens gebruikt: `card_country` / `card_brand` / `card_funding` / `available_on` / `balance_transaction_status`** (fee- + cashflow-drivers). Ook: de reconcile-route berekent al **`drag_pct_of_charge`** en **`drag_pct_of_revenue_ex_vat`** per sale (live gezien: 9,17% van de charge, 11,11% van de omzet ex-BTW op een Try-sale van €3,49 — de vaste €0,25 slaat hard aan op kleine bedragen; op Plus €25 is dat ~2,5%). Die getallen bestaan al en gaan nergens heen. **Effectieve Stripe-drag per tier, dynamisch uit de Stripe-data, hoort zichtbaar te zijn** — het is een pricing-signaal, niet een curiositeit. **Deelfundament gelegd 2026-07-15 (ADR-063):** nu de fee in COR zit en per lot defert, verschijnt het per-tier-margeverschil in de gross margin zelf (Try zwaar, Plus licht). De expliciete per-tier drag-kolommen uit `card_*`/`drag_pct_*` zijn nog NIET gebouwd — dit item blijft open voor die UI.
- [ ] **F17 — DeepSeek-balans + alert.** De DeepSeek-console toont saldo en kosten per model; wij meten de tokens al (met cache-split) maar niet het saldo. Uitlezen + waarschuwing onder ~$5 in het admin-dashboard, naast de bestaande Decodo-auto-refill-logica.

**NA FINANCE**

- [ ] **F18 — Per-user segmentatie (betaald / gratis / anoniem) door het hele dashboard** — nu is bijna alles aggregaat. Pas oppakken als de omzetketen klopt (na F1–F5).
- [ ] **F19 — Growth: definities + testcases met ≥2 users op papier vóór er een mockup komt.** Dezelfde foutklasse zit daar (conversieratio = cohort vs momentopname).
- [ ] **F20 — Operations** (dashboard/observability van de operationele kant — na Finance).

**NOTITIE**

- [ ] **F21 — Radar free trial loopt tot 2026-08-15; daarna €0,02 per gescreende poging.** `cost_config.radar_free_until` staat er al op → **controleren dat de OPEX-regel "Fraud screening (Radar)" op 16 augustus daadwerkelijk begint te tellen** (billable_screens = pogingen met datum ≥ free_until × tarief). Reconcileerbaar tegen Stripe's Fees report (Reports → All Fees, 96u vertraging). Zie ADR-062 + provenance §2.14b.

**STATUS — money-model/BTW/markt-scope afgerond deze sessies (ter referentie):**
- Revenue/VAT-keten dicht en geverifieerd tegen live data (internal scope, juli 2026): charged €6,98 − fee €0,64 = settled €6,34; charged − VAT €1,22 = revenue ex-VAT €5,76 = delivered €3,77 + deferred €1,99. Per-credit ex-BTW €0,0288 loopt door de hele keten (deferred 69 cr × €0,0288 = €1,99). Backfill 2/2 sales measured via `invoice_tax` (`tax_status` null = correct; die sales dateren van vóór de automatic_tax-fix van 15 juli).
- `_sale_vat` als enige BTW-bron, per-land buckets (NL/OSS/outside/unknown), revenue-per-regio, landguard live via Radar, betaalpogingen gelogd (`charge.failed` + `payment_intent.payment_failed` geabonneerd), Radar-kosten als driver × tarief. ADR-062, `tax-jurisdictions.md`, FAQ live, provenance §7 herschreven.
- Khidr-side afgerond: iDEAL aan, betaalmethoden opgeschoond, "I'll file taxes myself" aangeklikt, Radar-regel live, webhook-events uitgebreid.

### Pre-launch — buiten code (parallel uit te voeren)

- [ ] Google Search Console: domein verifiëren, sitemap indienen
- [ ] Google Analytics 4: opzetten naast PostHog (zie ADR-023 — alleen voor Google Ads attributie)
- [ ] Google Ads account aanmaken + eerste campagne voorbereiden (US markt, longtail keywords rondom YouTube transcripts en AI/RAG)

### Pre-launch — testen

- [ ] **4+ uur video stress test** — Whisper-transcriptie op video > 4 uur. Test of Railway-restart-mitigatie (1.7) werkt zoals verwacht. *(bevestigd genoteerd 2026-07-11 — blijft staan.)*
- [ ] **BULK-EXPORT stress test** (nieuw, 2026-07-11) — RAG/ZIP-export met ~100 geselecteerde transcripts. Het grootste test-account heeft ~700+ transcripts / ~190 MB (`library_bytes` bevestigd). Losse exports waren lang geleden groen, maar **bulk** (100 volledige transcripts ophalen + client-side zippen in JSZip) is nooit in bulk getest → geheugen/timeout/browser-freeze-risico. Koppelt aan de audit-observatie dat sommige admin-queries de hele `transcripts`-tabel in geheugen laden (Overview "Top Users", `admin/page.tsx`). Test: selecteer ~100 rijen in de Library, RAG-ZIP-export, meet geheugen + tijd + of de download slaagt zonder tab-crash.
- [ ] **Anonymous user flow Playwright tests** — anonieme gebruiker → free tool → gated feature → signup prompt → registratie. Voorkomt foutmeldingen waar signup-prompt hoort.
- [ ] **🔐 Security: `add_credits`/`deduct_credits_atomic`/`reserve_credits` zijn `EXECUTE`-baar door `anon`+`authenticated`** (bevinding 2026-07-11, ADR-054). Deze SECURITY DEFINER-RPC's bypassen RLS; een ingelogde user kan zichzelf via een directe Supabase-`rpc()`-call credits geven. **Pre-launch fixen:** `REVOKE EXECUTE … FROM anon, authenticated` op deze drie (en verwante credit-muterende RPC's), en alleen de RPC's die de client legitiem aanroept (`claim_welcome_reward`) behouden. Grants zijn bij de capture-laag **bewust exact behouden** (posture niet stilzwijgend gewijzigd) — dit is een aparte, gerichte security-taak.

#### Capture/fix-verificaties door Khidr (live-runs — noteren zodat ze niet verdwijnen, 2026-07-12)

- [~] **TEST 4 — Stripe net-capture: GAT GEVONDEN (2026-07-12, DB-geverifieerd).** Khidr deed een echte betaling (`mbelabas@protonmail.com`, 100 cr €3,49, saldo 141→**241**, purchase-rij `078ad112…`, kaart in **MAD** — de multi-valuta-testcase). DB-check: **aanwezig** = `kind='purchase'` ✓, `amount_tax=0` ✓, `currency='eur'`, `amount_paid=3.49`, `payment_intent_id`, `stripe_session_id`, `invoice_id/url`. **AFWEZIG** = `stripe_fee`, `net_settlement`, `settlement_currency`. Root cause: de webhook (`api/stripe/webhook/route.ts`) captured deze 3 uit `latest_charge.balance_transaction`, maar die was **niet synchroon beschikbaar** op webhook-tijd → best-effort fallback laat ze weg (regel 66-67, "backfillable from Stripe later") — en **die backfill bestaat niet** (webhook handelt alléén `checkout.session.completed`, geen `charge.updated`/`balance.available`-handler, geen cron). Bovendien staat `currency='eur'` (session-currency), dus de **MAD→EUR-settlement/koers is nergens in de DB** — precies de multi-valuta-capture die we wilden bewijzen ontbreekt. Cross-currency settlement komt bij Stripe juist het laatst beschikbaar, dus dit gat bijt structureel bij niet-EUR-kaarten. **FIX (pre-launch, financieel-kritiek):** implementeer een settlement-backfill — een `charge.updated`/`balance_transaction`-webhook-handler óf een cron die per purchase-rij zonder `net_settlement` de `PaymentIntent→Charge→BalanceTransaction` ophaalt en `stripe_fee`/`net_settlement`/`settlement_currency`/`balance_transaction_id` in de metadata patcht (idempotent). Zonder dit is de netto-marge per betaling niet reconstrueerbaar (ADR-054-doel). NB: de credit-grant zelf faalt NIET (bewust best-effort) — alleen de kosten-capture mist.
- [ ] **TEST 5 — Acquisitie-capture:** signup via een link met **`?utm_source=test`** (bv. `https://indxr.ai/?utm_source=test`). Verifieer daarna `profiles.signup_source`/`utm_source` = `'test'` voor die user (first-touch cookie → signup `raw_user_meta_data` → profiles-trigger, ADR-054).
- [ ] **Healthcheck-in-praktijk:** bij een **volgende api-deploy** — tonen de Railway-deploy-logs een healthcheck-stap vóór "Active"? Context: `backend/railway.json` is **teruggedraaid** (brak beide services, 2026-07-12), dus de api-cutover is nu **Railway-default** (container-start). Als je later health-gated cutover wilt: uvicorn op `$PORT` + een **api-only** healthcheck via het dashboard (nooit een healthcheck op de portloze worker). Zie [deployment.md](../operations/deployment.md#zero-downtime-deploy).
- [ ] **Napoleon taalfix — live end-to-end:** re-extract `Bm1RhjcdJek` (Napoleon, Epic History) in **productie** → verwacht een **Engels** transcript (was Albanees). De fix is lokaal bewezen tegen de echte proxy + echte functies (2026-07-12); dit bevestigt 'm end-to-end in prod. Idem-check: een Arabische video → Arabisch native, een Japanse → Japans native (tlang-fix mag niet terugbreken).
- [ ] **Openstaand — end-to-end verificatie prijsherziening (ADR-058):** testaankoop per tier via een `@indxr-test.com`-account bevestigen dat de keten inline `price_data` → Stripe checkout → webhook `metadata.credits` → `add_credits` het juiste creditaantal toekent (**€5→100, €15→400, €25→1.000, €60→3.000**). Groene deploys + gesynchroniseerde `pricing.ts` zijn **geen bewijs**; de webhook-grant is niet geverifieerd sinds de prijswijziging van 14-07-2026. **Blokkeert het als-afgerond markeren van [ADR-058](../decisions/058-round-prices-card-layout-rag.md).**

### Pre-launch — SEO content

- [ ] **Content/FAQ realiteit-audit (pre-launch, feitelijk rechttrekken — GEEN herschrijf/redesign)** — de marketing-site (`indxr.ai`) + bestaande FAQ/Docs zijn vroeg op basis van research gebouwd; sindsdien is de realiteit op veel punten veranderd: pricing (Scenario B / [ADR-052](../decisions/052-pricing-restructure-4-tiers.md) 4 tiers), credit-model, reserveer-model ([ADR-050](../decisions/050-credit-reservation-model.md)), native-anchored taalfix, storage-cap ([ADR-054](../decisions/054-cost-usage-capture-layer.md)), welkomst-credits via inbox-message, gratis-caption-kostmodel. **Vóór livegang:** scan ALLE user-facing content (landing, pricing-pagina, FAQ, Docs, Articles) en corrigeer elke claim die feitelijk NIET meer klopt met de gebouwde werkelijkheid — prioriteit op harde onjuistheden (verkeerde prijzen, verkeerde credit-kosten, features die anders werken of niet bestaan). Neem het al gedocumenteerde taal-Q&A-item (YouTube verkeerde caption-taal → INDXR native-anchored, AI-transcriptie als vangnet, support-ticket-haak; nu op de FAQ, zie [marketing.md](../business/marketing.md#differentiator-originele-caption-taal-native-anchored)) hierin mee op de bestaande FAQ. **Scope:** feitelijk rechttrekken, geen herschrijf/redesign — dat is Fase-3. **Succescriterium:** geen enkele aantoonbaar onjuiste claim meer live bij launch.
- [ ] Longform: "How to use YouTube transcripts for RAG and vector databases" — gericht op AI/developer doelgroep, linkt naar RAG JSON export.
- [ ] Longform: "YouTube transcript JSON format — complete guide" — informationeel, hoog zoekvolume.

### Polish / deferred UI

Items die bewust buiten scope zijn gehouden in skeleton-bouw sessies. Te oppakken in Claude Design rondje of dedicated polish-sessie.

- [ ] **Format-export gating (friction case 3c)** — Anonymous users die een non-TXT export proberen (Markdown, JSON, CSV, SRT, VTT) zouden een inline `FrictionConversionCard` moeten zien i.p.v. directe download. Vereist aanpassing van `src/components/TranscriptCard.tsx`: per format-knop controleren op `user` auth-state en bij anonymous een inline card tonen. Deferred vanwege scope ("backend logica niet aanraken" in Batch 1).
- [ ] **Playlist eerste-3-free UI** — Visueel onderscheid "Free" vs "Sign up to extract" per video in de PlaylistTab/PlaylistManager. Vereist aanpassing van `src/components/PlaylistManager.tsx` om per-video-rij een badge of state te tonen. Deferred naar content/design-pass.
- [ ] **Mobiele credits / koop-toegang (dashboard-shell-redesign)** — Op mobiel is er geen credits-tab in de bottom-nav (4 tabs: Home/Transcribe/Library/Messages) en zit kopen verstopt achter het topnav-credit-icoon. Afweging: geen 5e tab (4 is schoon), maar kopen is cruciaal en nu te verborgen. Oplossing bij de redesign: credit-pill in de mobiele topnav prominent + tapbaar, plus een duidelijke koop-CTA op Home en de billing-pagina, zodat kopen niet afhangt van het weten dat je op het credit-icoon moet klikken.

Zie ook `docs/wiki/architecture/page-structures/free-tool.md` voor context.

### Pre-launch — bestaande features afronden

- [ ] **Opus 249 audio format valideren en deployen** — kwaliteitstest op 50 diverse video's, dan format selector aanpassen. Zie ADR-016. ~63% reductie in proxy-bandbreedte.
- [ ] **Website copy volledig herschrijven** — landing page, pricing, FAQ, onboarding, error messages. Plaats: vóór 1.20 (polish heeft definitieve copy nodig).
- [ ] **RAG JSON: Settings chunk size ✓ feedback zichtbaarheid** — zie known-issues. Kleine fix in `DeveloperExportsCard.tsx`.
- [ ] **RAG JSON export (30-seconden chunks)** — kernfeature voor AI/developer doelgroep, zie ADR-015.

---

## Werksessie C — app.indxr.ai subdomain split

Doel: `/dashboard` en `/admin` verhuizen van `indxr.ai` naar `app.indxr.ai`. Auth-flows (login, signup, OAuth) blijven op marketing-domain; cookies op root-domain `.indxr.ai` zodat sessie cross-host werkt. Zie ADR-034 en ADR-036.

> **STATUS 2026-07-09 — grotendeels afgerond.** De twee-projecten-migratie (C.4.1 / ADR-045) is uitgevoerd en draait live in productie. Code-geverifieerd done: **C.4.1, C.1.2, C.1.3, C.2.1, C.2.2, C.2.4, C.2.5**. Nog open: **C.2.3** (email-templates — manuele Supabase-dashboard-check, niet code-verifieerbaar) en **C.3.2** (rate-limiting + caption-cache in productie heractiveren — overlapt met 1.19; zie noot daar). C.1.1 is achterhaald (aanpak teruggedraaid). De historische narratief hieronder is bewaard voor context maar beschrijft de één-project-fase van vóór de migratie.

### Status (per 2026-05-05): TypeError-bug definitief opgelost

Commits 825574f (Server Action redirect) en d13c30e (NEXT_REDIRECT swallow) sluiten samen de bug-klasse "TypeError: Error in input stream" die sinds subdomain-split deploy aanwezig was. Productie-test bevestigd 2026-05-05: schone Console na login flow.

1fc0589 is migratie-checkpoint voor twee-projecten migratie (zie ADR-045) — bevat bug-fix d13c30e plus handoff-documentatie. Bij rollback worden zowel code-state als ADR-045 + status-docs behouden.

Resterende C.x items zijn geen blockers meer voor migratie:
- **C.2.1** manifest CORS, **C.2.4** Python CORS: worden gefixed tijdens migratie
- **C.3.1** Upstash quota: blijft openstaan, los van migratie
- **C.3.2** rate limiting: hangt aan C.3.1
- **C.2.3** email templates: handmatige check Khidr

Geïmplementeerd 2026-05-04/05 (Code Sessie 1 + bugfix-serie). Code Sessie 2 (mechanische sweep) deels gedaan; resterende items worden opgepakt tijdens migratie of daarna.

### Code Sessie 1 — auth / cookies / middleware

- [~] **C.1.1 — Auth-error recovery in updateSession** — geïmplementeerd 2026-05-05
  > **⚠️ ACHTERHAALD (2026-07-09):** de `clearAuthCookies()`-aanpak is **teruggedraaid** en bestaat niet meer in de code — hij wiste ook de PKCE `code-verifier`-cookie waardoor `exchangeCodeForSession()` faalde in OAuth/email-callback flows (zie LESSONS 2026-05-17). De huidige `updateSession` (`packages/shared/src/utils/supabase/middleware.ts`) gebruikt `getClaims()` en volgt letterlijk het officiële Supabase-template — **geen** error-recovery cookie-clearing in middleware. De "productie-verificatie pending" hieronder is dus niet langer van toepassing. De onderliggende infinite-refresh-loop is opgelost via de `getClaims()`-migratie, niet via cookie-clearing.

  `clearAuthCookies()` toegevoegd aan `src/utils/supabase/middleware.ts`: bij `getUser()` error of exception worden alle `sb-*` cookies gewist met `maxAge: 0` en correcte `cookieDomain`. Voorkomt infinite refresh-loop bij stale/revoked tokens (root cause Upstash quota blow-out — zie C.3.1). Sentinel: `[auth-recovery]` in Vercel logs.
  **Productie-verificatie pending** — Khidr: na deploy een verlopen sessie simuleren (revoke refresh token via Supabase Dashboard → refresh pagina → verwacht: cookies verdwenen, geen retry-loop, `[auth-recovery]` in logs).

- [x] **C.1.2 — Productie-tests na sessie 1 deploy** ✅ 2026-07-09 — geverifieerd via live twee-projecten-productie (ADR-045)
  Deze checklist beschreef de één-project subdomain-split; na de C.4.1-migratie draaien deze cross-host-gedragingen (cookies op `.indxr.ai`, redirects, open-redirect-preventie) live in productie en zijn ze bewezen werkend (authenticated dashboard cross-host + credit/playlist e2e-live-verificatie 2026-07-09). Env-vars `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_MARKETING_URL` staan per project.
  Handmatig browser-tests na Vercel-deploy met `NEXT_PUBLIC_APP_URL=https://app.indxr.ai` en `NEXT_PUBLIC_MARKETING_URL=https://indxr.ai`:
  - `sb-*` cookies staan op domain `.indxr.ai` (zichtbaar op beide hosts in DevTools)
  - `indxr.ai/dashboard` → 308 → `app.indxr.ai/dashboard`
  - `app.indxr.ai/` → redirect → `/dashboard`
  - `app.indxr.ai/dashboard` zonder sessie → `indxr.ai/login?next=https://app.indxr.ai/dashboard`
  - Na login: belandt op `app.indxr.ai/dashboard`
  - Logout: `sb-*` cookies verdwenen op beide hosts
  - `login?next=https://evil.com/steal` → belandt op `/dashboard/transcribe` (open redirect preventie)

- [x] **C.1.3 — Google OAuth flow productie-test** ✅ 2026-07-09 — bewezen in productie (PKCE-callback-bug gevonden + gefixt)
  De OAuth-callback (`apps/marketing/src/app/auth/callback/route.ts`) draait live; een PKCE-bug in dit pad is in productie ontdekt en opgelost (commit `f7dfa53` — `getClaims()` + middleware-matcher-exclude), wat betekent dat de flow daadwerkelijk end-to-end is uitgevoerd. Cross-host cookie op `.indxr.ai` werkt (zie C.1.2).
  Verifieer vóór test in Vercel Dashboard: is `NEXT_PUBLIC_ENABLE_OAUTH=true` op Production scope gezet? Als nee: OAuth-knoppen niet zichtbaar — skip test.
  Test: Google-login op `indxr.ai/login` → OAuth callback op `indxr.ai/auth/callback` → redirect naar `app.indxr.ai/dashboard/transcribe`. Controleer: cookie op `.indxr.ai`, sessie zichtbaar op beide hosts.

### Code Sessie 2 — mechanische sweep

- [x] **C.2.1 — Manifest CORS bug** ✅ OPGELOST door migratie (2026-07-09 geverifieerd)
  `src/app/layout.tsx:35: manifest: "/site.webmanifest"` — op `app.indxr.ai` vraagt de browser `app.indxr.ai/site.webmanifest` op; middleware geeft 308 → `indxr.ai/site.webmanifest` (cross-origin redirect) → CORS block in Console. Rapportage Khidr bevestigd via codebase.
  **Opgelost:** in de twee-projecten-setup serveert de app-host zijn eigen `apps/app/public/site.webmanifest` → `app.indxr.ai/site.webmanifest` resolvet same-origin, geen 308, geen CORS-block. De `manifest: "/site.webmanifest"`-tag in `apps/app/src/app/layout.tsx` is nu correct. (De originele fix-suggestie is achterhaald; de migratie loste de root-oorzaak op.)

- [x] **C.2.2 — Header: `/dashboard` links → `appHref`** ✅ 2026-07-09 geverifieerd
  `src/components/Header.tsx` heeft 3× `<Link href="/dashboard">` (regel 41 dropdown, regel 140 desktop "Go to app", regel 195 mobile). Op `indxr.ai` prefetcht Next.js `indxr.ai/dashboard` → 308 → `app.indxr.ai/dashboard` (cross-origin) → zelfde TypeError-crash als de omgekeerde fix in sessie 1. Alle drie moeten `<a href={appHref('/dashboard')}>` worden.
  **Opgelost:** `packages/shared/src/components/Header.tsx` gebruikt nu overal `appHref('/dashboard')` (+ `/dashboard/account`, `/dashboard/settings`) en `marketingHref(...)` voor marketing-paden — geen enkele `<Link href="/dashboard">` meer. Onderdeel van de 4-cross-host-link-fix (commit `8881619`).

- [ ] **C.2.3 — Email templates audit** — handmatige check Khidr
  Supabase Dashboard → Auth → Email Templates. Controleer of `{{ .SiteURL }}` variabelen correct resolven naar `https://indxr.ai` (confirm/reset links moeten naar marketing-host verwijzen, niet naar app). Niet code-verifieerbaar.

- [x] **C.2.4 — Python backend CORS origins** ✅ OPGELOST 2026-05-05
  `"https://app.indxr.ai"` toegevoegd aan `allow_origins` in `backend/main.py`. Cleanup-001.

- [x] **C.2.5 — Robots.txt strategie voor app-host** ✅ OPGELOST door migratie (2026-07-09 geverifieerd)
  `public/robots.txt` bevat `Disallow: /dashboard/` en `Disallow: /admin/` — correct voor marketing-host. Op `app.indxr.ai` geeft middleware `/robots.txt` een 308 naar `indxr.ai/robots.txt`; sommige crawlers volgen geen redirects voor robots.txt. Ideaal: `app.indxr.ai/robots.txt` retourneert `Disallow: /` inline. Optie: voeg `/robots.txt` toe als uitzonderingspad in middleware (`!isAppPath` skip) en serveer via Next.js `src/app/robots.ts` met host-detectie.
  **Opgelost:** elke app serveert nu zijn eigen statische `robots.txt`. `apps/app/public/robots.txt` = `User-agent: *` / `Disallow: /` (exact het beoogde inline-resultaat); `apps/marketing/public/robots.txt` behoudt de volledige marketing-regels + AI-crawler-allowlist + sitemap. Geen middleware-redirect meer nodig.

### Operationele issues

- [x] **C.3.1 — ~~Upstash Redis quota exhausted — BLOCKER voor async jobs~~** ✅ Worker-deel opgelost
  500K commands/maand limiet bereikt op 2026-05-04. Oplossing: ADR-048 Redis-splitsing besloten 2026-06-04. Worker omgezet naar Railway Redis (`ARQ_REDIS_URL`). Worker draait vanaf 2026-06-30 geverifieerd. Zie ADR-048.
  **Huidige staat:** Worker ✅ Railway Redis. Rate limiting ❌ (Upstash vars verwijderd uit Vercel 2026-05-06, nog niet hersteld). Caption cache ❌ (Upstash vars ook niet op Railway backend).

- [~] **C.3.2 — Rate limiting en caption cache uitgeschakeld in productie**
  `noopLimiter` actief → geen rate limiting. Python `get_caption_redis()` → `None` → caption cache disabled.
  **Pre-launch actie:** Upstash vars opnieuw toevoegen aan Vercel (beide projecten) + Railway backend. Worker heeft geen Upstash nodig (gebruikt Railway Redis).
  **Status:** tijdelijk acceptabel, geen blocker voor development. Niet lanceren met paid users zonder rate limiting.

### C.4 — Migratie naar twee Vercel projecten (monorepo)

- [x] **C.4.1 — Migratie uitvoeren** ✅ 2026-07-09 geverifieerd — zie ADR-045 voor beslissing en scope
  pnpm monorepo aanmaken: `apps/marketing/` (indxr.ai) + `apps/app/` (app.indxr.ai) + `packages/shared/`.
  Middleware hostname-routing verwijderen. Twee Vercel projecten aanmaken. Env vars per project.
  **Checkpoint:** commit 1fc0589 is de clean baseline voor migratie (bevat bug-fix d13c30e + handoff-documentatie inclusief ADR-045).
  **Geverifieerd tegen code (2026-07-09):** `apps/app` + `apps/marketing` + `packages/shared` bestaan, geen root `src/` meer, elke app heeft eigen `middleware.ts` zónder hostname-routing (alleen auth-guard + `/`→`/dashboard`). Commits `f8aab3d` (split), `fb0e359` (Turborepo), `875896f` (cross-host redirects). Productie draait live op de twee-projecten-setup.

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

- [ ] **2.8 — Interne JS-runtime evalueren (yt-dlp optie 2 — geen externe Node.js)**
    **Context:** Bij de yt-dlp upgrade van `2026.3.17` naar `2026.06.09` (2026-06-25) is bewust gekozen voor optie 1 (externe Node.js v22 via NodeSource in Dockerfile) als acute fix. Optie 2 — yt-dlp's ingebouwde Python-JS motor (`quickjs-ng` via `yt-dlp[default]`) gebruiken en de externe Node.js-afhankelijkheid elimineren — is een potentieel schonere lange-termijn-architectuur maar vraagt grondig testen.
    **Afweging:**
    - Voordeel: minder externe afhankelijkheden (geen NodeSource in Dockerfile, geen Node.js versie-coupling), kleinere image, minder bewegende delen bij yt-dlp-updates.
    - Risico: `quickjs-ng` is yt-dlp's ingebouwde motor en is minder bewezen in onze specifieke productie-setup. Onduidelijk of het schoon werkt voor zowel caption-extractie (`youtube_utils.py`) als audio-download (`audio_utils.py`) — caption-extractie via iOS client heeft JS normaal niet nodig; audio-extractie kan signature-solving vereisen.
    - Bijkomend: er is een latente inconsistentie in de huidige ydl_opts — `youtube_utils.py` + `main.py` gebruiken `enabled_runtimes`/`remote_components`, `audio_utils.py` gebruikt `js_runtimes: {'node': {}}`. Bij een overstap naar optie 2 moeten beide paden consistent zijn.
    **Vereiste test:** cascade en audio beide testen tegen een set bekende video's (incl. lange audio >60 min) vóór eventuele overstap. Zie `operations/monitoring.md` sectie "Dependency-onderhoud" voor context.

- [ ] **2.9 — Dependency-update-discipline implementeren**
    Zie `operations/monitoring.md` sectie "Dependency-onderhoud" voor het volledige principe en per-dependency risicooverzicht.
    **Taak:** periodieke versie-check opzetten die waarschuwt bij nieuwe releases zonder automatisch te installeren; verificatie-test die na een versie-bump een handvol bekende video's door de cascade haalt. Specifiek voor yt-dlp is dit het meest kritiek (vaakst nodig, hardst breekend).
    **Prioriteit:** na launch, zodra CI-pipeline stabiel is.

- [ ] **2.10 — Broadcast e-mail house-style templates** (post-launch)
    De admin-broadcast-e-mail (zie `apps/app/src/lib/mail.ts` `sendBroadcastEmails`) heeft bij launch een functionele maar kale plain-text unsubscribe-footer. Post-launch: e-mails opmaken in INDXR house-style — branded HTML-template, consistent met `send.indxr.ai`.

- [ ] **2.11 — Admin-brede job-indicator** (post-launch)
    Er is nu alleen een **per-account** `ActiveJobsIndicator` — geen admin-overzicht van **álle** lopende transcriptie/playlist-jobs over alle users heen. Nodig om de werkregel *"niet naar `master` pushen terwijl er actieve jobs lopen"* (zie de werkregel bij "Nieuw geïdentificeerd (2026-07-09)" hierboven — een worker-deploy doodt elke lopende job) betrouwbaar te maken zodra er meer verkeer is: bij één actieve gebruiker volstaat de per-account-indicator, maar bij schaal moet een admin in één blik álle niet-terminale `transcription_jobs` + `playlist_extraction_jobs` kunnen zien vóór een deploy. Trigger: zodra het jobvolume groeit voorbij handmatig overzicht.

---

## Fase 3 — Schaalbaarheidsfase (3–12 maanden post-launch)

- [ ] **3.1 — Volledige visuele redesign** met Claude Design (vervangt 1.20 cosmetische polish)
- [ ] **3.2 — API en yt-dlp/worker echt splitsen als services**
    Trigger: 100+ DAU.
- [ ] **3.3 — VPS-migratie van Python werklasten naar Hetzner**
    Trigger: Railway-bill > €80–100/maand.
    Risico-onderbouwing: Railway single-point-of-failure (5 grote incidenten sinds nov 2025; mei-2026 outage trof alle klanten + maakte backups tijdelijk ontoegankelijk; feb-2026 postmortem "grote blast radius") — minder afhankelijkheid van één strak-gekoppelde provider. Zie de risico-notitie bij de Supabase-backups-taak (1.19).
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
