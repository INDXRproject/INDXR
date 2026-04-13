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
# backend/main.py:62-65
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("indxr-backend")
```

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
- Geen centrale frontend logging service (geen Sentry o.i.d. geconfigureerd)

---

## Gezondheidscheck

```bash
# Check of Railway backend healthy is
curl https://indxr-production.up.railway.app/health
# → {"status": "healthy"}
```

---

## Wat nog ontbreekt

- **Error tracking (Sentry):** Niet geconfigureerd. Applicatiefouten zijn alleen zichtbaar in Railway logs.
- **Uptime monitoring:** Geen externe uptime monitor (bijv. UptimeRobot, BetterUptime).
- **Alerting:** Geen proactieve alerts bij Railway downtime of hoog error-percentage.
- **Database monitoring:** Supabase Dashboard heeft basis query-statistieken; geen aangepaste dashboards.

Dit is acceptabel voor early-stage maar moet aangepakt worden voor schaal.
