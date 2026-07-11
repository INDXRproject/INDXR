# Deployment

## Architectuur overzicht

```
indxr.ai (Vercel — @indxr/marketing)    ←─── Marketing, auth, free tool
app.indxr.ai (Vercel — @indxr/app)      ←─── Dashboard, admin
    │ PYTHON_BACKEND_URL
    ▼
Railway (Docker)                         ←─── FastAPI Python backend
    │ SUPABASE_URL
    ▼
Supabase                                 ←─── PostgreSQL + Auth

Upstash Redis               ←─── Rate limiting + caption-cache (REST/HTTPS)
Railway Redis               ←─── ARQ job queue (TCP, private netwerk)
Stripe                      ←─── Payments
PostHog                     ←─── Analytics
```

**Monorepo structuur (pnpm workspaces):**
```
apps/marketing/   → @indxr/marketing  → indxr.ai
apps/app/         → @indxr/app        → app.indxr.ai
packages/shared/  → @indxr/shared     → gedeelde UI, auth, utils
backend/          → FastAPI           → Railway
```

---

## Domain configuration

| Domain | Project | Type |
|---|---|---|
| `indxr.ai` | `indxr-marketing` | Canonical (apex) |
| `www.indxr.ai` | `indxr-marketing` | 301 redirect → indxr.ai |
| `app.indxr.ai` | `indxr-app` | Production |
| `indxr.vercel.app` | `indxr` (oud) | Te verwijderen B7 |

**Canonical domain rationale:** apex (indxr.ai) gekozen boven www voor branding (modern SaaS standaard, kortere URL — Stripe, Linear, Anthropic gebruiken ook apex). 301 permanent redirect van www → apex enforced, single canonical voor SEO.

**A-record (apex):** 216.150.1.1 (Vercel plan-specifieke aanbeveling, geüpdatet 2026-05-06).

---

## Stripe webhook

| Veld | Waarde |
|---|---|
| URL | `https://app.indxr.ai/api/stripe/webhook` |
| API version | 2025-12-15.clover |
| Events | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` |
| Secret | `STRIPE_WEBHOOK_SECRET` in Vercel `indxr-app` (sensitive flag) |
| Beheer | Stripe Dashboard → Workbench → Webhooks |

---

## Frontend (Vercel) — twee projecten

Twee aparte Vercel-projecten (INDXR TEAM, Pro tier), allebei op dezelfde GitHub repo (`master`-branch). **Status: aangemaakt en operationeel (2026-05-06).**

| Project | Root directory | Env vars | Domein |
|---------|---------------|----------|--------|
| `indxr-marketing` | `apps/marketing` | 15 | `indxr.ai` ✓ |
| `indxr-app` | `apps/app` | 18 (incl. Stripe live) | `app.indxr.ai` ✓ |

**Oud project:** `indxr` (enkelvoudig, pre-monorepo) is gedisconnect van GitHub. Te verwijderen in B7 nadat custom domains overgezet zijn.

**Auto-deploy:** Push naar `master` → beide Vercel-projecten deployen automatisch.

### Vercel project instellingen

Beide projecten worden geconfigureerd via `vercel.json` in de app-root — geen custom build/install commands in Vercel UI nodig.

| Instelling | indxr-marketing | indxr-app |
|---|---|---|
| Root Directory | `apps/marketing` | `apps/app` |
| Framework Preset | Next.js (auto-detect) | Next.js (auto-detect) |
| Build Command | *via vercel.json* | *via vercel.json* |
| Install Command | *via vercel.json* | *via vercel.json* |

**⚠️ Env vars plakken in Vercel UI:** gebruik altijd de rauwe waarde ZONDER quotes. `.env` files gebruiken `KEY="value"` syntax — die quotes worden in Vercel UI letterlijk deel van de string en breken de runtime. Verwijder quotes bij kopiëren uit `.env.local`.

**vercel.json per app** (versioned in code, zero-config):
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

Vercel detecteert via `turbo.json` automatisch: build command, install command, output directory en Turborepo Remote Caching. `framework: "nextjs"` is de enige expliciete instelling om Next.js-optimalisaties te garanderen.

**Skip onnodige deploys:** Vercel heeft een ingebouwde platform-feature "Automatically skip unnecessary deployments in monorepos" die via Turborepo's dependency graph detecteert of een app geraakt is door een commit. Geen `ignoreCommand` nodig — **Khidr activeert dit in het Vercel dashboard per project** (Project Settings → Git → "Automatically cancel deployments").

**Fallback bij deploy-problemen:** zie known-issues.md → "Risk monitoring → Vercel zero-config Turborepo deployment" voor expliciete config.

### Environment Variables — @indxr/marketing (indxr.ai)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# URLs
NEXT_PUBLIC_APP_URL=https://app.indxr.ai
NEXT_PUBLIC_MARKETING_URL=https://indxr.ai

# Python Backend
PYTHON_BACKEND_URL=https://indxr-production.up.railway.app

# Backend Auth
BACKEND_API_SECRET=your-secret-key

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Feature Flags
NEXT_PUBLIC_ENABLE_OAUTH=true

# Admin
ADMIN_EMAIL=...
```

