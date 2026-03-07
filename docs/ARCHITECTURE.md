# Architecture & Technology Stack

## Vision

INDXR.AI is a premium, "Apple-like" tool designed to democratize access to YouTube video transcripts. It bridges the gap between video content and text-based indexing, offering users instant, high-quality, and granular transcripts for single videos and entire playlists.

### Core Pillars

1.  **Aesthetics**: A "Wow" factor design with high-contrast dark mode, glassmorphism, and smooth animations.
2.  **Reliability**: Robust extraction using industry-standard tools (`yt-dlp`) backed by enterprise-grade proxy rotation (**IPRoyal** residential proxies) to bypass rate limits.
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
  - **yt-dlp**: Fallback engine for captions/video access and Whisper audio download.
- **Proxy**: **IPRoyal** residential proxy (`geo.iproyal.com:12321`) — prevents IP bans and 403s from YouTube CDN.
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

### Whisper AI Audio Pipeline

When a user requests Whisper re-extraction, the backend performs a **two-step** audio pipeline to avoid a known yt-dlp proxy-split issue:

**Step 1 — yt-dlp download (proxy-consistent):**

```python
ydl_opts = {
    'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
    'proxy': proxy_url,
    'extractor_args': {
        'youtube': {
            'player_client': ['ios', 'web_embedded'],
        }
    }
}
```

Format preference: `m4a` first (native to iOS client, bypassing strict PO Token bindings), `webm/opus` second, any `bestaudio` as fallback. The `/best` video fallback is explicitly excluded.

**Step 2 — ffmpeg conversion (subprocess):**

```bash
ffmpeg -i <raw_file> -ar 16000 -ac 1 -b:a 32k output.mp3
```

Converts the raw audio to 16kHz mono 32kbps MP3, optimised for Whisper API (speech recognition).

**Player Client & YouTube Restrictions:**
We explicitly use the `ios` player client. YouTube's GVS PO Token experiment blocks default clients (like Android) unless a JS runtime is installed to compute a token. The iOS client (`m4a`) bypasses this requirement completely and is highly stable with HTTP proxies. If a video strictly enforces PO tokens despite the iOS client, users receive a specific frontend error directing them to manual upload.

**Credit Calculation:**

```
credits = Math.ceil(duration_seconds / 600)  # 1 credit per 10 minutes, minimum 1
```

The frontend displays the exact cost before the user clicks (`duration` is returned by `/api/extract` and stored in component state). The backend uses the same formula for the atomic deduction.

---

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

### Analytics & Monitoring (Phase C & Planned)

**PostHog Integration (Active):**

- Project: INDXR.AI (US region, app.posthog.com)
- SDK: `posthog-js` (frontend React provider), `posthog-node` (Next.js server-side Stripe webhook)
- Backend: Python FastAPI backend is currently **NOT** tracked by PostHog.
- User Identification: Tied to Supabase user ID on login
- Auto-tracking: Pageviews, clicks,
- **Tracked Events**:
  - `signup_source` (google/email)
  - `credits_purchased` (server-side via Stripe Webhook + client-side)
  - `transcript_extracted` (video/playlist, youtube/whisper)

**Error Tracking (Planned):**

- **Sentry**: Planned integration for comprehensive frontend/backend stacktrace logging.

**Stripe Payments (Planned for Pre-Launch):**

- Mode: Development / Testing (Live keys required for production)
- Webhook: `/api/stripe/webhook` (needs handling logic for credit assignment)
- Credit Packages: Starter €4.99/50cr, Regular €9.99/120cr, Power €24.99/350cr
- Security: RPC atomic credit additions and signature validation to be implemented.

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
  - `DEEPSEEK_API_KEY` (DeepSeek V3 chat)
  - `PROXY_HOST`, `PROXY_PORT`, `PROXY_USER`, `PROXY_PASSWORD` (IPRoyal)
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `POSTHOG_API_KEY`

---

## Security — Supabase RLS Audit

All 6 user data tables have strict Row Level Security (RLS) enabled to guarantee data isolation between users.

### Table Policies

- **`collections`**: ALL operations allowed for own rows (`user_id = auth.uid()`).
- **`credit_transactions`**: SELECT only — inserts are handled exclusively by backend logic/RPC.
- **`transcripts`**: Full CRUD for own rows (`user_id = auth.uid()`).
- **`profiles`**: SELECT, INSERT, UPDATE for own rows (`id = auth.uid()`).
- **`usage_logs`**: SELECT only.
- **`user_credits`**: SELECT only. The UPDATE policy ("users can update own credits") was removed during this audit. Credit mutations are exclusively handled by the secure `deduct_credits_atomic` RPC on the backend. Direct client-side modification of credits is not possible.

### Codebase Security

- **Frontend**: The frontend codebase has no RLS bypass vulnerabilities and strictly uses the `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Backend / Admin**: The `SUPABASE_SERVICE_ROLE_KEY` is completely confined to the Python FastAPI backend, which handles secure administrative actions.
