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
    Fasenplan: Fase 0 ✅ | Fase 1 ✅ | Fase 2 (Whisper→ARQ) ✅ 2026-04-27 | Fase 3a ✅ (Supabase-laag + RPC) | Fase 3b.1 ✅ (RPC status-fix) | Fase 3b.2 ✅ (per-video chain code) | Fase 3b.3 ✅ (deploy + verificatie 22-video productietest) | Fase 4 [ ] (ack_late=True + idempotency keys) | Fase 5 TBD.
    **Fase 2 verificatie 2026-04-27:** YouTube Whisper bewezen via worker (job 2c11e87d, 26.54s end-to-end, bao5kiMmXoU). Upload-pad blijft asyncio in API-process bewezen (job fea97ef1, 9.2s). Drie deployment-issues tijdens verificatie opgelost: UPSTASH_REDIS_URL ontbrak op API-service, 8 env vars ontbraken op worker, PROXY_PASSWORD mismatch. Code zelf werkte correct.
    **ARQ library-keuze 2026-04-28:** Tijdens voorbereiding Fase 3 ontdekt dat ARQ in maintenance-only mode zit. Na grondige research besluit Khidr ARQ te houden tot post-launch heroverweging — zie ADR-026. Per-video architectuur (Fase 3) is library-onafhankelijk en wordt gebouwd op ARQ. Latere migratie naar Taskiq/streaq/Procrastinate is geschat 1-2 dagen werk omdat alle state in Supabase leeft (zie ADR-019 sectie Migratie-pad).
    Scope-beslissing: audio-upload pad blijft op asyncio.create_task (bytes in memory, korte flow); YouTube-extracties via ARQ. Zie ADR-019.
    **Fase 3b.2 geïmplementeerd 2026-04-28:** youtube_utils.py + transcription_pipeline.py nieuw; worker.py uitgebreid met process_playlist_video + process_playlist_retries; main.py: run_whisper_job + run_playlist_job verwijderd; /api/playlist/extract → ARQ enqueue.
    **Fase 3b.3 geverifieerd 2026-04-28:** 22-video playlist (Joe Rogan, 3 Whisper + 19 captions) in productie getest. 18/22 succesvol in 295s. 45cr afgetrokken. 4 failures allemaal YouTube-kant (2× bot_detection, 1× youtube_restricted, 1× extraction_error). Architecture chain volledig gevalideerd. Zie test-reports.md voor volledig rapport.

- [x] **1.5b — Error taxonomie documentatie** ✅ 2026-04-28
    Doel: één plek voor alle error_types met categorie, user-facing message, en mitigatie. Input voor taak 1.6 (cascade-prioritering), 1.10 (user-friendly messages), 1.19 (UI bugs).
    Zie [wiki/operations/error-taxonomy.md](../operations/error-taxonomy.md).
    Status: afgerond. 9 error_types gedocumenteerd. Raw yt-dlp logging bij `extraction_error` geïmplementeerd (`_classify_download_error()` logt nu raw error + video_id + job_id op WARNING). bgutil startup logging verbeterd in `main.py` + worker health check bij startup toegevoegd.

- [ ] **1.6 — yt-dlp fallback-cascade met bgutil PO token + alternatieve clients** (2–3 dagen)
    Doel: stabiliteit tegen YouTube bot-detection updates. Cascade-volgorde:
    1. youtube-transcript-api (caption-only, gratis)
    2. yt-dlp `--write-subs` met `tv,ios` client (geen PO token nodig)
    3. yt-dlp met PO token via bgutil-pot (web client)
    4. yt-dlp audio download → AssemblyAI
    5. Markeer `needs_manual_review`, ga door met playlist
    Bestaande bgutil-pot Rust binary blijft (zie ADR-007); iOS PO token fallback wordt onderdeel van deze cascade.
    Afhankelijk van: 1.5 (cascade-stappen worden queue-jobs).

- [ ] **1.7 — Graceful shutdown handling (SIGTERM)** (1 dag)
    Doel: in-flight jobs persisteren bij Railway restart in plaats van verdwijnen.
    Implementatie: SIGTERM-handler die job-state naar Supabase persisteert, heartbeat checker die `interrupted` jobs oppakt, ARQ `ack_late=True`.
    Afhankelijk van: 1.5.

- [ ] **1.8 — Cloudflare R2 buckets opzetten** (1 dag)
    Doel: audio-bestanden ontkoppelen van Railway (lagere egress, container-restart-safe, voorbereiding op latere VPS-migratie).
    Buckets: `indxr-audio` (TTL 24u, auto-delete na transcriptie), `indxr-transcripts` (persistent).
    Library: `boto3` (S3-compatible).
    Zie [ADR-020](../decisions/020-cloudflare-r2-storage.md).