### Environment Variables — @indxr/app (app.indxr.ai)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # ⚠️ Server-only, nooit in browser

# URLs
NEXT_PUBLIC_APP_URL=https://app.indxr.ai
NEXT_PUBLIC_MARKETING_URL=https://indxr.ai

# Python Backend
PYTHON_BACKEND_URL=https://indxr-production.up.railway.app
NEXT_PUBLIC_AUDIO_UPLOAD_URL=https://indxr-production.up.railway.app  # AudioTab directe upload (bypast Vercel 4.5MB limiet)

# Backend Auth
BACKEND_API_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...             # ⚠️ Server-only
STRIPE_WEBHOOK_SECRET=whsec_...           # Webhook signature verificatie
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Admin
ADMIN_EMAIL=...
```

---

## Backend (Railway)

Railway draait **drie services in één project** (`indxr-backend`):

| Service | Start Command | Rol |
|---|---|---|
| **API** (`api`) | `uvicorn main:app --host 0.0.0.0 --port 8000` | HTTP endpoints |
| **Worker** (`worker`) | `python -m arq worker.WorkerSettings` | ARQ job verwerking |
| **Redis** (`Redis`) | — (Railway managed) | ARQ job queue (TCP) |

API en worker bouwen uit **dezelfde GitHub-repo en dezelfde `/backend` root directory** — het is één codebase met een ander start command. Railway's private networking (`redis.railway.internal`) werkt uitsluitend binnen één project; cross-project private hostnames resolven niet (root-oorzaak van de connectiefouten tijdens ADR-048 implementatie, zie ADR-048).

**Auto-deploy:** Push naar `master` → Railway rebuildt Docker image en deployt API + worker.  
**Dockerfile:** `backend/Dockerfile` (gedeeld door API en worker — de worker overschrijft de `CMD` via Railway's "Start Command" instelling)  
**Gezondheidscheck:** `GET /health` → `{"status": "healthy"}` (alleen API-service, unauthenticated, geen DB/Redis-afhankelijkheid → nooit flaky)

### Zero-downtime deploy (health-gated cutover)

**API-service:** de cutover is health-check-gated via **`backend/railway.json`** (in de repo, dus versie-gecontroleerd en survivet service-hercreatie):

```json
{ "$schema": "https://railway.com/railway.schema.json",
  "deploy": { "healthcheckPath": "/health", "healthcheckTimeout": 300 } }
