# Deployment

## Architectuur overzicht

```
indxr.ai (Vercel)          ←─── Next.js 16 frontend
    │ PYTHON_BACKEND_URL
    ▼
Railway (Docker)            ←─── FastAPI Python backend
    │ SUPABASE_URL
    ▼
Supabase                    ←─── PostgreSQL + Auth
    
Upstash Redis               ←─── Rate limiting (optioneel)
Stripe                      ←─── Payments
PostHog                     ←─── Analytics
```

---

## Frontend (Vercel)

**Auto-deploy:** Push naar `master` → Vercel deployt automatisch.  
**DNS:** `indxr.ai` → `76.76.21.21` (Vercel A-record)  
**Framework:** Next.js (automatisch herkend door Vercel)

### Environment Variables (Vercel)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # ⚠️ Server-only, nooit in browser

# Python Backend
PYTHON_BACKEND_URL=https://indxr-production.up.railway.app
NEXT_PUBLIC_PYTHON_BACKEND_URL=https://indxr-production.up.railway.app

# Backend Auth
BACKEND_API_SECRET=your-secret-key        # Shared secret Next.js ↔ Python

# Stripe
STRIPE_SECRET_KEY=sk_live_...             # ⚠️ Server-only
STRIPE_WEBHOOK_SECRET=whsec_...           # Webhook signature verificatie
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Rate Limiting (optioneel)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# App URL
NEXT_PUBLIC_APP_URL=https://indxr.ai

# Feature Flags
NEXT_PUBLIC_ENABLE_OAUTH=true
```

---

## Backend (Railway)

**Auto-deploy:** Push naar `master` → Railway rebuildt Docker image en deployt.  
**Dockerfile:** `backend/Dockerfile`  
**Gezondheidscheck:** `GET /health` → `{"status": "healthy"}`

### Docker Build

```dockerfile
FROM python:3.12-slim
RUN apt-get install: ffmpeg, wget, nodejs, npm
# Kopieert bgutil-pot binary naar /usr/local/bin/
# Kopieert bgutil-ytdlp-pot-provider-rs.zip
# pip install -r requirements.txt
CMD: uvicorn main:app --host 0.0.0.0 --port 8000
```

**Python packages updaten:**
```bash
cd backend
venv/bin/pip install <package>
venv/bin/pip freeze > requirements.txt
git add requirements.txt && git commit -m "update: add <package>"
# git push master → Railway rebuild
```

### Environment Variables (Railway)

```bash
# Supabase (Service Role Key voor RPC calls)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# YouTube / Audio
ASSEMBLYAI_API_KEY=...
DEEPSEEK_API_KEY=...

# Proxy (optioneel)
PROXY_ENABLED=false
PROXY_HOST=rotating.proxy.io
PROXY_PORT=12321
PROXY_USERNAME=username
PROXY_PASSWORD=password

# Auth
BACKEND_API_SECRET=your-secret-key    # Zelfde als in Vercel

# Analytics
POSTHOG_API_KEY=phc_...

# Logging
LOG_LEVEL=INFO    # DEBUG | INFO | WARNING | ERROR
```

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

- [ ] Email verificatie re-enablen (uitgeschakeld tijdens dev)
- [ ] RLS verificatie op alle 6 tabellen
- [ ] Database backups geconfigureerd
- [ ] Connection pooling gecheckt bij schaal

---

## Stripe Live Mode

Productie-checklist Stripe:
- [ ] Stripe account activeren met KVK/bedrijfsinfo
- [ ] Switch naar live mode
- [ ] 5 producten aanmaken (type: One-off, EUR):
  - Try — €2.49 / 200 credits
  - Basic — €5.99 / 500 credits
  - Plus — €11.99 / 1.100 credits *(meest populair)*
  - Pro — €24.99 / 2.600 credits
  - Power — €49.99 / 5.500 credits
- [ ] Webhook endpoint registreren: `https://indxr.ai/api/stripe/webhook`
- [ ] `STRIPE_WEBHOOK_SECRET` (live mode) instellen in Vercel
- [ ] Live mode keys configureren in Vercel (`sk_live_*`, `pk_live_*`)
- [ ] Test met kleine aankoop (Try €2.49) ter verificatie

**Code is al klaar** — `PACKAGES` object in `src/app/api/stripe/checkout/route.ts` bevat de juiste bedragen en credits.

---

## Lokale Development

### Frontend

```bash
cd "INDXR.AI V2"
npm install
npm run dev           # Port 3000
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
**bgutil-pot:** Linux x86_64 binary — werkt niet op macOS. Meeste extractions werken zonder het op lokaal (YouTube captions zonder PO token).

---

## Monitoring

Zie `monitoring.md` voor PostHog events en logging configuratie.
