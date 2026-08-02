# INDXR.AI Wiki

**YouTube transcript SaaS** — Next.js 16 frontend op Vercel, FastAPI Python backend op Railway, Supabase als database.

Gebruik deze wiki voor de *waarom* achter technische en zakelijke beslissingen. Voor *wat* en *hoe*, zie de root-docs (`docs/DEVELOPMENT.md`, `docs/ARCHITECTURE.md`).

---

## Snelle navigatie

### Start hier als je...

**...nieuw bent in de codebase:**
→ [Architecture Overview](architecture/overview.md) → [Database Schema](architecture/database-schema.md) → [Auth & Security](architecture/auth-and-security.md)

**...een technische beslissing wilt begrijpen:**
→ [Beslissingenlog](decisions/) — elke ADR beschrijft context, keuze, rationale en consequenties

**...de AI/transcriptie pipeline begrijpt:**
→ [AI Pipeline](architecture/ai-pipeline.md) → [001 Python Backend](decisions/001-python-backend.md) → [002 YouTube Captions](decisions/002-youtube-captions.md)

**...wilt weten wat er 's nachts draait (crons):**
→ [Nachtelijke jobs](architecture/nightly-jobs.md) — `snapshot_finance_day` (pg_cron) + `fetch_service_metrics` (ARQ), beide 02:00 UTC, feitelijk beschreven + gemeten Decodo-delay

**...pricing of business wilt begrijpen:**
→ [Pricing](business/pricing.md) → [Positionering](business/positioning.md) → [052 Pricing Restructure (4 tiers)](decisions/052-pricing-restructure-4-tiers.md)

**...het credit-systeem begrijpt:**
→ [Credit System](architecture/credit-system.md) → [009 Credit Granulariteit](decisions/009-credit-granularity.md) → [010 Playlist Pricing](decisions/010-playlist-pricing.md)

**...deployt of debugt:**
→ [Deployment](operations/deployment.md) → [Known Issues](operations/known-issues.md)

**...de roadmap wilt zien:**
→ [Launch Priorities](roadmap/priorities.md) (BLOCKERS / PRE-LAUNCH / POST-LAUNCH) → [Post-Launch Backlog](roadmap/backlog.md)

---

## Beslissingen (`decisions/`)