```

Railway wacht met verkeer-omschakeling tot de nieuwe deployment `GET /health` = 200 teruggeeft → **geen request-gap** bij deploy. Zonder deze setting schakelt Railway zodra de container start (mogelijk vóór uvicorn requests aankan). `/health` is unauthenticated en statisch, dus de probe slaagt zodra de app luistert. **Alternatief (dashboard, als de file ooit niet gepakt wordt):** Service → Settings → Deploy → **Health Check Path** = `/health`. De file wint; verifieer bij de volgende deploy dat de deploy-logs een healthcheck-stap tonen vóór "Active".

**Worker-service:** heeft **geen** HTTP-server → geen healthcheck van toepassing. Zie de deploy-werkregel hieronder.

> **⚠️ WERKREGEL — niet deployen terwijl jobs draaien.** Een deploy naar de **worker** herstart de container en **doodt elke lopende job** (transcriptie/playlist) — er is geen graceful drain. Herstel is niet gegarandeerd instant: de watchdog re-enqueuet `interrupted`/stuck jobs pas bij de volgende cron-pass (elke 2 min; ADR-049/051). Regel: **push niet naar `master` terwijl er actieve jobs lopen** (check `ActiveJobsIndicator` / `transcription_jobs`+`playlist_extraction_jobs` op niet-terminale status). Pre-launch is dit laag-risico (weinig verkeer); post-launch is graceful worker-drain een benoemde roadmap-taak — zie [priorities.md](../roadmap/priorities.md).

**Vercel (frontend):** al **atomic/zero-downtime** by design — elke build is een immutable deployment; de productie-alias switcht instant naar de nieuwe build zodra die klaar is (geen gedeelde mutable state, geen gap). Geen extra config nodig.

### Docker Build

```dockerfile
FROM python:3.12-slim
# Node.js v22 via NodeSource (yt-dlp 2026.06.09 vereist v22+; Debian Bookworm apt levert slechts v18)
RUN apt-get install: ffmpeg, wget, curl, nodejs (v22 via NodeSource)
# pip install -r requirements.txt
CMD: uvicorn main:app --host 0.0.0.0 --port 8000
# Worker-service overschrijft CMD via Railway "Start Command" instelling:
# python -m arq worker.WorkerSettings
```

> **Node.js versie-koppeling:** yt-dlp definieert een minimale Node.js-versie. Bij elke yt-dlp major-upgrade: verifieer of de Node.js-versie in de Dockerfile nog voldoet. De NodeSource-URL (`setup_22.x`) moet meegenomen worden als de minimumeis stijgt. Langetermijnsalternatief (geen externe Node.js): zie roadmap taak 2.8 en `monitoring.md` sectie "Dependency-onderhoud".

**Python packages updaten:**
```bash
cd backend
venv/bin/pip install <package>
venv/bin/pip freeze > requirements.txt
git add requirements.txt && git commit -m "update: add <package>"
# git push master → Railway rebuild (beide services)
```

### Worker-service aanmaken (eenmalig)

1. Railway Dashboard → project → **New Service** → GitHub Repo → dezelfde repo
2. **Root Directory:** `backend`
3. **Start Command:** `python -m arq worker.WorkerSettings`
4. Kopieer alle env vars van API-service + voeg toe: `ARQ_REDIS_URL` (Railway-internal TCP URL, zie onder)

> **Gotcha: aanhalingstekens in Railway env-var waarde.** Plak de waarde als pure string, zonder aanhalingstekens — `redis://default:TOKEN@redis.railway.internal:6379`, **niet** `'redis://...'`. Aanhalingstekens worden letterlijk meegenomen en resulteren in een `invalid DSN scheme` RuntimeError bij ARQ startup.

### Environment Variables (Railway — beide services)

De volgende env vars moeten op **zowel de API-service als de worker-service** staan. Bij introductie van een nieuwe backend env var: bepaal altijd of de worker hem ook nodig heeft en voeg hem op beide services toe.

```bash
# Supabase (Service Role — bypass RLS voor RPC calls)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Transcriptie
ASSEMBLYAI_API_KEY=...

# Proxy (Decodo residentieel)
PROXY_ENABLED=true
PROXY_HOST=gate.decodo.com
PROXY_PORT=10001
PROXY_USERNAME=username
PROXY_PASSWORD=password          # ⚠️ Karakter-voor-karakter kopiëren — zie Workarounds

# Analytics + Monitoring
POSTHOG_API_KEY=phc_...
SENTRY_DSN_BACKEND=https://...@sentry.io/...

# Logging
LOG_LEVEL=INFO                   # DEBUG | INFO | WARNING | ERROR

# ARQ job queue (TCP — Railway private netwerk, zie sectie Railway Redis hieronder)
ARQ_REDIS_URL=redis://default:PASSWORD@redis.railway.internal:6379

# YouTube Data API (playlist metadata + video details)
# Nodig voor zowel API als worker: worker roept YouTubeClient.get_video_details aan
# in run_whisper_job en process_playlist_video.
YOUTUBE_API_KEY=...

# Cloudflare R2 object storage (master_transcripts cache)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...             # Access Key ID van indxr-transcripts token
R2_SECRET_ACCESS_KEY=...         # Secret Access Key van indxr-transcripts token
```

### Railway Redis (ARQ job queue)

Railway Redis draait als derde service in hetzelfde Railway-project, naast de API en de worker. De ARQ job queue gebruikt uitsluitend deze instantie — Upstash (REST/HTTPS) is structureel incompatibel met ARQ's polling-model (zie ADR-048).

