# CLAUDE.md — INDXR.AI V2

YouTube transcript SaaS. Next.js 16 frontend op Vercel, FastAPI Python backend op Railway, Supabase als database.

---

## Sessiestart protocol

Bij het begin van elke sessie:

1. Lees `docs/wiki/INDEX.md` — navigatiehub naar alle wiki-pagina's
2. Lees de laatste 15 regels van `docs/LOG.md` — recente wijzigingen
3. Lees `docs/INBOX.md` — als er inhoud staat onder de `---` lijn:
   - Verwerk naar de juiste wiki-pagina's in `docs/wiki/`
   - Maak daarna de inhoud onder de `---` leeg (behoud de header boven de lijn)

---

## Na elke voltooide taak

1. Update de relevante wiki-pagina('s) in `docs/wiki/`
2. Voeg een regel toe aan `docs/LOG.md`:
   ```
   [YYYY-MM-DD HH:MM] taak: <beschrijving> | gewijzigd: <bestanden>
   ```

---

## Na elke architectuurbeslissing

1. Maak een ADR aan in `docs/wiki/decisions/` — volgende nummer ophalen uit `INDEX.md`
2. Update `docs/wiki/INDEX.md` (tabel onder `## Beslissingen`)

ADR-formaat:
```markdown
# Beslissing NNN: <Titel>

**Status:** Geaccepteerd  
**Datum:** YYYY-MM-DD  
**Gerelateerde code:** <bestanden>

## Context
## Beslissing
## Rationale
## Consequenties
```

---

## Project context

### Stack

| Laag | Technologie |
|------|-------------|
| Frontend | Next.js 16, React 19.2.3, App Router |
| Styling | Tailwind CSS v4 + Radix + Shadcn/ui |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | PostgreSQL via Supabase (RLS op alle 6 tabellen) |
| Backend | FastAPI Python 3.12 op Railway (Docker) |
| Transcriptie | YouTube captions (yt-dlp) + AssemblyAI fallback |
| AI Samenvatting | DeepSeek V3 (`deepseek-chat`) |
| Rate limiting | Upstash Redis (sliding window) |
| Payments | Stripe (Checkout Sessions, eenmalig, EUR) |
| Analytics | PostHog |
| Testing | Playwright E2E (29 specs) |

### Lokale commando's

**Frontend:**
```bash
cd "INDXR.AI V2"
npm install
npm run dev          # http://localhost:3000
```

**Backend (apart starten, niet via Next.js):**
```bash
cd "INDXR.AI V2/backend"
venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Playwright tests:**
```bash
npx playwright test                        # alle 29 specs headless
npx playwright test specs/01-single-video  # één spec
```
Vereist: `npm run dev` + backend draaiend + `tests/test_accounts.json` aanwezig.

**Python packages updaten:**
```bash
cd backend
venv/bin/pip install <package>
venv/bin/pip freeze > requirements.txt
git add requirements.txt && git commit -m "update: add <package>"
```

**Supabase migrations:**
```bash
supabase db push
# of direct in Supabase Dashboard → SQL Editor
```

### Deployment URLs

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://indxr.ai |
| Backend (Railway) | https://indxr-production.up.railway.app |
| Health check | https://indxr-production.up.railway.app/health |

Auto-deploy: push naar `master` → Vercel + Railway deployen automatisch.

---

## Codeerconventies

### Bestandsstructuur

- Next.js API routes: `src/app/api/<route>/route.ts`
- React componenten: `src/components/`
- Shadcn/ui primitives: `src/components/ui/` (volledig in codebase gekopieerd, niet npm)
- Auth context + hooks: `src/contexts/AuthContext.tsx`, `useAuth()`
- Server Actions: `src/app/actions/`
- Python backend: `backend/main.py` (monolith), `backend/credit_manager.py`, `backend/audio_utils.py`, `backend/assemblyai_client.py`

### Validatie

- Input-validatie via **Zod** in Next.js API routes
- Nooit client-side prijs vertrouwen — prijzen zijn server-side vastgelegd in `PACKAGES` object (`checkout/route.ts`)

### Auth patroon

- Server components: `await supabase.auth.getUser()` → doorgeven als prop aan `<AuthProvider>`
- Client components: `useAuth()` hook (nooit direct Supabase aanroepen voor user-state)
- Middleware: `updateSession()` op elke request (vernieuwt cookies)

### Credits

- **Nooit** credits direct aftrekken via INSERT — gebruik altijd `deduct_credits_atomic` RPC
- **Altijd** refund bij mislukte AI-operatie: `add_credits(user_id, amount, "Refund: ...")`
- Formule: `math.ceil(duration_seconds / 60.0)`, minimum 1 — **1 credit = 1 minuut**
- Caption-extractie kost **0 credits**

### Database

- Alle 6 user-facing tabellen hebben RLS — gebruikers zien alleen eigen data
- `SUPABASE_SERVICE_ROLE_KEY` alleen in Python backend (bypass RLS) — nooit in browser of Next.js client
- Credits = `SUM(amount)` over `credit_transactions` (geen aparte balance-kolom)

### Design system

- CSS-variabelen in `src/app/globals.css`: `--bg-base`, `--bg-surface`, `--accent`, `--radius`
- Dark mode via `next-themes`
- Geen OKLCH (vervangen door hex), geen glassmorphism (`backdrop-blur` verwijderd)
- Deprecated: Starlight/Midnight themes, `.cline/skills/indxr-design/`

### Tiptap editors

- Altijd `immediatelyRender: false` instellen — anders SSR hydration mismatch
- `setEditable(true)` synchroniseren via `useEffect`

### Polling architectuur

- Async jobs (AssemblyAI, playlists): frontend pollt elke 2–3 seconden
- Geen WebSockets — zie ADR 008
- Playlist job state: `sessionStorage` key `indxr-active-playlist-job`

### Proxy (Decodo)

- Sticky sessions via **username-suffix**: `{PROXY_USERNAME}-{session_id}`
- Bij Whisper jobs: `session_id = job_id[:8]` — pinned exit IP noodzakelijk (YouTube CDN is IP-locked)
- Overgestapt van IPRoyal naar Decodo residentieel op 2026-04-20

### bgutil-pot

- Linux x86_64 binary — werkt **niet** op macOS
- Draait op `127.0.0.1:4416` bij app startup
- iOS client bypassed PO tokens — alleen `web_embedded` gebruikt bgutil

### Git hygiene

Nooit committen:
- `tests/playwright-report/`
- `tests/results/`
- `test-results/`
- `tests/__pycache__/`

Als ze verschijnen: `git rm -r --cached <path>`

---

## Kritieke waarschuwingen

### Stripe live mode
- **Alle 5 pakketten** moeten aangemaakt worden in live mode: Try €2.49, Basic €5.99, Plus €11.99, Pro €24.99, Power €49.99
- Webhook endpoint moet geregistreerd zijn: `https://indxr.ai/api/stripe/webhook`
- `STRIPE_WEBHOOK_SECRET` altijd instellen in productie — zonder verificatie is webhook onveilig

### Supabase
- **Email verificatie is uitgeschakeld** (development) — re-enablen voor productie
- RLS verificeren op alle 6 tabellen voor launch
- Database backups nog niet geconfigureerd

### Railway
- Bij Railway restart mid-job: background task sterft — job blijft hangen in `running` state, **geen auto-recovery**
- Trigger in dat geval een nieuwe extractie

### BACKEND_API_SECRET
- **⚠️ Nog niet geïmplementeerd** — Next.js routes versturen dit header niet; Python valideert het niet
- Staat op de pre-launch checklist (`known-issues.md`) als TODO
- Wanneer geïmplementeerd: gedeeld secret tussen Next.js (Vercel) en Python (Railway)

### Playlist Whisper duplicaten
- Na Whisper job in playlist: backend maakt eigen transcript-rij aan
- Frontend moet deze verwijderen en placeholder updaten
- Als je duplicate rijen ziet: controleer `GET /api/jobs/{id}` retourneert `transcript_id` + RLS staat DELETE toe

### Geen Sentry / uptime monitoring
- Fouten alleen zichtbaar in Railway logs
- Geen proactieve alerts

---

## Backend endpoints (snelreferentie)

### Python FastAPI (Railway, port 8000)

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/extract/youtube` | POST | YouTube captions extraheren (yt-dlp) |
| `/api/summarize` | POST | AI samenvatting (DeepSeek) |
| `/api/transcribe/whisper` | POST | Start transcriptie-job → `{job_id}` direct |
| `/api/jobs/{job_id}` | GET | Poll transcriptie-job status |
| `/api/video/metadata/{video_id}` | GET | Video titel + duur |
| `/api/playlist/info` | POST | Playlist metadata (YouTube API + yt-dlp fallback) |
| `/api/playlist/extract` | POST | Start playlist-job → `{job_id, status: "running"}` direct |
| `/api/playlist/jobs/{job_id}` | GET | Poll playlist-job status |
| `/health` | GET | `{"status": "healthy"}` |

### Next.js Admin (vereist `ADMIN_EMAIL` sessie)

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/admin/add-credits` | POST | Credits toekennen |
| `/api/admin/suspend-user` | POST | `profiles.suspended` togglen |
| `/api/admin/delete-user` | POST | User cascade-deleten |
| `/api/admin/delete-transcript` | POST | Enkel transcript verwijderen |
| `/api/admin/user-detail` | GET | Profiel + credit history |

### Next.js overige routes

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/extract` | POST | Caption-extractie (client-facing, proxyt naar `/api/extract/youtube`) |
| `/api/transcribe/preflight` | POST | Auth/rate-check vóór directe upload naar Railway (bypast Vercel 4.5MB limiet) |
| `/api/check-playlist-availability` | POST | Captions vs. Whisper check per video in batch |

---

## Wiki locaties

```
docs/wiki/
├── INDEX.md                        ← altijd hier beginnen
├── architecture/
│   ├── overview.md                 ← request flows, tech stack
│   ├── ai-pipeline.md              ← extractie + samenvatting flows
│   ├── auth-and-security.md        ← auth, RLS, rate limiting, suspension
│   ├── credit-system.md            ← volledige credit flow
│   ├── database-schema.md          ← tabellen, RPC's, migrations
│   └── playlist-engine.md          ← async job systeem
├── business/
│   ├── pricing.md                  ← 5-tier model, EUR
│   ├── positioning.md
│   └── marketing.md
├── decisions/
│   ├── 001-python-backend.md
│   ├── 002-youtube-captions.md
│   ├── 003-assemblyai.md
│   ├── 004-deepseek-v3.md
│   ├── 005-supabase.md
│   ├── 006-credit-model.md
│   ├── 007-bgutil-pot.md
│   └── 008-polling-vs-websockets.md
└── operations/
    ├── deployment.md               ← env vars, Vercel + Railway setup
    ├── monitoring.md               ← PostHog events, logging
    └── known-issues.md             ← openstaande TODOs, bugs, workarounds
```
