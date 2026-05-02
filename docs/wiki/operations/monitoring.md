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

---

## Gezondheidscheck

```bash
# Check of Railway backend healthy is
curl https://indxr-production.up.railway.app/health
# → {"status": "healthy"}
```

---

## Wat nog ontbreekt

- **Uptime monitoring:** Geen externe uptime monitor (bijv. healthchecks.io, BetterStack) — taak 1.14.
- **Sentry alerting rules:** Sentry is geconfigureerd maar nog geen alert-regels ingesteld voor watchdog-errors of financiële failures.
- **Database monitoring:** Supabase Dashboard heeft basis query-statistieken; geen aangepaste dashboards.
