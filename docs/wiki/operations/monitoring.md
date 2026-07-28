# Monitoring

## PostHog Events

INDXR.AI gebruikt PostHog voor product analytics. Events worden getracked op zowel frontend als backend.

### Frontend Events (automatisch via PostHog JS)

- Paginaweergaven (automatisch)
- Navigatie / routewijzigingen
- User identify bij login: `{email, source, created_at}`
- User reset bij logout

### Backend Events (handmatig getracked)

| Event | Trigger | Properties |
|-------|---------|------------|
| `credits_purchased` | Stripe webhook `checkout.session.completed` | `amount`, `credits_added`, `currency`, `session_id` |
| `credits_deducted` | Na succesvolle credit-aftrek | `amount`, `reason`, `balance_after` |
| `summarization_completed` | Na succesvolle DeepSeek samenvatting | `transcript_id`, `processing_time_ms` |

### PostHog Configuratie

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_API_KEY=phc_...      # Backend (Python)
```

PostHog Provider: `src/providers/PostHogProvider.tsx`  
Backend tracking: `backend/main.py:33-40` (`track_event()` functie)

**Fire-and-forget:** PostHog tracking blokkeert nooit de hoofdflow. Failures worden gelogd als warnings.

---

## Logging (Backend)

### Log Niveaus

Geconfigureerd via `LOG_LEVEL` env var in Railway (standaard: `INFO`).

```python
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("indxr-backend")
logger.setLevel(logging.INFO)  # expliciet noodzakelijk — zie waarschuwing hieronder
```

> **Waarschuwing: `basicConfig()` is een no-op onder uvicorn.** Python's `logging.basicConfig()` doet niets als de root logger al handlers heeft — en uvicorn configureert de root logger vóór applicatiecode laadt. Uvicorn zet de root logger op WARNING, waardoor `logger.info()` calls van de `indxr-backend` logger stil worden gefilterd (ze propageren naar root, maar root filtert ze weg). De `logger.setLevel(logging.INFO)` op de named logger bypast dit: het level wordt gecontroleerd op de logger zelf, vóór propagatie. Verwijder deze regel niet.

| Niveau | Gebruik |
|--------|---------|
| `DEBUG` | Gedetailleerde flow, bgutil-pot versie check |
| `INFO` | Normale operaties (credit deducties, job status) |
| `WARNING` | Niet-kritieke problemen (PostHog failure, geen credit record) |
| `ERROR` | Kritieke failures (credit deductie mislukt, DeepSeek fout) |

**In productie:** Gebruik `INFO` of `WARNING`. `DEBUG` geeft veel output.

### Wat je ziet in Railway logs

```
2026-04-13 12:00:00 - indxr-backend - INFO - Supabase client initialized
2026-04-13 12:00:01 - indxr-backend - INFO - Credit cost for 1234.56s: 3 credits
2026-04-13 12:00:01 - indxr-backend - INFO - Credits deducted: 3 from user abc123 (42 → 39)
2026-04-13 12:00:05 - indxr-backend - INFO - Summary generated and saved for transcript-xyz
```

---

## Frontend Logging

- `console.log` voor webhook events in `stripe/webhook/route.ts`
- `console.error` voor Supabase errors in `AuthContext.tsx`
- Sentry is geconfigureerd — zie sectie hieronder

---

## Sentry Error Tracking

Actief op backend (Railway) én frontend (Vercel).

### Backend

| File | Init | DSN env var |
|------|------|-------------|
| `backend/main.py` | Ja — `FastApiIntegration`, `HttpxIntegration` | `SENTRY_DSN_BACKEND` |
| `backend/worker.py` | Ja | `SENTRY_DSN_BACKEND` |

**Capture pattern:**
```python
with sentry_sdk.push_scope() as scope:
    scope.set_tag("task_name", "...")
    scope.set_tag("job_id", job_id)