**Aanmaken (eenmalig):** Railway Dashboard → project → New Service → Database → Redis

**Verbinding:** Railway private netwerk via `redis.railway.internal:6379` — geen publiek internet, geen extra egress-kosten binnen hetzelfde project.

**Verbinding werkt alleen binnen één Railway-project.** Private hostnames zoals `redis.railway.internal` zijn niet bereikbaar vanuit andere projecten — cross-project private networking bestaat niet in Railway. API, worker en Redis moeten op hetzelfde canvas zitten (zie ADR-048 voor de volledige root-cause-analyse).

**`ARQ_REDIS_URL`** moet op zowel `api` als `worker` staan. Beide services zijn producer én/of consumer van dezelfde queue — als ze naar verschillende Redis-instanties wijzen ontstaat een stille queue-mismatch.

### Environment Variables (Railway — alleen API-service)

```bash
# AI samenvatting — DeepSeek-account draait op contact@indxr.ai; key door Khidr
# als DEEPSEEK_API_KEY op Railway gezet (env-only, nergens hardcoded — bevestigd
# 2026-07-11, enige lezer is backend/main.py:1068 os.getenv).
DEEPSEEK_API_KEY=...

# Auth (gedeeld secret Next.js ↔ Python)
BACKEND_API_SECRET=your-secret-key

# Redis caption cache (REST/HTTPS — Upstash)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

> `SUPABASE_ANON_KEY` hoort **niet** op Railway — alleen op Vercel (Next.js client-side RLS). De worker gebruikt uitsluitend de service role key.

---

## Database (Supabase)

### Migrations uitvoeren

```bash
# Lokaal (via Supabase CLI)
supabase db push

# Of direct in Supabase Dashboard → SQL Editor
```

Migrations zitten in `supabase/migrations/`. Chronologische volgorde is belangrijk.

### Productie-checklist Supabase

- [x] Email verificatie re-enabled ✓
- [ ] RLS verificatie op alle 6 tabellen
- [ ] Database backups geconfigureerd
- [ ] Connection pooling gecheckt bij schaal

---

## Stripe Live Mode

Productie-checklist Stripe:
- [ ] Stripe account activeren met KVK/bedrijfsinfo
- [ ] Switch naar live mode
- [ ] **4 producten** aanmaken (type: One-off, EUR, BTW-inclusief) — zie [ADR-052](../decisions/052-pricing-restructure-4-tiers.md):
  - Test — €3,49 / 100 credits
  - Starter — €9,99 / 400 credits
  - Plus — €24,99 / 1.300 credits *(anker, meest populair)*
  - Power — €49,99 / 3.100 credits
- [ ] Stripe Tax aan (categorie `txcd_10000000`, prijzen inclusief, OSS) + Adaptive Pricing (EUR-settlement)
- [ ] Webhook endpoint registreren: `https://app.indxr.ai/api/stripe/webhook`
- [ ] `STRIPE_WEBHOOK_SECRET` (live mode) instellen in Vercel
- [ ] Live mode keys configureren in Vercel (`sk_live_*`, `pk_live_*`)
- [ ] Test met kleine aankoop (Test €3,49) ter verificatie

**⚠️ Code-sync vereist** — `PACKAGES` in `apps/app/src/app/api/stripe/checkout/route.ts` **én** `packages/shared/src/lib/pricing.ts` bevatten nog het oude 5-tier-model; vervang door de 4 tiers hierboven vóór launch.

---

## Lokale Development

### Frontend

```bash
cd "INDXR.AI V2"
pnpm install

# Marketing (indxr.ai) op port 3000:
pnpm dev:marketing

# App (app.indxr.ai) op port 3001:
pnpm dev:app
```

### Backend

```bash
cd "INDXR.AI V2/backend"
python3 -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Omgeving

Kopieer `.env.example` naar `.env.local` (frontend) en `backend/.env` (backend).

**Upstash optioneel:** Als `UPSTASH_REDIS_REST_URL` leeg is, werkt rate limiting als no-op.  
**bgutil-pot:** Verwijderd (ADR-027). yt-dlp iOS client bypasses PO tokens — geen externe binary vereist.

---

## Monitoring

Zie `monitoring.md` voor PostHog events en logging configuratie.
