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

---

## Architectuur (`architecture/`)

| Bestand | Onderwerp |
|---------|-----------|
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

---

## Roadmap (`roadmap/`)

| Bestand | Onderwerp |
|---------|-----------|
| [priorities.md](roadmap/priorities.md) | Gestructureerde prioriteitenlijst: BLOCKERS / PRE-LAUNCH / POST-LAUNCH |
| [backlog.md](roadmap/backlog.md) | Post-launch features, marketing, stabiliteit, gamification |

---

## Auto-update protocol

Na elke taak update ik:
- Relevante `decisions/` pagina als een technische keuze wijzigt
- `known-issues.md` als TODOs opgelost of toegevoegd worden
- `database-schema.md` bij nieuwe migrations
- `operations/deployment.md` bij nieuwe env vars
- `roadmap/backlog.md` bij nieuwe post-launch ideeën of afgeronde items
- `INDEX.md` bij elke nieuwe pagina