sentry_sdk.capture_exception(e)
```

`push_scope()` zorgt dat tags niet lekken naar concurrent async jobs.

**Context-enrichment tags:**

| Tag | Waar gebruikt |
|-----|--------------|
| `task_name` | Alle worker tasks + pipeline |
| `pass` | Watchdog passes (1a / 1b / 2) |
| `job_id` / `playlist_job_id` | Job-identiteit |
| `video_id` | Per-video operaties |
| `user_id` | Credit- / auth-operaties |
| `endpoint` | main.py route handlers |
| `cascade_step` | yt-dlp cascade (step2_yt-dlp) |
| `error_type` | Geclassificeerd via `_classify_download_error` |

**Bewust NIET gecaptured** (comment in code toegevoegd):
- PostHog fire-and-forget failures (`track_event` warnings)
- `bot_detection`, `timeout`, `members_only`, `no_captions` extractie-uitkomsten — operationeel, geen bug
- YouTube Data API quota-fallthrough naar yt-dlp — by design
- Cache misses in `master_transcripts_read`

### Frontend

Geconfigureerd via:
- `instrumentation.ts` — routing naar server/edge configs
- `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`
- `next.config.ts` — `withSentryConfig` plugin

**Capture pattern:**
```typescript
import * as Sentry from '@sentry/nextjs';
Sentry.captureException(error, { tags: { route: 'api/...', step: '...' } });
```

**Geïnstrumenteerde API routes:**

| Route | Stappen |
|-------|---------|
| `api/extract` | `python_backend_call`, `request_parse` |
| `api/stripe/webhook` | `signature_verification`, `add_credits_rpc` (FINANCIEEL) |
| `api/ai/summarize` | `route` tag |
| `api/transcribe/preflight` | `route` tag |
| `api/playlist/info` | `python_backend_call`, `request_parse` |
| `api/video/metadata/[videoId]` | `route`, `video_id` tag |

### Sentry runtime vereisten

`export const runtime = 'nodejs'` is gedeclareerd op alle geïnstrumenteerde routes. Zonder deze declaratie defaultt Next.js 16 op Vercel naar edge runtime en runt `Sentry.init()` nooit.

`await Sentry.flush(2000)` staat na elke `captureException` call — vereist omdat Vercel het serverless process kan killen voordat de async transport de envelope verstuurt.

**Huidige beperking:** Server-side `captureException` werkt structureel niet op Vercel, ook met `runtime = 'nodejs'` en `flush`. Bekend probleem (Sentry issue #17604, closed-not-planned). Zie [known-issues.md](known-issues.md) voor volledige analyse. De code blijft staan — werkt zodra Sentry/Vercel het oplost.

**Workaround voor server-side debugging:** Vercel function logs (Dashboard → Functions → selecteer route).

---

## Gezondheidscheck

```bash
# Check of Railway backend healthy is
curl https://indxr-production.up.railway.app/health
# → {"status": "healthy"}
```

---

## Externe-service-gezondheid (F17, ADR-067)

Nachtelijke ARQ-worker-cron `fetch_service_metrics` (Railway, **02:00 UTC**, naast de snapshot-cron) haalt server-side op:
- **DeepSeek prepaid-saldo** (`GET api.deepseek.com/user/balance`, `DEEPSEEK_API_KEY`) → `service_metrics` → Operations-kaart "External services". Status `ok`/`low`/`unavailable`; alert onder `cost_config.deepseek_low_balance_usd` (default $5, instelbaar). Faalt de call → "unavailable" + tijdstip laatste geslaagde ophaling, **nooit $0/oud getal**.
- **Decodo dagverkeer** (`POST api.decodo.com/api/v2/statistics/traffic`, **`DECODO_API_KEY`** = dashboard-token op de **worker-service**) → `decodo_daily_usage` → Finance-reconciliatie. Geen key → reconciliatie blijft "unavailable" (geen gefabriceerd gat).
- **AssemblyAI:** geen balance/usage-API (auto-recharge PAYG) → bewust niets gebouwd (zie provenance §2.13d).

Log-tag: `[service-metrics]` in Railway worker-logs.

## Operations-dashboard (admin, V3)

`/admin/operations` (server component) draait op de RPC **`admin_operations_v3(p_from, p_to, p_exclude_internal)`**
(laatste migratie `20260728015137_..._turnaround_wasted_playlist_errors.sql`). Georganiseerd rond de Four
Golden Signals; **geld staat er bewust NIET in** — dat blijft Finance (`admin_finance_summary`).

**Job- vs unit-niveau (ADR-081):** JOB-niveau-metrics (ai_total, AI-success_rate, errors.total/by_type/
daily) filteren `source_kind IN ('single','upload')` — playlist-kindjobs (`source_kind='playlist'`)
vervuilen de standalone-cijfers dus NIET. UNIT-niveau-telemetrie (latency, audio, provider) blijft ALLE
transcripties (playlist-video's lopen door dezelfde pipeline → geldige unit-meting).

Panelen:
- **Status-oordeel** (bovenaan) — 🔴/🟡/🟢-verdict "moet ik nú iets doen?", ergste actieve signaal wint
  (stuck>0 / success<70%/90% / saturatie≥60/90%), met reden + actie. Drempels zijn startgokken.
- **Live now** — in-flight / queue / stuck + AssemblyAI-saturatie (`ops_config.assemblyai_concurrency_limit`, 200).
  Bij géén activiteit toont het scherm alleen het oordeel + Live-now ("Quiet"), geen muur lege kaarten.
- **Traffic** — jobs (single/upload/playlist) **én units apart** + captions.
- **Errors** — success-rate + error% + **download-faal-per-duurcategorie** + dagreeks + de **volledige
  fouttaxonomie gegroepeerd naar schuld, inclusief 0-rijen** (us/transient/youtube/user/unknown),
  uitklapbaar met de **ruwe backend-meldingen** (`errors.samples`, tot 3 per type).
- **Latency** — **provider_turnaround** (`submitted_at`→`completed_at`) is het HOOFDgetal (altijd meetbaar,
  loopt op bij saturatie); queue-wait + processing_ms zijn secundair (vullen alleen bij echte wachtrij —
  AssemblyAI geeft geen timing-timestamps, en 1u audio verwerkt in ~30s dus de queued→processing-overgang
  wordt meestal gemist). mediaan/p95/max; leeg → "no data yet" nooit 0; onder n=20 geen p95/max (valse precisie).
- **Playlist reliability** — videos effective; first-pass/recovered pas zichtbaar zodra hun capture data
  heeft; + **playlist-video-foutuitsplitsing** op unit-niveau (uitklapbare ruwe meldingen, `source_kind='playlist'`).
- **Audio & provider** — download-MB + **verspilde proxy-MB op mislukte jobs** (gedrag/bytes, geen geld) +
  formaat/model/taal-verdeling.
- **Uptime** — eerlijk "nog niet ingericht"-vak tot een externe monitor (Better Stack) live is.

De oude `admin_operations_summary` blijft bestaan (niet meer door de UI gebruikt). Toegang via de
admin-service-role-client; route-niveau admin-gating (`ADMIN_EMAIL`).

## Wat nog ontbreekt

- **Uptime monitoring:** Geen externe uptime monitor (bijv. healthchecks.io, BetterStack) — taak 1.14.
- **Sentry alerting rules:** Sentry is geconfigureerd maar nog geen alert-regels ingesteld voor watchdog-errors of financiële failures.
- **Database monitoring:** Supabase Dashboard heeft basis query-statistieken; geen aangepaste dashboards.

---

## Dependency-onderhoud

### Principe

Pin alle externe dependencies voor reproduceerbare builds, maar loop niet ver achter. Een gap van 3,5 maanden op yt-dlp (bewezen root cause van bot-detection in juni 2026) is te lang. Live-zet altijd handmatig na een groene verificatietest — nooit volledig automatisch, want dependencies (vooral yt-dlp) brengen breaking changes uit die het production-pad kunnen breken.

### Per-dependency risicoverzicht

| Dependency | Onderhoudsfrequentie | Breekrisico | Koppeling |
|------------|---------------------|-------------|-----------|
| **yt-dlp + yt-dlp-ejs** | Wekelijks (YouTube adapteert) | Hoog — stale signatures → bot-detection, verwijderde clients, nieuwe JS-runtime-vereisten | yt-dlp-ejs-versie volgt yt-dlp interne ejs-versie; Node.js-versie gekoppeld aan yt-dlp's minimumeisen (nu v22+) |
| **Node.js** (in Dockerfile) | Majors ~1×/jaar | Laag → Hoog bij major: yt-dlp eist minimumversie (zie upgrade 2026-06-25) | Aan yt-dlp-versie gekoppeld |
| **Next.js** | Majors 1-2×/jaar | Hoog bij major — middleware→proxy conventie wisselt (Next.js 17, al genoteerd), App Router API wijzigt | Vercel auto-detecteert versie; upgraden vereist migratiepas |
| **youtube-transcript-api** | Maandelijks | Matig — YouTube timed-text API wijzigt geregeld; proxy-API (`GenericProxyConfig`) kan veranderen | Stap 1 van caption-cascade |
| **FastAPI / Pydantic** | Meerdere keren per jaar | Laag-Matig — breaking changes bij major | Pydantic v2 was een grote overgang; v3 te monitoren |
| **AssemblyAI SDK** | Maandelijks | Matig — model-namen en API-endpoints veranderen | Transcript-pipeline; `assemblyai_client.py` |
| **Stripe** | Maandelijks | Matig bij API-versie bumps — webhook payload-structuur kan veranderen | Financiële routes — extra auditplicht |
| **Supabase JS + Python** | Maandelijks | Laag-Matig | Auth-cookies, RLS, RPC-signatures |
| **Sentry** | Maandelijks | Laag | Capture-API is stabiel |

### Verificatietest (nog te bouwen — zie Fase 2 taak 2.9)

Na elke versie-bump van een hoog-risico dependency:
1. **yt-dlp:** extract captions van 3 bekende video's (Engels, Arabisch, members-only) via de volledige cascade. Verwachte resultaten documenteren.
2. **youtube-transcript-api:** idem, stap-1-only test.
3. **Next.js:** volledige Playwright smoke-test (aanwezig: `tests/playwright/specs/`).
4. **Stripe SDK:** Stripe CLI webhook test (`stripe trigger checkout.session.completed`).

Promotiebeslissing na groene test — nooit automatisch.

### Nightly/master-builds

Bewust NIET in productie. yt-dlp nightly heeft minder stabiel gedrag; marketing-waarde van "altijd nieuwste" weegt niet op tegen productie-risico.

### Latente inconsistentie (kleine opschoontaak)

`youtube_utils.py` + `main.py` gebruiken `enabled_runtimes: ['node']` + `remote_components: ['ejs:github']` als JS-runtime-optienamen in ydl_opts. `audio_utils.py` gebruikt `js_runtimes: {'node': {}}` — een andere spelling van verwante opties. Beide zijn momenteel geldig, maar de inconsistentie is een latent risico bij een toekomstige yt-dlp major die één van de varianten deprecateert. **Niet aanraken in de huidige pass** — opschonen samen met eventuele optie-2-evaluatie (taak 2.8).
