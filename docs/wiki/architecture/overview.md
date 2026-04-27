# Architectuur Overzicht

## Systeem op één blik

```
Browser (React/Next.js)
    │
    ├─── Static/SSR ──────────────► Vercel (indxr.ai)
    │                                   │
    │                               Next.js 16 App Router
    │                               - 17 API routes
    │                               - Server Components
    │                               - Supabase SSR client
    │
    ├─── Auth/DB ─────────────────► Supabase
    │                               - PostgreSQL (transcripts, credits, jobs)
    │                               - Auth (email + Google OAuth)
    │                               - RLS op alle user-tabellen
    │
    ├─── Rate Limiting ───────────► Upstash Redis
    │                               - Sliding window per IP/user
    │                               - Optioneel (no-op zonder env vars)
    │
    └─── Extractie/AI ────────────► Railway (FastAPI Python)
                                    - yt-dlp (YouTube captions + audio)
                                    - ffmpeg (audio compressie)
                                    - AssemblyAI (transcriptie fallback)
                                    - DeepSeek V3 (samenvatting)
                                    - bgutil-pot (YouTube PO tokens)
```

---

## Request Flow: Transcript Extractie

```
1. Gebruiker voert YouTube URL in (frontend)
2. Frontend: POST /api/extract (Next.js API route)
3. Next.js API route:
   a. Valideert input (Zod)
   b. Checkt auth + suspension (Supabase)
   c. Checkt rate limit (Upstash Redis)
   d. Stuurt door naar Python: POST {PYTHON_BACKEND_URL}/api/extract/youtube
4. Python backend:
   a. yt-dlp haalt YouTube captions op
   b. VTT overlap-deduplicatie (LCS algoritme)
   c. Returns {transcript, title, duration}
5. Next.js API route:
   a. Slaat transcript op in Supabase (transcripts tabel)
   b. Returns naar frontend
6. Frontend: toont transcript in 4-tab interface
```

---

## Request Flow: Audio Transcriptie (fallback)

```
1. Video heeft geen captions → fallback triggered
2. Frontend: POST /api/transcribe/whisper
3. Next.js API route:
   a. Checkt auth + credits (via Python /check_balance)
   b. Stuurt door naar Python: POST /api/transcribe/whisper
4. Python backend:
   a. yt-dlp downloadt audio
   b. ffmpeg comprimeert naar 12kbps Opus/OGG
   c. POST naar AssemblyAI
   d. Retourneert job_id (async)
5. Frontend pollt GET /api/jobs/{job_id} elke 2 seconden
6. Wanneer klaar: transcript opgeslagen in Supabase
```

---

## Request Flow: AI Samenvatting

```
1. Gebruiker klikt "AI Samenvatten" op transcript
2. Frontend: POST /api/ai/summarize
3. Next.js API route stuurt door naar Python: POST /api/summarize
4. Python backend:
   a. check_user_balance() — voldoende credits?
   b. deduct_credits_atomic() — atomisch aftrekken
   c. Haalt transcript op uit Supabase
   d. POST naar DeepSeek API (120s timeout)
   e. Parseert JSON response {text, action_points}
   f. Slaat op in transcripts.ai_summary (JSONB)
   g. Bij fout: add_credits() refund
5. Frontend: toont samenvatting in de Summary tab
```

---

## Tech Stack Beslissingen

| Laag | Technologie | Reden |
|------|-------------|-------|
| Frontend framework | Next.js 16 | App Router, SSR, Vercel integration |
| React versie | 19.2.3 | Nieuwste stabiel |
| Styling | Tailwind CSS v4 + Radix | Utility-first + accessible primitives |
| Component library | Shadcn/ui | Radix + Tailwind, eigen codebase |
| Auth | Supabase Auth | OAuth + DB in één → zie [005](../decisions/005-supabase.md) |
| Database | PostgreSQL (Supabase) | RLS, RPC functions, JSONB |
| Backend | FastAPI Python | yt-dlp/ffmpeg vereisen Python → zie [001](../decisions/001-python-backend.md) |
| Transcriptie | YouTube captions + AssemblyAI | Captions-first strategie → zie [002](../decisions/002-youtube-captions.md) |
| AI Summarization | DeepSeek V3 | Kosten vs. GPT-4 → zie [004](../decisions/004-deepseek-v3.md) |
| Rate limiting | Upstash Redis | Serverless-compatible sliding window |
| Payments | Stripe | Industrie-standaard, goede webhook DX |
| Analytics | PostHog | Product analytics, zelf te hosten |
| Testing | Playwright | E2E tests (29 specs) |
| Frontend hosting | Vercel | Next.js native, auto-deploy |
| Backend hosting | Railway (2 services) | API-service + ARQ worker-service → zie [ADR-019](../decisions/019-arq-job-queue.md) |
| Job queue | ARQ via Upstash Redis (TCP) | Durable jobs die Railway-restarts overleven |

---

## Design System

**Utility Skin** (geïntroduceerd April 2025, vervangt deprecated Starlight/Midnight themes):
- CSS-variabelen in `src/app/globals.css`: `--bg-base`, `--text-primary`, `--text-muted`, `--border`, etc.
- Kleuren worden per component ingesteld via Tailwind CSS-variabelen
- Dark mode via `next-themes` (system preference)
- Fonts: SF Pro Display (macOS system font) + SF Mono voor code

Shadcn/ui componenten in `src/components/ui/`:
- Volledig in de codebase gekopieerd (niet als npm package)
- Radix primitives met Tailwind classes
- Customizable zonder vendor lock-in
