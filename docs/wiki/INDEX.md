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

---

## Page structures (`architecture/page-structures/`)

Structuur, componenten en beslissingen per page-type. Bron van waarheid voor wat er op elke pagina staat.

→ [README.md](architecture/page-structures/README.md) — index van alle page-structure docs

| Bestand | Onderwerp |
|---------|-----------|
| [homepage.md](architecture/page-structures/homepage.md) | `/` — sectie-volgorde, componentenlijst, beslissingen (Batch 1) |
| [free-tool.md](architecture/page-structures/free-tool.md) | `/transcribe` — tool + friction-states, componentenlijst, beslissingen (Batch 1) |
| [pricing.md](architecture/page-structures/pricing.md) | `/pricing` — tier-structuur, credit-cost tabel, AggregateOffer schema (Batch 1) |
| [docs-hub.md](architecture/page-structures/docs-hub.md) | `/docs` hub |
| [reference-doc.md](architecture/page-structures/reference-doc.md) | reference doc template |
| [tutorial-doc.md](architecture/page-structures/tutorial-doc.md) | tutorial doc template |

---

## Architectuur (`architecture/`)

| Bestand | Onderwerp |
|---------|-----------|
| [pricing-source-of-truth.md](architecture/pricing-source-of-truth.md) | **`src/lib/pricing.ts` is de enige bron voor PACKAGES, CREDIT_COSTS, FREE_TIER** |
| [sitemap.md](architecture/sitemap.md) | **Routestructuur, navigatie, redirects — post-refactor bron van waarheid** |
| [sitemap-audit-2026-05.md](architecture/sitemap-audit-2026-05.md) | Volledige sitemap audit (2026-05): routes, componenten, metadata, inconsistenties — input voor research/design/implementatie |
| [overview.md](architecture/overview.md) | High-level architectuur met request flows en tech stack |
| [credit-system.md](architecture/credit-system.md) | Volledige credit flow: koop → deductie → refund |
| [ai-pipeline.md](architecture/ai-pipeline.md) | YouTube → captions → AssemblyAI → DeepSeek; model info |
| [playlist-engine.md](architecture/playlist-engine.md) | Async job systeem voor playlist extractie |
| [auth-and-security.md](architecture/auth-and-security.md) | Auth, RLS, rate limiting, account suspension |
| [database-schema.md](architecture/database-schema.md) | Alle tabellen, kolommen, RPC functies, migrations |

---

## Business (`business/`)

| Bestand | Onderwerp |
|---------|-----------|
| [pricing.md](business/pricing.md) | 5-tier model, credit formule, marges, marketing copy |
| [unit-economics.md](business/unit-economics.md) | Geverifieerde kostenbasis: AssemblyAI + Decodo per credit, vaste infra, prijs-rationale |
| [positioning.md](business/positioning.md) | Marktpositie, doelgroep, onderscheid t.o.v. concurrenten |
| [marketing.md](business/marketing.md) | SEO-strategie, conversie funnel, channel FAQ, copy anchors |

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
| [audit-frontend.md](design/audit-frontend.md) | Volledige frontend-inventarisatie: sitemap (47 routes), layouts, componenten, styling, dark mode, responsive, iconografie, forms, inconsistenties, vragen voor redesign |
| [principles-v0.1-final.md](design/principles-v0.1-final.md) | Ihsan design principles V0.1 — Honest Materiality, Coherence, Geen Israf, Zuhd |
| [system.md](design/system.md) | Design system V1.0 — OKLCH kleurenschaal, typografie, spacing, radii, shadows, motion tokens |
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
