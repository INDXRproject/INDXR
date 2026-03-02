# Architecture & Technology Stack

## Vision

INDXR.AI is a premium, "Apple-like" tool designed to democratize access to YouTube video transcripts. It bridges the gap between video content and text-based indexing, offering users instant, high-quality, and granular transcripts for single videos and entire playlists.

### Core Pillars

1.  **Aesthetics**: A "Wow" factor design with high-contrast dark mode, glassmorphism, and smooth animations.
2.  **Reliability**: Robust extraction using industry-standard tools (`yt-dlp`) backed by enterprise-grade proxy rotation (`LunaProxy`) to bypass rate limits.
3.  **Simplicity**: A frictionless "Free Tool" that requires no login for basic use, with a natural upsell path to a powerful Dashboard for power users.

---

## Technical Architecture

### 1. Frontend (Application)

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- **Styling**:
  - **Tailwind CSS**: Core utility-first styling.
  - **shadcn/ui**: Reusable, accessible component primitives.
  - **Lucide React**: Iconography.
- **State**: React Hooks (`useState`) and URL state (`searchParams`).
- **Auth**:
  - **Supabase Auth**: Email/Password + Google OAuth.
  - **Session Strategy**: Server-Side Hydration (Root Layout) for zero-flicker experience.
  - **Security**: Middleware chaining for Route Protection + Rate Limiting.

### 2. Backend (Extraction Service)

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Core Logic**:
  - **YouTube Data API v3**: Instant metadata fetching.
  - **yt-dlp**: Fallback engine for captions/video access.
- **Proxy**: **LunaProxy** (Residential IP rotation to prevent 429s).
- **Validation**: `Pydantic` models.

### 3. Infrastructure & Data

- **Database**: **Supabase** (PostgreSQL)
  - `auth.users`: Managed Identity.
  - `public.profiles`: User metadata (Role, Username).
  - `public.user_credits` + `credit_transactions`: Billing logic.
- **Cache/Rate Limit**: **Upstash Redis** (Serverless Redis).
- **Hosting**: Vercel (Frontend), Railway (Backend - recommended).

---

## Feature Implementations

### Rate Limiting System (Phase 3)

The system protects the extraction API using a 3-tier strategy via `@upstash/ratelimit`.

| Tier          | Limit                  | Scope    | Logic                                      |
| ------------- | ---------------------- | -------- | ------------------------------------------ |
| **Anonymous** | 10 requests / 24 hours | IP-based | Prevents abuse from guests and bots.       |
| **Free User** | 50 requests / 1 hour   | User ID  | Generous limit for logged-in free users.   |
| **Premium**   | **Unlimited**          | User ID  | Bypassed if `total_credits_purchased > 0`. |

**How it works**:

1.  **Request**: `/api/extract` called.
2.  **Check**: Middleware checks Supabase session.
3.  **Premium Bypass**: If user has `total_credits_purchased > 0`, skip limits.
4.  **Enforcement**: Check Redis usage counters. 429 Error if exceeded.
5.  **Configuration**: Centralized in `src/lib/ratelimit.ts`.

### Analytics & Monitoring (Phase C)

**PostHog Integration:**

- Project: INDXR.AI (US region, app.posthog.com)
- SDK: posthog-js (frontend), posthog (Python backend)
- User Identification: Tied to Supabase user ID on login
- Auto-tracking: Pageviews, clicks, session replay, JavaScript errors

**Custom Events:**
| Event | Trigger | Properties |
|-------|---------|------------|
| `signup_source` | User registration | method: 'google' \| 'email' |
| `credits_purchased` | Stripe success (server + client) | amount, credits_added, package_name |
| `transcript_extracted` | Extraction complete | type: 'video' \| 'playlist_video', processing_method: 'youtube' \| 'whisper', credits_used |

**Conversion Funnel:**
Signup → First extraction → Credit purchase (enables drop-off analysis)

**Stripe Payments:**

- Mode: Test (live keys required for production)
- Webhook: /api/stripe/webhook (validates signatures, prevents fake payments)
- Credit Packages: Starter €4.99/50cr, Regular €9.99/120cr, Power €24.99/350cr
- Security: Idempotency keys, metadata validation, RPC atomic credit additions

### Playlist Engine

- **Source**: Switched to YouTube Data API v3 for reliability.
- **Job Queue**: Large playlists are processed asynchronously.
- **Availability**: Live pre-scan checks "availabilty" of videos before extraction.

### Environment Variables

- **Frontend**: `.env.local`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `PYTHON_BACKEND_URL`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Backend**: `.env`
  - `OPENAI_API_KEY` (Whisper)
  - `LUNAPROXY_HOST`/`PORT`/`USER`/`PASS`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `POSTHOG_API_KEY`
