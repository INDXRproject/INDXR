# Architecture & Technology Stack

## Vision

INDXR.AI is a premium tool designed to democratize access to YouTube video transcripts. It bridges the gap between video content and text-based indexing, offering users instant, high-quality, and granular transcripts for single videos and entire playlists.

### Core Pillars

1. **Functionality First**: Clean, usable interface with clear visual hierarchy. Currently using a neutral utility skin; full redesign planned post-launch.
2. **Reliability**: Robust extraction using industry-standard tools (`yt-dlp`) backed by enterprise-grade proxy rotation (IPRoyal residential proxies) to bypass rate limits.
3. **Simplicity**: A frictionless "Free Tool" that requires no login for basic use, with a natural upsell path to a powerful Dashboard for power users.

---

## Technical Architecture

### 1. Frontend (Application)

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- **Styling**:
  - **Tailwind CSS**: Core utility-first styling
  - **shadcn/ui**: Reusable, accessible component primitives
  - **Lucide React**: Iconography
- **State**: React Hooks (`useState`) and URL state (`searchParams`)
- **Auth**:
  - **Supabase Auth**: Email/Password + Google OAuth
  - **Session Strategy**: Server-Side Hydration (Root Layout) for zero-flicker experience
  - **Security**: Middleware chaining for Route Protection + Rate Limiting

### 2. Backend (Extraction Service)

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Core Logic**:
  - **YouTube Data API v3**: Instant metadata fetching
  - **yt-dlp**: Fallback engine for captions/video access and Whisper audio download
- **Proxy**: IPRoyal residential proxy (`geo.iproyal.com:12321`) — prevents IP bans and 403s from YouTube CDN
- **Validation**: Pydantic models

### 3. Infrastructure & Data

- **Database**: Supabase (PostgreSQL)
  - `auth.users`: Managed Identity
  - `public.profiles`: User metadata (Role, Username, `suspended` boolean for account bans)
  - `public.user_credits` + `credit_transactions`: Billing logic
  - `public.transcripts`: Stores video/playlist transcripts, including `edited_content` (text) and `ai_summary` (JSONB)
- **Cache/Rate Limit**: Upstash Redis (Serverless Redis)
- **Hosting**: Vercel (Frontend), Railway (Backend - recommended)

---

## Feature Implementations

### Stripe Payments

**Status**: Fully implemented and tested.

**Checkout Flow** (`/api/stripe/checkout`):
- Creates Stripe checkout session with server-side pricing
- Packages: Starter (€1.99/15cr), Basic (€4.99/50cr), Plus (€9.99/130cr), Pro (€24.99/400cr), Power (€49.99/850cr)
- Metadata includes `userId` and `credits` for webhook processing

**Webhook Handler** (`/api/stripe/webhook`):
- Listens for `checkout.session.completed` events
- Validates signature using `STRIPE_WEBHOOK_SECRET`
- Assigns credits via `add_credits` RPC with metadata:
  ```json
  {
    "stripe_session_id": "cs_...",
    "amount_paid": 4.99,
    "currency": "eur"
  }
  ```
- Tracks `credits_purchased` event in PostHog (server-side)

### Whisper AI Audio Pipeline

When a user requests Whisper re-extraction, the backend performs a **two-step** audio pipeline:

**Step 1 — yt-dlp download (proxy-consistent):**

```python
ydl_opts = {
    'format': 'bestaudio/best',
    'proxy': proxy_url,
    'extractor_args': {
        'youtube': {
            'player_client': ['ios', 'web_embedded'],
        }
    }
}
```

Format: `bestaudio/best` — DASH m4a/webm formats are no longer available in yt-dlp 2026.03.17+; ffmpeg handles conversion to mp3 regardless of container.

**Step 2 — ffmpeg conversion (subprocess):**

```bash
ffmpeg -i <raw_file> -ar 16000 -ac 1 -b:a 32k output.mp3
```

Converts to 16kHz mono 32kbps MP3, optimized for Whisper API.

**Credit Calculation:**

```
credits = Math.ceil(duration_seconds / 600)  # 1 credit per 10 minutes, minimum 1
```

### AI Summarization

**Provider**: DeepSeek V3 (`deepseek-chat`)

**Workflow**:
1. User clicks "Summarize" on Original Transcript tab
2. Backend verifies ≥ 1 credit balance and deducts atomically
3. Fetches raw transcript from `transcript` column
4. Calls DeepSeek API with structured prompt
5. Returns JSON: `{ "text": "...", "action_points": ["...", "..."] }`
6. Saves to `ai_summary` JSONB column
7. On failure: automatic credit refund

### Export Formats

**Available Formats**:

| Format | Structure | Use Case |
|--------|-----------|----------|
| TXT | Plain text (optional timestamps) | Reading |
| JSON | `[{text, duration, offset}, ...]` | Developer integration |
| CSV | `Start, Duration, Text` | Spreadsheets |
| SRT | Standard subtitle format | Video editing |
| VTT | WebVTT format | Web video players |

**JSON Export Structure**:

```typescript
interface TranscriptItem {
  text: string;      // Segment text
  duration: number;  // Length in seconds
  offset: number;    // Start time in seconds
}
```

Segments are granular (typically 2-5 seconds). For RAG pipelines, post-processing may be needed to create larger chunks.

### Rate Limiting System

Three-tier strategy via `@upstash/ratelimit`:

| Tier | Limit | Scope | Logic |
|------|-------|-------|-------|
| Anonymous | 10 req / 24h | IP-based | Prevents abuse from guests |
| Free User | 50 req / 1h | User ID | Generous limit for logged-in users |
| Premium | Unlimited | User ID | Bypassed if `total_credits_purchased > 0` |

