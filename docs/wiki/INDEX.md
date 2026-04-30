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
→ [Pricing](business/pricing.md) → [Positionering](business/positioning.md) → [012 Pricing Tiers](decisions/012-pricing-tiers.md)

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

---

## Architectuur (`architecture/`)

| Bestand | Onderwerp |
|---------|-----------|
| [sitemap.md](architecture/sitemap.md) | **Routestructuur, navigatie, redirects — post-refactor bron van waarheid** |
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
| [positioning.md](business/positioning.md) | Marktpositie, doelgroep, onderscheid t.o.v. concurrenten |
| [marketing.md](business/marketing.md) | SEO-strategie, conversie funnel, channel FAQ, copy anchors |

---

## Operationeel (`operations/`)

| Bestand | Onderwerp |
|---------|-----------|
| [deployment.md](operations/deployment.md) | Vercel + Railway + alle env vars uitgelegd |
| [monitoring.md](operations/monitoring.md) | PostHog events, logging levels, alerts |
| [known-issues.md](operations/known-issues.md) | Openstaande TODOs, bekende bugs, workarounds, pre-launch checklist |
| [test-reports.md](operations/test-reports.md) | Handmatige testrapporten per feature |

---

## Roadmap (`roadmap/`)

| Bestand | Onderwerp |
|---------|-----------|
| [priorities.md](roadmap/priorities.md) | Gestructureerde prioriteitenlijst: BLOCKERS / PRE-LAUNCH / POST-LAUNCH |
| [backlog.md](roadmap/backlog.md) | Post-launch features, marketing, stabiliteit, gamification |

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
