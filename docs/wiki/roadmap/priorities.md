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
    - Supabase email-verificatie aanzetten (uitgeschakeld tijdens dev)
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

- [ ] **1.22 — Credit-reservering bij job-start + refund van ongebruikte/gefaalde video's** (financieel-kritiek)
    Doel: los de credit-race bij concurrent jobs op; **blokkeert veilige concurrency / horizontaal schalen.**
    Probleem: credits worden nu per-video op verwerkingsmoment afgetrokken, niet gereserveerd bij job-start; `deduct_credits_atomic` is niet job-idempotent (geen dedup op `job_id`) → bij concurrent uitvoering of watchdog-re-enqueue is dubbele aftrek mogelijk (zie replica-safety-audit, LOG 2026-07-06).
    Componenten (backend):
    - **Reserveer** de geschatte kosten bij job-start (som over de te verwerken video's), i.p.v. per-video best-effort aftrek. Reserveren op **`user_credits.credits`** (de gezaghebbende balans — NIET op `SUM(credit_transactions)`, dat reconcilieert niet, zie bug (a)). Per-video-duur is bij start bekend (availability-check + `video_metadata`) → vol bedrag reserveerbaar; settle tegen de **werkelijke** audio-duur en refund het verschil + duur-0-randgevallen.
    - **Refund** het ongebruikte/gefaalde deel bij afronding (per gefaalde video, en het verschil tussen reservering en werkelijk verbruik).
    - **Watchdog-claim atomair maken** — conditional UPDATE / CAS i.p.v. read-then-write: Pass 1 `UPDATE … WHERE id=X AND watchdog_attempts=0`, Pass 2 `… WHERE id=X AND status='interrupted'`, alleen handelen bij `rows_affected=1`. Sluit het dubbele-refund-risico ook als de cron-dedup ooit faalt. (Geldt al bij 1 worker; zie replica-safety-audit, LOG 2026-07-06.)
    - **[x] Deelfix opgeleverd — upload-reserve server-side probe (✅ 2026-07-07):** een audio-**upload** reserveerde `ceil(0/60)→1` credit (de duur is pas ná reserve bekend) → de overspend-gate was **leeg voor uploads** (1 credit → uur-lange upload; het meerdere werd gratis werk via de bijbetaald-cap `LEAST(-refund, balance)`). Nu bepaalt de backend de duur **server-side vóór reserve** (`estimate_upload_reserve_cost`, ffprobe; royale bestandsgrootte-schatting als fallback, **nooit stil 1**); de client-waarde wordt niet vertrouwd (directe JWT-upload). YouTube reserveerde al correct (duur uit metadata). Settle/refund **ongewijzigd** (settle blijft op de echte geprobede duur). Geverifieerd: live test 1 (reserve 1 → settle 22 → refund −21 vóór de fix) + `test_settle_refund.py` scenario's O/P (76/76). Zie [ADR-050](../decisions/050-credit-reservation-model.md).

    **Twee latente credit-bugs die deze fix meteen meepakt (geverifieerd 2026-07-06 tegen baseline-migratie + RPC's):**
    - **(a) Tegengestelde sign-conventies in `credit_transactions`** 💰 — whisper-debits worden **positief** opgeslagen (`deduct_credits_atomic`, `type='debit'`), caption-debits **negatief** (`update_playlist_video_progress` insert `-p_amount`, óók `type='debit'`). Gevolg: het log **reconcilieert niet** naar `user_credits.credits`, en de admin-metric **"Credits Consumed" (`SUM WHERE type='debit'`) is nu al fout** — caption- en whisper-debits heffen elkaar deels op. De **live balans klopt wel** (beide paden doen `credits = credits - p_amount`). Fix: **sign-conventie uniformeren** + een **reconciliatie-invariant** (balans == afgeleide som; nu geen DB-constraint die dit afdwingt). Voorwaarde voor betrouwbare admin-metrics (1.24) en voor een auditeerbaar log.
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