### Admin Dashboard

**Routes** (server-rendered, protected by `ADMIN_EMAIL` middleware):

| Route | Description |
|-------|-------------|
| `/admin` | Overview: total users, weekly signups, credit stats |
| `/admin/users` | User list with search, credit balance, suspend/unsuspend |
| `/admin/credits` | Credit transaction log |
| `/admin/transcripts` | All transcripts with delete capability |
| `/admin/transcripts/[id]` | Individual transcript detail |
| `/admin/paid-users` | Users with `total_credits_purchased > 0`, PostHog deep-link |

**Admin API Routes** (all require `ADMIN_EMAIL` session check):

| Endpoint | Method | Action |
|----------|--------|--------|
| `/api/admin/add-credits` | POST | Manually grant credits to a user |
| `/api/admin/suspend-user` | POST | Toggle `suspended` on `profiles` |
| `/api/admin/delete-user` | POST | Cascade-delete user (uses `delete_user_cascade` RPC) |
| `/api/admin/delete-transcript` | POST | Remove a transcript record |
| `/api/admin/user-detail` | GET | Full user profile + credit history |

**Suspended User Enforcement**: The `suspended` boolean on `profiles` is checked at the start of every write-path API route:
- `/api/extract`
- `/api/ai/summarize`
- `/api/transcribe/whisper`
- `/api/playlist/info`
- `/api/check-playlist-availability`

Suspended users receive HTTP 403 with `"Account suspended. Contact support@indxr.ai"`. A `/suspended` page is shown for blocked sessions.

### Analytics & Monitoring

**PostHog Integration**:
- **Frontend**: `posthog-js` React provider
- **Server**: `posthog-node` in Stripe webhook
- **Backend**: `posthog` Python SDK in FastAPI — all Whisper and credit events tracked

**Tracked Events**:

| Event | Source | Key Properties |
|---|---|---|
| `signup_source` | Frontend | `provider` (google/email) |
| `credits_purchased` | Stripe webhook | `amount`, `currency`, `credits` |
| `transcript_extracted` | Frontend | `method`, `video_id` |
| `whisper_started` | Python backend | `video_id`, `source_type`, `duration_seconds` |
| `whisper_completed` | Python backend | `video_id`, `processing_time_ms`, `credits_used` |
| `whisper_failed` | Python backend | `video_id`, `error_type`, `error_message` |
| `credits_deducted` | Python backend | `amount`, `reason`, `balance_after` |
| `summarization_completed` | Python backend | `video_id`, `duration_ms` |

**Error Tracking**: PostHog handles both analytics and error tracking. Sentry is explicitly excluded from this project.

### Transcript Tab Architecture

The Dashboard uses a "Keep the Original" pattern:

- **Original**: Read-only raw transcript
- **Edited**: User-modified version (stored in `edited_content`)
- **AI Summary**: Read-only summary from DeepSeek
- **Edited Summary**: User-modified summary (stored in `ai_summary.edited_html`)

Navigation: URL-based (`?tab=x`) for SEO and deep-linking.

### Playlist Engine

- **Source**: YouTube Data API v3
- **Job Queue**: Large playlists processed asynchronously
- **Availability**: Live pre-scan checks video availability before extraction

---

## Security — Supabase RLS Audit

All 6 user data tables have strict Row Level Security (RLS) enabled:

### Table Policies

| Table | Allowed Operations | Notes |
|-------|-------------------|-------|
| `collections` | ALL for own rows | `user_id = auth.uid()` |
| `credit_transactions` | SELECT only | Inserts via backend RPC |
| `transcripts` | Full CRUD for own | `user_id = auth.uid()` |
| `profiles` | SELECT, INSERT, UPDATE | `id = auth.uid()` |
| `usage_logs` | SELECT only | Read-only audit |
| `user_credits` | SELECT only | Mutations via RPC only |

### Codebase Security

- **Frontend**: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` only
- **Backend**: `SUPABASE_SERVICE_ROLE_KEY` confined to Python FastAPI

---

## Environment Variables

### Frontend (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
PYTHON_BACKEND_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_POSTHOG_PROJECT_ID  # Admin dashboard PostHog deep-links
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
ADMIN_EMAIL                     # Single admin email address — guards /admin routes
```

### Backend (`.env`)

```
OPENAI_API_KEY          # Whisper
DEEPSEEK_API_KEY        # Summarization
PROXY_HOST              # IPRoyal
PROXY_PORT
PROXY_USER
PROXY_PASSWORD
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
POSTHOG_API_KEY         # Backend event tracking
POSTHOG_HOST            # https://app.posthog.com
DENO_PATH               # Path to deno binary (e.g. /home/user/.deno/bin)
LOG_LEVEL               # Logging verbosity: WARNING (prod) or INFO (debug)
```

---

## Developer Productivity

### IDE & Tools

- **Cline** (VSCode extension) with **DeepSeek Chat** for AI-assisted development
- Custom rules in `.cline/rules/` for project-specific guidance

### Design System

The project currently uses a **neutral utility skin** (April 2025):

- Background: `#f8f9fa` (light) / `#111111` (dark)
- Surface: `#ffffff` (light) / `#1a1a1a` (dark)
- Accent: `#2563eb` (both modes)
- Border radius: `6px`

**Deprecated**: The `.cline/skills/indxr-design/` skill references the old Starlight/Midnight design system and should not be used. A full visual redesign is planned post-launch.