- [ ] **1.9 — `master_transcripts` schema + write-logic** (1 dag)
    Doel: cache-fundament. Elke nieuwe transcriptie vult de cache (alleen publieke YouTube-videos).
    Tabel-velden: `video_id`, `language`, `transcription_model` (bv. `youtube_captions`, `assemblyai_universal_3`, `assemblyai_universal_4`), `r2_key` (verwijzing naar JSON in R2-bucket), `quality_score`, `duration_seconds`, `created_at`, `is_public`.
    Write-only in deze fase (read-logic in 1.11).
    Afhankelijk van: 1.8.
    Zie [ADR-021](../decisions/021-master-transcripts-cache.md).

### Realtime + cache activatie

- [ ] **1.10 — Supabase Realtime als primaire methode + smart polling als fallback** (2–3 dagen)
    Doel: instant UX-updates op job-state changes, met polling als robuuste fallback voor users achter firewalls.
    Implementatie: Realtime-subscription op `playlist_extraction_jobs` en `transcription_jobs` tabellen, filter per job-id, auto-disconnect na 5 min idle. Bij WebSocket-failure: switch naar smart polling.
    Afhankelijk van: 1.5 (queue moet stabiel zijn voor reliable state-updates), 1.7 (graceful shutdown), 1.3 (smart polling als fallback).
    Zie [ADR-022](../decisions/022-realtime-plus-polling-fallback.md) (supersedet ADR-008).

- [ ] **1.11 — `master_transcripts` cache read-logic** (1 dag)
    Doel: cache-hits leveren bij herhaalde transcripties. Flow: bij nieuwe aanvraag → check cache op `(video_id, language, transcription_model)` → hit: kopieer naar `user_transcripts`, trek credits af, klaar → miss: normale flow, vul cache na succes.
    Belangrijk: gebruikers betalen ALTIJD voor AI-transcriptie, ook bij cache-hit. Dit is bewuste keuze (zie ADR-021): de cache verlaagt onze kosten en versnelt de levering, niet de prijs voor de gebruiker.
    Afhankelijk van: 1.9.

### Launch-noodzaak

- [ ] **1.12 — Anti-abuse op welcome credits** (1–2 dagen)
    Doel: voorkom credit-farming bij launch.
    Componenten: email-verificatie API (Kickbox of Clearout), Cloudflare Turnstile op signup, device fingerprint hash, disposable email blocklist (github.com/disposable/disposable). Welcome credits worden pas toegekend NA verificatie.
    Zie [ADR-024](../decisions/024-anti-abuse-welcome-credits.md).

- [ ] **1.13 — Stripe live-mode activatie + Radar config** (4u)
    Doel: live betalingen + fraud-bescherming.
    Componenten:
    - Stripe account activeren met KVK/bedrijfsinfo
    - 5 producten in live mode (Try €2.49/200cr, Basic €5.99/500cr, Plus €11.99/1100cr, Pro €24.99/2600cr, Power €49.99/5500cr)
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

### Pre-launch — bestaande features afronden

- [ ] **iOS PO token fix voor bgutil** — wordt opgelost als onderdeel van 1.6 (yt-dlp cascade).
- [ ] **Opus 249 audio format valideren en deployen** — kwaliteitstest op 50 diverse video's, dan format selector aanpassen. Zie ADR-016. ~63% reductie in proxy-bandbreedte.
- [ ] **Website copy volledig herschrijven** — landing page, pricing, FAQ, onboarding, error messages. Plaats: vóór 1.20 (polish heeft definitieve copy nodig).
- [ ] **RAG JSON: Settings chunk size ✓ feedback zichtbaarheid** — zie known-issues. Kleine fix in `DeveloperExportsCard.tsx`.
- [ ] **RAG JSON export (30-seconden chunks)** — kernfeature voor AI/developer doelgroep, zie ADR-015.

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
- [ ] **3.5 — bgutil PO token-server multi-region**
    Trigger: latency-issues internationaal.
- [ ] **3.6 — Channel extractie** (heel YouTube-kanaal in één klik) — vereist queue-architectuur die in Fase 1 is gelegd.
- [ ] **3.7 — Notion / Zapier / Obsidian integraties** — OAuth per integratie.
- [ ] **3.8 — Gamification systeem** (XP, levels, reward chests) — schema bestaat, implementatie deferred tot na redesign.
- [ ] **3.9 — Referral program** (5+5 credits met abuse-preventie).
- [ ] **3.10 — Volledige credit transaction history** (nu max 20 rijen) — onbeperkt of hogere limiet, integreren in admin dashboard.
- [ ] **3.11 — Queue library heroverweging post-launch**
    Trigger: eerste van (a) zes maanden post-launch, (b) ARQ-specifieke bug die ons blokkeert, (c) productie-incident dat library-feature vereist die ARQ niet biedt.
    Kandidaten op dat moment evalueren met productie-data: Taskiq, streaq, Procrastinate. Migratie-werk geschat 1-2 dagen omdat alle state in Supabase leeft. Zie ADR-026.