| Bestand | Beslissing |
|---------|-----------|
| [001-python-backend.md](decisions/001-python-backend.md) | Waarom een aparte FastAPI service naast Next.js |
| [002-youtube-captions.md](decisions/002-youtube-captions.md) | Captions-first extractie, Whisper als fallback |
| [003-assemblyai.md](decisions/003-assemblyai.md) | Waarom AssemblyAI over self-hosted Whisper |
| [004-deepseek-v3.md](decisions/004-deepseek-v3.md) | Waarom DeepSeek V3 over GPT-4 voor summarization |
| [005-supabase.md](decisions/005-supabase.md) | Auth + DB + RLS in één managed pakket |
| [006-credit-model.md](decisions/006-credit-model.md) | *(Vervangen door ADR-009)* 1 credit = 10 min, atomic deduction |
| [007-bgutil-pot.md](decisions/007-bgutil-pot.md) | Rust binary voor YouTube PO tokens |
| [008-polling-vs-websockets.md](decisions/008-polling-vs-websockets.md) | Polling architectuur voor async jobs |
| [009-credit-granularity.md](decisions/009-credit-granularity.md) | Switch naar 1 credit = 1 minuut (vervangt ADR-006) |
| [010-playlist-pricing.md](decisions/010-playlist-pricing.md) | Playlist: 1 credit/video, eerste 3 gratis, geen dubbele rekening |
| [011-ai-summary-credits.md](decisions/011-ai-summary-credits.md) | AI samenvatting kost 3 credits (was 1) |
| [012-pricing-tiers.md](decisions/012-pricing-tiers.md) | Nieuwe tiers: Try/Basic/Plus/Pro/Power met psychologische prijsankering |
| [013-welcome-credits-freemium.md](decisions/013-welcome-credits-freemium.md) | 25 welcome credits + permanent paid user status |
| [014-export-format-gating.md](decisions/014-export-format-gating.md) | Anoniem = TXT only; ingelogd = alle formaten |
| [015-rag-json-export.md](decisions/015-rag-json-export.md) | RAG-geoptimaliseerde JSON export (30s chunks + metadata) |
| [016-opus-249-audio-format.md](decisions/016-opus-249-audio-format.md) | yt-dlp format selector: Opus 249 voor lagere proxy-kosten |
| [017-proxy-provider-decodo.md](decisions/017-proxy-provider-decodo.md) | Overstap IPRoyal → Decodo zodra tegoed op is |
| [018-export-consolidation.md](decisions/018-export-consolidation.md) | Export-logica: centraliseren in formatTranscript vs inline houden in TranscriptCard |
| [019-arq-job-queue.md](decisions/019-arq-job-queue.md) | ARQ via Upstash Redis voor durable job queue |
| [020-cloudflare-r2-storage.md](decisions/020-cloudflare-r2-storage.md) | Cloudflare R2 voor audio en transcript storage |
| [021-master-transcripts-cache.md](decisions/021-master-transcripts-cache.md) | master_transcripts cache (metadata in Supabase, content in R2) |
| [022-realtime-plus-polling-fallback.md](decisions/022-realtime-plus-polling-fallback.md) | Realtime + smart polling fallback (supersedet ADR-008) |
| [023-observability-stack.md](decisions/023-observability-stack.md) | Sentry + PostHog + BetterStack + Crisp + Axiom observability stack |
| [024-anti-abuse-welcome-credits.md](decisions/024-anti-abuse-welcome-credits.md) | Vier-laagse anti-abuse op welcome credits |
| [025-per-video-decompositie.md](decisions/025-per-video-decompositie.md) | Per-video chain architectuur voor playlist-extractie (library-onafhankelijk) |
| [026-arq-maintenance-mode-acceptatie.md](decisions/026-arq-maintenance-mode-acceptatie.md) | ARQ maintenance-mode geaccepteerd — post-launch heroverweging gepland |
| [027-bgutil-deprioritization.md](decisions/027-bgutil-deprioritization.md) | bgutil-pot verwijderd — yt-dlp client-rotatie vervangt PO-token aanpak (supersedet ADR-007) |
| [028-youtube-data-api-metadata.md](decisions/028-youtube-data-api-metadata.md) | YouTube Data API videos.list voor metadata-aanvulling cascade stap 1; yt-dlp fallback bij quota-uitputting |
| [029-caption-vs-ai-transcription-products.md](decisions/029-caption-vs-ai-transcription-products.md) | Caption extraction en AI transcription als aparte producten — cascade stap 4+5 vervalt; AI transcription is user-gestuurd betaald product |
| [030-fase4-crash-recovery-leerervaring.md](decisions/030-fase4-crash-recovery-leerervaring.md) | Fase 4 crash-recovery leerervaring — ack_late bestaat niet, wat we wél bouwden, watchdog-recept bewezen |
| [031-yt-dlp-audio-retry-strategy.md](decisions/031-yt-dlp-audio-retry-strategy.md) | yt-dlp audio retry-strategie met session-rotatie — partial-write fix voor lange downloads via residentiële proxies |
| [032-retry-pending-status.md](decisions/032-retry-pending-status.md) | retry_pending status voor playlist crash recovery — ADR-030 Gap 1 opgelost |
| [033-three-layer-site-architecture.md](decisions/033-three-layer-site-architecture.md) | Drie-lagen site-architectuur: marketing / content / app-subdomain |
| [034-app-subdomain.md](decisions/034-app-subdomain.md) | App-subdomain `app.indxr.ai` voor dashboard en admin |
| [035-articles-single-umbrella.md](decisions/035-articles-single-umbrella.md) | SEO-content verhuist naar `/articles/[slug]` — één umbrella |
| [036-auth-on-marketing-domain.md](decisions/036-auth-on-marketing-domain.md) | Auth flows blijven op marketing domain (Linear/Vercel pattern) |
| [037-no-comparison-pages.md](decisions/037-no-comparison-pages.md) | Geen comparison pages pre-launch — `/alternative/*` wordt verwijderd |
| [038-no-audience-hubs.md](decisions/038-no-audience-hubs.md) | Geen audience hubs pre-launch — post-launch op basis van PostHog-data |
| [039-llms-txt-low-priority.md](decisions/039-llms-txt-low-priority.md) | llms.txt low-priority — geen bewezen AI-citation lever (mei 2026) |
| [040-audience-aware-article-pattern.md](decisions/040-audience-aware-article-pattern.md) | Article pattern: mix van single-audience en multi-audience per artikel |
| [041-system-default-color-scheme.md](decisions/041-system-default-color-scheme.md) | Light + dark mode beide first-class, system default — geen forced dark |
| [042-about-page-organization-schema.md](decisions/042-about-page-organization-schema.md) | /about gebruikt Organization schema, geen Person schema — founder anoniem |
| [043-author-byline-indxr-editorial.md](decisions/043-author-byline-indxr-editorial.md) | Author byline: "INDXR Editorial" als enige author op alle articles |
| [044-user-feedback-channels.md](decisions/044-user-feedback-channels.md) | Drie aparte feedback channels: Messages, Support, Testimonials (post-launch unlock) |
| [045-two-vercel-projects-decision.md](decisions/045-two-vercel-projects-decision.md) | Migratie van één-project subdomain split naar twee Vercel projecten (monorepo) |
| [046-monorepo-import-aliases.md](decisions/046-monorepo-import-aliases.md) | @/* lokaal, @indxr/shared/* expliciet voor shared — silent shadow risico geëlimineerd |
| [047-turborepo-build-orchestration.md](decisions/047-turborepo-build-orchestration.md) | Turborepo als build-orchestrator — intelligent caching, cold 51s → warm 63ms |
| [048-redis-split-upstash-railway.md](decisions/048-redis-split-upstash-railway.md) | Redis-splitsing: Upstash voor frontend (rate-limiter + caption-cache), Railway-Redis voor ARQ worker |
| [049-dead-job-reaper.md](decisions/049-dead-job-reaper.md) | Dead-job reaper (Pass 0 in watchdog): stuck transcription_jobs → terminale status; playlist-veiligheid via heartbeat-branch-scheiding |
| [050-credit-reservation-model.md](decisions/050-credit-reservation-model.md) | Credit-reservering (reserve-and-hold) voor alle jobs — reserveren bij start, refund = gereserveerd − verbruik; sluit concurrent-overspend race; gefaseerd (fundering nu, gedrag na review) |
| [051-stuck-running-playlist-recovery.md](decisions/051-stuck-running-playlist-recovery.md) | Stuck-'running'-playlist recovery — per-video download-timeout (preventie) + watchdog reap-pass (detectie op voortgang, refund-vóór-claim via bestaande primitieven) + Pass 1b bounded + caption-cap |
| [052-pricing-restructure-4-tiers.md](decisions/052-pricing-restructure-4-tiers.md) | Pricing-herstructurering: 4 tiers (Try/Starter/Plus/Power), BTW-inclusief, worst-case-geprijsd, Power 3.100cr, Adaptive Pricing EUR-settlement, max −20% uniform (supersedet ADR-012) |
| [053-on-demand-invoicing.md](decisions/053-on-demand-invoicing.md) | On-demand BTW-facturen voor afgeronde Checkout-betalingen: Customer→Invoice→inclusive item→finalize→paid_out_of_band, één Customer per user, koppeling aan originele betaling, geen fee op sales zonder factuurbehoefte |
| [054-cost-usage-capture-layer.md](decisions/054-cost-usage-capture-layer.md) | Cost/usage capture-laag + `cost_config` runtime tarief-tabel: per-job Decodo-bytes/AssemblyAI-model/DeepSeek-tokens, Stripe netto (fee+BTW+settlement), credit-`kind`-stempel, per-user `library_bytes`-meter, acquisitie-bron bij signup |
| [055-money-model-geld-block.md](decisions/055-money-model-geld-block.md) | Money-model & GELD-blok (admin etappe 1): `product_type`-stempel (leaf, playlist=composiet), `is_internal`-filter op élk cijfer, revenue=purchased-only + granted-first, `opex_expenses`, auditeerbare `admin_geld_summary()` RPC |
| [056-admin-control-center-redesign.md](decisions/056-admin-control-center-redesign.md) | Admin herontwerp: tabs (Overview/Finance/Growth/Operations/…), Finance top-down P&L (recognized\|deferred + real\|estimated splits), Growth-funnel + CAC/LTV, Operations systeem-health, auto-flag test-accounts (`+test`/`@indxr-test.com`) + `admin_growth_summary()`/`admin_operations_summary()` |
| [057-cost-model-close.md](decisions/057-cost-model-close.md) | Money-model sluiten (Blok A–F): per-caption `usage_logs` voor ingelogden + snapshots, egress op mislukte jobs, som van retry-egress, caption dubbeltelling weg (echte COR i.p.v. dagteller-schatting), R2 storage-COR-regel, playlist per-minuut voor whisper — sluit-test geverifieerd |
| [058-round-prices-card-layout-rag.md](decisions/058-round-prices-card-layout-rag.md) | Ronde prijzen (Try €5 / Starter €15 / Plus €25 / Power €60), 3-tier card-layout met Plus center-stage + "Recommended" + Try als kleinere instap, RAG 1cr/10min — ihsaan (geen ,99-trucs) + kwaliteitssignaal; supersedet ADR-052 |
| [059-finance-snapshot-and-live-overlay.md](decisions/059-finance-snapshot-and-live-overlay.md) | Range-refactor `_geld_scope` (regressie byte-identiek) + onherstelbare nachtelijke `finance_daily_snapshot` via pg_cron (DST-aware Amsterdam-dag) + live-overlay: bevries alleen measured, entered-OPEX blijft live (trend kán na expense-edit verschuiven — bedoeld) |
| [060-accrual-cost-model-and-stripe-fee.md](decisions/060-accrual-cost-model-and-stripe-fee.md) | Accrual-kostenmodel op `opex_expenses` (reeks/occurrence, changed-from-this-month herschrijft geen history), entered=external-only, Stripe-fee uit `balance_transaction.fee_details` (geen hardcoded rates) = measured OPEX "Payment processing" op verkoopdatum (nooit COR); invoicing-fee = aparte entered-regel |
| [061-chronological-revenue-recognition.md](decisions/061-chronological-revenue-recognition.md) | Omzet-recognitie chronologisch (FIFO purchase-lots, granted-first per verbruiksmoment via `_recognize_asof`) i.p.v. cumulatieve pooling — verhelpt retroactieve clawback (grant ná verbruik at erkende omzet op); een grant van vandaag raakt het verleden/bevroren snapshots niet. COR-tabel reconcilieert via per-method `against_revenue_by_method`, granted-levering zichtbaar als goodwill in OPEX |
| [062-market-scope-and-country-guard.md](decisions/062-market-scope-and-country-guard.md) | Markt-scope: Stripe Radar `billing_address_country`-blocklist (GB/CH/KR/TR/IN/BR/UY/OM/RS — landen met drempelloze registratieplicht) i.p.v. webhook/frontend-guard (Radar weigert vóór de charge → niets te refunden); geen EU-landen (Geo-blocking Regulation + OSS dekt EU). Pogingen gelogd in `payment_attempts` (detectie + Radar-fee-driver); Radar €0,02/screen = measured OPEX. CH-drempel = wereldomzet (ESTV). Zie `business/tax-jurisdictions.md` |
| [063-per-user-cor-and-stripe-fee-cor.md](decisions/063-per-user-cor-and-stripe-fee-cor.md) | COR-against-revenue per-user i.p.v. gepoold (`Σ_user user_period_COR × user_period_share`, periode-share niet all-time) — sluit dezelfde pooling-klasse als ADR-061, nu in de COR-splitsing (bewezen A/B: €0,01 against / €10 goodwill). Stripe-fee verplaatst van OPEX naar COR, gedefereerd per lot (`recognized_fee`/`deferred_fee`, revenue-matched, geen share/goodwill). `deferred.credits` = echte Σ lot_rem i.p.v. blended terugrekening. COR-tabel = volle kost (rij vermenigvuldigt) + aparte against/goodwill-splitregel. NULL-COALESCE-valkuil op per-user `sum()` opgelost |
| [064-snapshot-clean-start-and-entered-overlay.md](decisions/064-snapshot-clean-start-and-entered-overlay.md) | `snapshot_finance_day` net gelijkgetrokken met ADR-063 (against-revenue + recognized_fee + per-user storage; F5b). Entered-OPEX blijft **live-overlay** (niet bevriezen — bewerkbare regels werken retroactief door; kolom `net_profit_measured` = net vóór entered). Oude snapshot-rijen (internal testruis) `DELETE`'d i.p.v. gebackfilld → schone start; Trend leest `MIN(snapshot_date)` per scope (niet hardcoded). F2 (AI-summary-tokenlog op `generated_at`) + F3 (storage gemeten via `daily_library_bytes` + per-user geattribueerd, `storage_approx`-vlag) in dezelfde taak |
| [066-proxy-overhead-opex.md](decisions/066-proxy-overhead-opex.md) | F18 proxy-volledigheid: alle Decodo-bytes tellen. Ongemeten paden (mislukte/geblokkeerde jobs, playlist-info/metadata-scrapes, caption-failure `extract_info`-egress) → nieuwe `proxy_usage_log` + `transcription_jobs status<>'complete'`, samen als OPEX-regel "Proxy overhead" (`bytes × decodo`, driver zichtbaar). OPEX niet COR (levert geen betaalde eenheid, zelfde soort als free-caption-funnel). Disjunct van COR (`complete`-only) bewezen (`overlap=0`); forward-only, geen backfill; bgutil weg (ADR-027), geen health-check |
| [067-service-balances-and-decodo-reconciliation.md](decisions/067-service-balances-and-decodo-reconciliation.md) | F17 saldi/reconciliatie: nachtelijke ARQ-cron (Railway, 02:00 UTC, `fetch_service_metrics`) haalt DeepSeek prepaid-saldo (→ Operations-alert, drempel in `cost_config.deepseek_low_balance_usd`) + Decodo dagverkeer (`POST api.decodo.com/.../statistics/traffic`, nieuwe env-var `DECODO_API_KEY` = dashboard-token op de **worker-service**, niet Vercel). Finance krijgt OPEX-regel "Proxy reconciliation" (billed − measured = gat, external-only want account-niveau; `GREATEST(0,gap)` want wire vs gedecomprimeerd). Faalgedrag expliciet: API faalt → "unavailable" + tijdstip laatste succes (nooit $0/oud getal), `coverage_days=0` → géén gat i.p.v. 100%. AssemblyAI heeft geen API → niets gebouwd (vastgelegd in provenance). Keys alleen server-side; `record_service_fetch` REVOKE PUBLIC/anon/auth |
| [069-terms-acceptance-at-checkout.md](decisions/069-terms-acceptance-at-checkout.md) | **Verplicht Terms+Privacy-vinkje bij checkout** (incorporatie + grondslag §7 herroeping). App-UI-vinkje met **server-side gate** (`400` zonder `termsAccepted`) i.p.v. Stripe `consent_collection` (dat maar één ToS-link steunt, geen tweede klikbare Privacy-link). Marketing-auto-checkout redirect niet meer stil door. Vastlegging in nieuwe RLS-tabel `terms_acceptances` (user/timestamp/`terms_version`/`stripe_session_id`) + `session.metadata.termsVersion`. Buiten finance-keten → audit 31/0/0 intact |
| [068-ai-summary-eu-llm-gateway.md](decisions/068-ai-summary-eu-llm-gateway.md) | AI-summary provider DeepSeek → **AssemblyAI EU LLM Gateway** (`gemini-2.5-flash`, Haiku-fallback; GDPR/EU-residency, DeepSeek had geen DPA/SCC). Prijs blijft 3 credits. Echte summary-COR tegen het Gemini-tarief (`cost_config.assemblyai_llm_usd_per_1m_*`, FX via `usd_eur_rate`); `_geld_scope`/`admin_finance_summary`/`admin_operations_summary` gerepoint, `deepseek_*`-kolommen + DeepSeek-balanspoll + Operations-widget verwijderd. ZDR = BAA-vervolg (Khidr) |
| [082-assemblyai-submit-poll-resume.md](decisions/082-assemblyai-submit-poll-resume.md) | **AssemblyAI submit()+poll** (was blocking `transcribe()`): non-blocking indienen → `provider_transcript_id` op de jobrij, eigen poll-loop (heartbeat per poll; fase-capture `submitted_at`→`provider_processing_at`→`provider_processing_ms`, `assemblyai_language/model`). **Resume-veilig** na worker-herstart maar STRAK begrensd (verkeerde inhoud > dubbel betalen): her-poll alleen bij zelfde jobrij + niet-terminaal + live status `queued`/`processing` + submission binnen 1-dag-TTL, anders opnieuw indienen + loggen. Grens bewezen met test (stale + mismatch id → niet hergebruikt). ARQ `job_timeout` 7200→37800s uit config (Defect 1). Echte lifecycle prod-geverifieerd (deploy `f7c69fa`, worker schoon), niet lokaal (geen lokale key). |
| [086-youtube-captions-rename.md](decisions/086-youtube-captions-rename.md) | **"Auto-captions" → "YouTube captions"** (label-only). Alleen zichtbare tekst (UI, export-metadata, marketing, articles, /docs, docs/content); DB-enum `processing_method='youtube_captions'` + method-keys **ongemoeid** (breekt anders rijen/backend-branch/dedup/Playwright-keys). Concept-uitleg over YouTube's feature (mechanisme/nauwkeurigheid/beschikbaarheid) houdt "automatic captions". Geen docs-route hernoemd (geen `/docs/*/auto-captions`-route → geen redirect); accuracy-anker `#auto-captions`→`#youtube-captions` (nul refs). `docs/wiki` bewust niet meegenomen. |
| [085-transcript-page-redesign.md](decisions/085-transcript-page-redesign.md) | **Transcriptpagina-herontwerp** (`/dashboard/library/[id]`): leesbare alinea's via `buildReadingParagraphs` (data-gedreven, configureerbaar, unit-getest — captions breken op zinsgrens ná 22s, AI op 32s + `maxChars=500`-guardrail; gemeten median 51/82/91 woorden); conditionele tabs + **content-fallback** (geen dood tabblad) + mobiele view-selector; **nocookie IFrame Player API** (lazy, geen cookie tot playback) met in-app **seek** op tijdstempels (verving de enige cookieful embed); stale-summary via nieuwe kolom `edited_content_updated_at` (gezet in élk writer-pad); RAG-presets gratis client-side na aankoop; privacyverklaring bijgewerkt. Header/toolbar-visuele laag + Edit-routing = resterend. |
| [084-billing-to-credits.md](decisions/084-billing-to-credits.md) | **`/dashboard/billing` → `/dashboard/credits`** + geld op één plek. Credits = money-hub (saldo, pakketten, `TransactionHistoryCard` verhuisd van Account, `PurchaseHistoryCard` mét factuur); Account houdt identiteit/beveiliging/opslag. Stripe `success_url`/`cancel_url` direct naar `/dashboard/credits/*`; permanente redirect `/dashboard/billing(/*)` → credits (vangt oude bookmarks + in-flight sessie → nooit 404). Alle koop-routes → Credits (topbar-pil mét `+`, dashboard buy-more, avatar-menu, shared insufficient-credits-links, marketing BuyButton). Support-componentmap niet hernoemd (churn). |
| [083-library-list-redesign.md](decisions/083-library-list-redesign.md) | **Library-lijst herontwerp (Fase 1):** data via view `transcripts_list` (`security_invoker`, has_*-booleans, nooit meer de transcript-jsonb per rij); grid+thumbnails weg; twee-regelige rij met `dir="auto"`; mono-badges `CC`/`AI`/`SUM`/`RAG` (edited = `-soft`-tint **+** potlood); echte server-side filters (Status/Source/Has/Duration/Added) + chips + "N of TOTAL"; sort+dir+zoek in URL, dichtheid in localStorage; tri-state select-all (alleen huidige pagina, geen cross-page); rij- en bulk-menu gescheiden; Move-to-collection-semantiek; twee lege staten; mobiele bottom-sheets (dep-vrij); sidebar collectie-filter; Home = beehive-SVG. Migratie `20260731160000`. Fase 2 (voortvloeiende schermen) + Fase 3 (billing→credits) volgen apart. |
| [081-playlist-free-slots-per-method.md](decisions/081-playlist-free-slots-per-method.md) | **Playlist gratis-slots per-methode** (was positioneel): de 3 gratis slots gaan naar de eerste 3 **caption**-video's (vooraf bepaald uit video_ids+whisper_ids), AI kost nooit een slot → bedrag volgorde-onafhankelijk. **Geen doorschuif** bij een gefaalde gratis video (slot vervalt) → reservering==settlement triviaal. Retries erven nooit een vers slot. Eén regel-bron: `credit_manager.playlist_free_ids` (Py) + `pricing.playlistFreeIds` (TS), gesynct via gedeelde fixture `test-fixtures/playlist_free_slots.json` (CI faalt bij divergentie). Stap 1 consolidatie=bewezen no-op (`14a4173`); stap 2=gedragswijziging, bewezen nooit-duurder (echte playlist 88→87). Copy + popover moeten mee (frontend-sessie). |
| [080-transcribe-method-colour-cost-and-errorcard.md](decisions/080-transcribe-method-colour-cost-and-errorcard.md) | **Transcribe-afwerking**: methodekleur-conventie (auto-captions=sky / AI=indigo, exact de Library-badge-tokens, `method.ts`; audio-upload=indigo; geel weg, groen=gratis/gelukt, rood=fout); kostenweergave-regel (`Total` ~20px prominent, saldo secundair in `--fg-subtle`, tekort→Deselect/Buy i.p.v. dode knop; `CostBreakdown`+`BalanceLine`); gedeelde `ErrorCard`+centrale copy-map gekeyd op backend-code (onbekend→neutrale kaart+code+contact, PostHog-log; control-flow ongemoeid); playlist-afronding mockup C (neutrale kop, groen alleen 100%, bon met authoritative `Charged`/refund, per-video Retry vervalt→`Retry all N` geen cap, ronde-nummer voor telemetrie+toon); voortgang één statusoppervlak (banner weg, selectielijst weg tijdens run, per-video rijen+methodebadge, URL/Fetch disabled) |
| [079-transcribe-workbench-redesign.md](decisions/079-transcribe-workbench-redesign.md) | **Transcribe-werkbank herontwerp**: één gedeelde `TranscribeWorkbench` (beide apps, render-prop-slots, geen fork); `?mode=` via History API (`replaceState`, niet `router.replace` — beschermt live job-state + Remotion-rust); `SourceChoice` i.p.v. AI-toggle (in-place op `useWhisper`, uitgelogd gated via `onAiRequiresAuth`); dashed empty-box weg → idle `RecentTranscripts`/`MicroTrustRow` (verdwijnt via observationele `onBusyChange`); `ResultCardShell`+`JobProgressCard` unificeren progress/result-chrome zonder job-state te verplaatsen; custom pointy-top hexagon mode-iconen (weight matcht Lucide); **hexagon per-pagina opt-in** (`DashboardBackdrop`, wash uit `dashboard/layout.tsx` — §5-herstel, Library-uitzondering); mobiele nav → Sheets (app avatar rechts-slide, marketing full-screen). Job-state uit de tab-monolieten = POST-LAUNCH |
| [078-library-storage-limit-credit-sink.md](decisions/078-library-storage-limit-credit-sink.md) | **Opslaglimiet echt + ruimte-bijkopen (credit-sink)**. Basis **100 MiB/gebruiker** in `user_credits.library_bytes_cap` (+ `library_bytes_bonus` voor gekochte ruimte; effectieve limiet = cap+bonus, per-user uit de DB). **Handhaving vóór `reserve_credits`** (`library_storage_is_full` + backend-check op AI/upload/playlist → 413 `storage_full`, geen credits kwijt; LESSONS 2026-07-22). Grandfather-safe: alleen nieuwe transcripten geblokkeerd. Bijkopen: **100 credits = +100 MiB permanent** (1 cr/MB) via `purchase_library_space` (service-role-only, server-action). Geen financiële route: reservering/settlement onaangeroerd, `product_type` NULL. Prod-getest (migratie `20260723140000`, 105→106) |
| [077-indexation-foundation.md](decisions/077-indexation-foundation.md) | **Indexatie-fundament** (nachtrun 2026-07-23): self-referencing canonical op elke publieke pagina (`metadataBase` apex, per-pagina `alternates.canonical` uit de sitemap-routeset; client-pagina's via mini-layout). robots.txt met **bewust crawlerbeleid** — AI-fetch/search toegestaan (OAI-SearchBot/ChatGPT-User/Claude-SearchBot [was fout gespeld]/Claude-User/PerplexityBot/Perplexity-User), AI-training toegestaan-bij-keuze (GPTBot/ClaudeBot/anthropic-ai/Google-Extended/CCBot [omgezet van Disallow]), Meta-ExternalAgent geblokkeerd. **Artikelbanner** als SVG-component (honeycomb + titel, geen logo), per-categorie-accent uit tokens. Dode `/docs/component-preview` weg; 49 sitemap-routes live 200 zonder hops |
| [076-no-playlist-precheck.md](decisions/076-no-playlist-precheck.md) | Geen per-video pre-check voor playlists. Het "Check Availability"-scherm controleerde niets (zette alles op `has_captions`/0); hernoemd naar wat het is — een keuze-/kostenscherm ("Review extraction" / "Before you start"). Rode Unavailable-teller nu gevuld met het echte getal uit de playlist-fetch. Dode route `check-playlist-availability` (÷8-schatting, geen aanroeper) verwijderd uit beide apps. **Reden:** een pre-check kost een tweede ronde proxyverkeer en biedt geen geldbescherming die skip-plus-refund niet al geeft (video zonder captions → overgeslagen + reservering teruggeboekt, nooit stille AI-fallback). Reservering/afrekening/teruggave onaangeroerd |
| [075-docs-diataxis-structure.md](decisions/075-docs-diataxis-structure.md) | Docs → **Diátaxis**: ingedeeld naar wat de lezer komt doen (Getting started/leren · Guides/doen · Reference/opzoeken · Account). URL's weerspiegelen de categorie (git mv: quickstart, guides/*, reference/*, how-indxr-works als één pagina); 2 nieuwe guides (single-video, uploads); export-formats-hub herschreven. **Redirects teruggebracht tot 2 regels** (pre-launch, geen externe links) — alle eigen-herstructurering-redirects weg. Schrijfstijl per categorie in writing-standard §C11b (toegankelijke opening; guides = stappen, reference = velden). 6 pagina's geschreven uit code |
| [074-docs-structure-4-categories.md](decisions/074-docs-structure-4-categories.md) | Docs-structuur → vier categorieën in gebruiksvolgorde (Start here / Using INDXR / Exports / Account); nieuw: Playlists/Your library/Settings (skeletons); `credits-and-billing` gesplitst → Credits + Billing; `data-handling` verwijderd → 308 `/privacy` + FAQ-vraag; RAG-chunkpresets 30/60/90/120s op JSON-pagina (uit code, niet 30/60/120); `/docs`-hub header-offset-fix + per-pagina one-liners; `/articles` per-artikel one-liner; URL's stabiel (categorie ≠ URL-prefix), 2 nieuwe 308's zonder ketens; writing-standard §C uitgebreid; principles §6 + INDXR-SITEMAP + sitemap-audit gearchiveerd |
| [073-docs-shell-scaffold-and-help-removal.md](decisions/073-docs-shell-scaffold-and-help-removal.md) | Docs-shell scaffold af: Help-sectie weg (how-to/troubleshooting → 308 /articles), FAQ → top-level `/docs/faq`, 2 dakloze FAQ-antwoorden verhuisd, redirect-ketens → één hop; nieuwe componenten SourcesBlock/DocsFigure/DocsCallout(3 varianten)/DocsTable/DocsCodeBlock; docs↔artikel-dichtheidsconventie; reference-doc-template bijgewerkt |
| [072-docs-how-indxr-works-restructure.md](decisions/072-docs-how-indxr-works-restructure.md) | Docs `how-indxr-works` 15→11 pagina's (credits/api/languages/2×accuracy-subs weg of samengevoegd, nieuwe `summaries`, `accuracy`="Accuracy and languages"), 301's; Overview-content geplaatst (AnchorHeading + getallen uit `pricing.ts`); DocsShell-header-fix (fixed-header-offset + dubbele breadcrumb weg) + `/articles`-nav |
| [071-limits-instrumentation-and-model-chain.md](decisions/071-limits-instrumentation-and-model-chain.md) | Limieten + instrumentatie: caption-latency (`usage_logs.duration_ms`), AI-transcriptie-duur-cap 10u (vóór reservering), playlist-cap 500/job op de extract-route + waarschuwing ≥50, expliciete channel-URL-detectie, model-chain → `["universal-3-5-pro","universal-2"]` (3-pro onbereikbaar). JRE-run-meting als drempel-basis |
| [070-per-model-stt-cor.md](decisions/070-per-model-stt-cor.md) | Per-model AssemblyAI STT-COR (U2 $0,15/u, U3/U3.5 Pro $0,21/u, geen EU-premie), COR per effectief `assemblyai_model` via helper `assemblyai_stt_eur_per_min()` in `_geld_scope` (nooit scope-gemiddeld); model-chain `universal-3-5-pro`→`3-pro`→`2` (taal-router; 3.5 Pro dekt Arabisch native, geverifieerd); NULL-legacy → fallback $0,21 |
| [065-entered-opex-model-and-cor-doublecount-guard.md](decisions/065-entered-opex-model-and-cor-doublecount-guard.md) | Entered-OPEX-model dekkend: `recurrence='yearly'` toegevoegd (anniversary-based, auto-herhaalt; default `spread='evenly'` = uitsmeren over de 12-maands looptijd = matching). Dekt nu maandelijks/eenmalig/jaarlijks/custom-periode (bewezen ≥2 periodes). Gemeten diensten (Decodo/AssemblyAI/DeepSeek/R2) horen NIET als volle OPEX-regel — dubbeltelling met COR; `AddExpense` waarschuwt. Decodo-meting is een **ondergrens** (6/188 jobs dragen bytes, 27 error-jobs 0, non-job-verkeer ongemeten). `transcripts.ai_summary_usage` verwijderd (log is sinds ADR-064 de bron; niets las de kolom) |

---

## Page structures (`architecture/page-structures/`)

Structuur, componenten en beslissingen per page-type. Bron van waarheid voor wat er op elke pagina staat.

→ [README.md](architecture/page-structures/README.md) — index van alle page-structure docs

| Bestand | Onderwerp |
|---------|-----------|
| [homepage.md](architecture/page-structures/homepage.md) | `/` — sectie-volgorde, componentenlijst, beslissingen (Batch 1) |
| [free-tool.md](architecture/page-structures/free-tool.md) | `/transcribe` — tool + friction-states, componentenlijst, beslissingen (Batch 1; anatomie ADR-079) |
| [dashboard-transcribe.md](architecture/page-structures/dashboard-transcribe.md) | `/dashboard/transcribe` — app-variant van de Transcribe-tool (gedeelde `TranscribeWorkbench`, ADR-079) |
| [pricing.md](architecture/page-structures/pricing.md) | `/pricing` — tier-structuur, credit-cost tabel, AggregateOffer schema (Batch 1) |
| [docs-hub.md](architecture/page-structures/docs-hub.md) | `/docs` hub |
| [reference-doc.md](architecture/page-structures/reference-doc.md) | reference doc template |
| [tutorial-doc.md](architecture/page-structures/tutorial-doc.md) | tutorial doc template |

---

## Architectuur (`architecture/`)

| Bestand | Onderwerp |
|---------|-----------|
| [pricing-source-of-truth.md](architecture/pricing-source-of-truth.md) | **`src/lib/pricing.ts` is de enige bron voor PACKAGES, CREDIT_COSTS, FREE_TIER** |
| [sitemap.md](architecture/sitemap.md) | **Bron van waarheid — routestructuur/redirects/nav.** Bijgewerkt voor ADR-072/073/074 (2026-07-22). Canonieke redirect-bron = `apps/marketing/next.config.ts`. Zie [writing-standard §E](content/writing-standard.md) voor de rolverdeling van de vier sitemap-docs. |
| [sitemap-audit-2026-05.md](architecture/sitemap-audit-2026-05.md) | *Archiveerbaar* — point-in-time audit (mei-2026), historisch. Zie [writing-standard §E](content/writing-standard.md). |
| [overview.md](architecture/overview.md) | High-level architectuur met request flows en tech stack |
| [credit-system.md](architecture/credit-system.md) | Volledige credit flow: koop → deductie → refund |
| [finance-map.md](architecture/finance-map.md) | **De kaart voor een redesign:** elk UI-getal → functie die het berekent → tabellen/kolommen → tarief uit `cost_config` → ADR. Eén tabel; wat raak je als je een regel verplaatst. Wijst door naar provenance (waarom) en nightly-jobs (crons) |
| [finance-number-provenance.md](architecture/finance-number-provenance.md) | **Herkomst van ELK Finance-tab-getal**: formule/bron/driver/tijdstoewijzing/scope/aannames per getal, tegen de live functiecode. Markeert geschat vs gemeten, onzichtbare drivers, en pooling-klasse-risico's (o.a. open: COR-splitsing op scope-gemiddelde share). Incl. status BTW (checkout mist automatic_tax) + AI-summary-COR (op transcripts.created_at i.p.v. run-moment) |
| [finance-audit.md](architecture/finance-audit.md) | **Klopt het antwoord?** Per Finance-tab-getal: letterlijke formule + live waarde (internal, juli-2026 + all-time) + verdict JA/NEE/WEET-NIET mét rekensom. Tally 25 JA / 4 NEE / 2 weet-niet. NEE: est_cost_to_deliver + est_future_gross (basis breekt bij 0-verbruik), COR rag (kost hard 0), Radar screen-count (scope-lek: telt interne sales in externe scope). Bevestigt hero-delta = gelijk-elapsed (F11 stale voor month-to-date) en vat_owed via reconcile-veld invoice_tax (niet Stripe amount_tax) met 1-ct per-sale-afronding |
| [ai-pipeline.md](architecture/ai-pipeline.md) | YouTube → captions → AssemblyAI → AI-summary (Gemini 2.5 Flash via EU LLM Gateway, ADR-068); model info |
| [playlist-engine.md](architecture/playlist-engine.md) | Async job systeem voor playlist extractie |
| [auth-and-security.md](architecture/auth-and-security.md) | Auth, RLS, rate limiting, account suspension |
| [database-schema.md](architecture/database-schema.md) | Alle tabellen, kolommen, RPC functies, migrations |

---

## Business (`business/`)

| Bestand | Onderwerp |
|---------|-----------|
| [privacy-facts.md](business/privacy-facts.md) | **Geverifieerde privacy-feiten vóór het beleid** (etappe B): PostHog niet-cookieless + US-host, account-delete cascade-matrix, wat na delete achterblijft (usage_logs `ip_address`, payment_attempts). Read-only diagnose tegen live code + `pg_constraint`. |
| [content-sitemap.md](business/content-sitemap.md) | **Bron van waarheid — content-map** (marketing + app): per pagina doel/claims/status, docs↔artikel-rolverdeling, groei-regel, single-source-regel. Actief onderhouden (ADR-072/073). |
| [INDXR-SITEMAP.md](business/INDXR-SITEMAP.md) | *Masterplan 2026-04-15.* Routes **vervangen** (2026-05-03, zie architecture/sitemap.md); **SEO-/content-strategie vervangen** door [content/writing-standard.md](content/writing-standard.md) (2026-07-23). Archiveerbaar — bewaard voor historische context. |
| [pricing.md](business/pricing.md) | 5-tier model, credit formule, marges, marketing copy |
| [unit-economics.md](business/unit-economics.md) | Geverifieerde kostenbasis: AssemblyAI + Decodo per credit, vaste infra, prijs-rationale |
| [positioning.md](business/positioning.md) | Marktpositie, doelgroep, onderscheid t.o.v. concurrenten |
| [marketing.md](business/marketing.md) | SEO-strategie, conversie funnel, channel FAQ, copy anchors, **betaalde-zoekcampagne-richtlijnen** |
| [keyword-demand-2026-08.md](business/keyword-demand-2026-08.md) | **Keyword-vraag-meting (Bing WMT, 2026-08-02):** leesregel (impressie ≠ zoekvolume), geo-blocklist-overlap (44% niet-converteerbaar), merkenmarkt, gratis-kop, niet-Engelse vraag, video-to-text, negatieven; correctie Bing≠ChatGPT-index |

---

## Content (`content/`)

| Bestand | Onderwerp |
|---------|-----------|
| [product-truth.md](content/product-truth.md) | **Code-geverifieerde bron van waarheid voor de content-herschrijf**: pricing, creditmodel + reserve-model, live features, export-formaten, storage-cap, en de volledige modelnaam-inventaris (live vs stale in content). Elk feit met `bestand:regel`. |
| [docs-page-contract.md](content/docs-page-contract.md) | **Paginacontract voor /docs** vóór de schrijfronde: huidige routes (live/placeholder), per-pagina houden/samenvoegen/schrappen-oordeel, en per overgebleven pagina het contract (BEZIT / HERHAALT-NIET / LINKT / BRON / FIGUUR-SLOTS / SCHEMA / BRONMATERIAAL, SPEC vs ARGUMENT). Plus template- en llms.txt-gaten. |
| [content-rewrite-map.md](content/content-rewrite-map.md) | **Kickoff voor de content-herschrijf** — bindt product-truth/writing-standard/content-sitemap samen, wijst waar de inline-copy leeft (landing `page.tsx`, pricing `faqItems`), en inventariseert de placeholder/asset-gaten (RemotionLoop/MacbookMockup/docs-figures/onboarding/testimonials). Kwaliteit-pass, geen feiten-fix. |
| [writing-standard.md](content/writing-standard.md) | **DE bron voor het schrijven van content** — één standaard i.p.v. vier tegensprekende docs. Conflictenregister (FAQ/schema/dichtheid/callouts/llms.txt/docs-structuur), implementatie-audit (LIVE/HALF/NEVER van de SEO-elementen), de schrijfregels (opening/koppen/FAQ/schema/interne-links/bronnen/figuren/callouts/dichtheid/toon), een `[TE VERIFIËREN]`-lijst voor externe toetsing, en het wiki-opschoonvoorstel. Vervangt de SEO-strategie in INDXR-SITEMAP.md. |

---

## Operationeel (`operations/`)

| Bestand | Onderwerp |
|---------|-----------|
| [deployment.md](operations/deployment.md) | Vercel + Railway + alle env vars uitgelegd |
| [monitoring.md](operations/monitoring.md) | PostHog events, logging levels, alerts |
| [known-issues.md](operations/known-issues.md) | Openstaande TODOs, bekende bugs, workarounds, pre-launch checklist |
| [railway-cli.md](operations/railway-cli.md) | Railway CLI setup + log-recepten voor worker/api (CC-gebruik) |
| [test-reports.md](operations/test-reports.md) | Handmatige testrapporten per feature |
| [cross-host-smoke-tests.md](operations/cross-host-smoke-tests.md) | 13 smoke tests post-migratie (8 geautomatiseerd via Playwright) |
| [testing.md](operations/testing.md) | Testaccounts (admin-side aanmaken, `@indxr-test.com`), Playwright draaien (cookie-login), herbruikbare prod-check |
| [migration-summary.md](operations/migration-summary.md) | 5-minuten overzicht: huidige staat, wat gedaan, wat resteert |

---

## Testing (`testing/`)

Durende end-to-end **live-verificaties** met nagerekende data (onderscheiden van de per-feature smoke-/handmatige rapporten in `operations/`).

| Bestand | Onderwerp |
|---------|-----------|
| [2026-07-09-credit-playlist-e2e-live-verification.md](testing/2026-07-09-credit-playlist-e2e-live-verification.md) | Credit/playlist-spoor e2e live-geverifieerd met nagerekende ledger (ADR-050/051) — Σreserved=Σsettled+Σrefunded, Policy-S, transition-aware teller, classificatie |

---

## Roadmap (`roadmap/`)

| Bestand | Onderwerp |
|---------|-----------|
| [priorities.md](roadmap/priorities.md) | Gestructureerde prioriteitenlijst: BLOCKERS / PRE-LAUNCH / POST-LAUNCH |
| [admin-kpi-audit.md](roadmap/admin-kpi-audit.md) | **Grote audit (2026-07-24):** admin Finance/Growth/Operations-staat + launch-readiness + KPI-capture-matrix (✅ surfaced / 🟡 captured-niet-surfaced / 🔴 niet-captured). Kernpunt: capture-gaten = permanent verlies → dicht vóór launch (chargeback/refund-handler, daily-active snapshot, `has_ever_purchased`). |
| [backlog.md](roadmap/backlog.md) | Post-launch features, marketing, stabiliteit, gamification |

---

## Strategie (`strategy/`)

| Bestand | Onderwerp |
|---------|-----------|
| [principles.md](strategy/principles.md) | Strategische principes achter site-architectuur en content-strategie — het "waarom" |

---

## Design (`design/`)

| Bestand | Onderwerp |
|---------|-----------|
| [library-source-map.md](design/library-source-map.md) | **De kaart voor het Library-herontwerp** (zoals finance-map.md voor Finance): render-boom (wat lokaal vs shared/marketing-impact), de letterlijke Supabase-query + volledige kolominventaris per transcript-rij (incl. niet-geselecteerde velden), verbatim toolbar/rij/sidebar/mobiel, state & persistentie (wat een refresh overleeft), en bewijs-antwoorden: full-text zoeken = query-taak (tekst leeft in Postgres `transcript` jsonb, geen R2, geen tsvector-index), `language`-kolom bestaat maar 19% dekking, thumbnail-mobiel-regel. Getoetst tegen live DB + system.md §Library Patterns |
| [audit-frontend.md](design/audit-frontend.md) | Volledige frontend-inventarisatie: sitemap (47 routes), layouts, componenten, styling, dark mode, responsive, iconografie, forms, inconsistenties, vragen voor redesign |
| [principles-v0.1-final.md](design/principles-v0.1-final.md) | Ihsan design principles V0.1 — Honest Materiality, Coherence, Geen Israf, Zuhd |
| [system.md](design/system.md) | Design system V1.0 — OKLCH kleurenschaal, typografie, spacing, radii, shadows, motion tokens |
| [hero-images.md](design/hero-images.md) | Homepage-hero (penthouse/woestijnstad, licht+donker): bronketen (Leonardo Lucid Origin Ultra 3840×2176 → Nano Banana Pro → 5504×3072), crop-box (52,0,5452,2917), ratio 1392/752, nacht-grade (zwartpunt 9, gamma 1.70, randvignette); AVIF/WebP/JPEG-set (1392/2088/2784) + `<picture>`-implementatie met fetchpriority. Mobiele 4:5-crop-box (1465,0,3799,2917) |
| [editorial-images.md](design/editorial-images.md) | Artikel/docs-presentatiesysteem: gedeelde `PageHeader`/`SectionLabel`/`ContentCard`; 3-koloms kaartgrid (1/2/3 per breakpoint, max-w-5xl); artikelen = foto (kaart 16:9, hero 21:9-band), docs = seeded hexagon-tegel (`HexField`); Library-`HexagonPattern` als achtergrondtextuur; categorieën zonder eigen kleur (alles `--accent`); Formats/AI & RAG hernoemd (labels, niet slugs); Leonardo Lucid Realism recept + exportmatrix 400/800/1440 + og 1200×630, bestandsnaam = slug. **Ook op /pricing + /dashboard/billing**: gedeelde `PageHeader`/`SectionLabel` (packages/shared), Library-textuur, kaart-hover; muntillustraties = bewuste stijl; /pricing directe knoppen vs /billing selecteren-dan-kopen met ToS boven de knop |
| [tokens.css](../../../src/app/styles/tokens.css) | Design token single source of truth — OKLCH color tokens, IBM Plex fonts, radii, shadows, motion |

---

## Recente structurele wijzigingen

| Datum | Wijziging |
|-------|-----------|
| 2026-05-03 | Werksessie B: drie-lagen architectuur geïmplementeerd — 5 comparison pages verwijderd, /youtube-transcript-generator → /transcribe, /support → /contact, 18 SEO-articles → /articles/*, /blog/* verwijderd, legal pages (about/privacy/terms) en 17 /docs/* scaffold-pages aangemaakt, DocsShell ontkoppeld van templates, Footer herschreven, sitemap.ts volledig herschreven (23 redirects) |
| 2026-05-03 | Werksessie A: drie-lagen architectuur vastgesteld, cleanup (test-tokens, redirect-ghosts, console.logs), metadataBase, llms.txt gesynchroniseerd, sitemap.ts gefixed, sitemap.md herschreven, strategy wiki aangemaakt |
| 2026-05-03 | Sitemap audit voltooid voor strategische research fase — [sitemap-audit-2026-05.md](architecture/sitemap-audit-2026-05.md) |
| 2026-04-30 | Sitemap-refactor (Grondverf Sessie 2): `/faq` → `/docs/faq` (301), `/how-it-works` → `/` (301), `/account/credits` → `/dashboard/account` (301), label "Overview" → "Home", header versimpeld (Pricing + Docs + Try it free), Messages route toegevoegd (`/dashboard/messages`), DocsShell geïntroduceerd, MobileTabBar toegevoegd, `src/lib/docs-config.ts` als sidebar-config |

---

## Auto-update protocol

Na elke taak update ik:
- Relevante `decisions/` pagina als een technische keuze wijzigt
- `known-issues.md` als TODOs opgelost of toegevoegd worden
- `database-schema.md` bij nieuwe migrations
- `operations/deployment.md` bij nieuwe env vars
- `roadmap/backlog.md` bij nieuwe post-launch ideeën of afgeronde items
- `INDEX.md` bij elke nieuwe pagina

---

## Wiki-onderhoud: broncode is de waarheid

**Broncode + productie-DB zijn de single source of truth. Wiki is een afgeleide.**

Bij discrepantie tussen wiki en code: code wint, wiki wordt bijgewerkt.

### Verplichte checks bij wiki-onderhoud

- **RPC-signatures:** verifieer tegen `pg_proc` in Supabase (`pg_get_function_arguments(p.oid)`) — niet tegen een eerdere wiki-versie.
- **Tabel-kolommen:** verifieer tegen `information_schema.columns` of productie-migraties — niet aannemen dat de wiki klopt.
- **Status-waarden:** verifieer tegen de migratie-SQL die de status zet (bijv. `status='complete'` niet `'completed'`).
- **Functienamen in backend:** verifieer dat gerefereerde functies nog bestaan (`grep -n "def <naam>"` in de betreffende .py).

### Verplichte wiki-update bij code-wijziging

Wijzigingen aan de volgende onderdelen vereisen een wiki-update **in dezelfde commit** als de code-wijziging:

| Code-wijziging | Wiki-document |
|---|---|
| Nieuwe/gewijzigde RPC | `architecture/database-schema.md` + relevant ADR |
| Nieuw tabel-kolom (migratie) | `architecture/database-schema.md` |
| Gewijzigde credit-flow | `architecture/credit-system.md` |
| Gewijzigde playlist-flow | `architecture/playlist-engine.md` |
| Nieuwe ARQ-taak of WorkerSettings | `decisions/019-arq-job-queue.md` |
| Nieuw poll-endpoint of stale-detectie | `architecture/playlist-engine.md` + `database-schema.md` |

### Bekende valkuilen (geleerd in Fase 4, april 2026)

- `idempotency_keys` tabel is beschreven in ADR-019 maar **nooit aangemaakt** in productie.
- `run_playlist_job` bestaat niet meer (verwijderd in Fase 3b.2, 2026-04-28).
- `ack_late` bestaat niet in arq 0.28.0 — referenties ernaar als toekomstige feature zijn misleidend.
- Playlist-status is `'complete'` (niet `'completed'`) — gefixd in migratie `20260428_playlist_progress_rpc_status_fix.sql`.
- `playlist_extraction_jobs.completed` is de kolomnaam (niet `completed_count`).
