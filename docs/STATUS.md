# Project Status

## Overview

INDXR.AI is a premium YouTube transcript extraction tool. The core product is functional and monetization-ready. A visual redesign is planned but deferred until post-launch.

---

## ✅ COMPLETED FEATURES

### Stripe Payments (Phase B)

- **Status**: Fully implemented and tested
- **Checkout Flow**: `/api/stripe/checkout` creates secure Stripe sessions
- **Packages**: Starter (€1.99/15cr), Basic (€4.99/50cr), Plus (€9.99/130cr), Pro (€24.99/400cr), Power (€49.99/850cr)
- **Webhook**: `/api/stripe/webhook` handles `checkout.session.completed`
- **Credit Assignment**: Secure `add_credits` RPC with metadata (stripe_session_id, amount_paid, currency)
- **Tracking**: Server-side PostHog event `credits_purchased` on successful payment

### Core Extraction (Phase 1-2)

- **Single Video**: YouTube captions (XML/Text) extraction via YouTube Data API v3
- **Playlist**: Full playlist extraction with video selection and availability pre-scan
- **Whisper AI**: Two-step audio pipeline (yt-dlp + ffmpeg → OpenAI Whisper)
  - Format selector prioritizes `m4a` (iOS client) to bypass PO Token restrictions
  - IPRoyal residential proxy for YouTube CDN access
  - Credit cost: `Math.ceil(duration_seconds / 600)` (1 credit per 10 mins)
  - yt-dlp updated to 2026.03.17 (fixes YouTube Error 152 regression from March 2026)
  - Format selector updated to `bestaudio/best` (DASH m4a formats no longer available in newer yt-dlp)
  - Deno JS runtime installed and configured for YouTube challenge solving
- **Audio Upload**: Manual `.mp3/.wav` file upload → Whisper transcription (< 25MB limit)
- **Duplicate Detection**: Composite key (`video_id` + `processing_method`) prevents duplicates

### AI Summarization (Phase G)

- **Provider**: DeepSeek V3 (`deepseek-chat`)
- **Endpoint**: `/api/summarize` (Python backend)
- **Output**: JSON with `text` (summary) and `action_points` (array of takeaways)
- **Credit Cost**: 1 credit per summary with atomic deduction
- **Failure Handling**: Automatic refund if transcript fetch or API call fails

### Admin Dashboard (Phase F)

- **Status**: Fully built and protected
- **Routes**: `/admin` (overview), `/admin/users`, `/admin/credits`, `/admin/transcripts`, `/admin/transcripts/[id]`, `/admin/paid-users`
- **Protection**: Middleware checks session email against `ADMIN_EMAIL` env var — any other user gets 403
- **Capabilities**: View all users and credit balances, suspend/unsuspend accounts, manually add credits, delete users (via `delete_user_cascade` RPC), delete transcripts, view paid users with PostHog deep-links
- **Admin API routes**: `/api/admin/add-credits`, `/api/admin/suspend-user`, `/api/admin/delete-user`, `/api/admin/delete-transcript`, `/api/admin/user-detail`

### Suspended User Enforcement

- **Field**: `suspended` boolean on `public.profiles`
- **Enforcement**: Checked at the start of all write-path API routes (`/api/extract`, `/api/ai/summarize`, `/api/transcribe/whisper`, `/api/playlist/info`, `/api/check-playlist-availability`)
- **Response**: HTTP 403 — `"Account suspended. Contact support@indxr.ai"`
- **UI**: `/suspended` page displayed for blocked sessions

### Playwright E2E Test Suite

- **Status**: 29 tests across 4 spec files
- **Accounts**: 4 test accounts (`test1–4@indxr-test.com`), auto-topped-up to ≥ 50 credits before each run via global setup
- **Coverage**:
  - `01-single-video.spec.ts` — auto-captions, Whisper, duplicate detection, long video timing, library navigation
  - `02-playlist.spec.ts` — small/large/mixed Whisper playlists, 100-video fetch, long video stress
  - `03-library.spec.ts` — library operations, AI summary, transcript editing, summary editing
  - `04-stress.spec.ts` — concurrent extraction, rapid sequential, race conditions
- **Global Setup**: `global-setup.ts` runs before tests; reads `tests/test_accounts.json`, tops up any account below 50 credits via `add_credits` RPC
- **Metrics**: Per-test timing logged to `tests/playwright-report/metrics_{date}.json`
- **Credentials**: `tests/test_accounts.json` (gitignored)

### Legacy Python Test Suite

- **Status**: Retained at `tests/test_suite.py` (28 tests); superseded by Playwright suite
- **Results**: `tests/results/run_{timestamp}.json`

### Error Handling & UI Fixes (Apr 2026)

- **Members-only video detection**: `MembersOnlyVideoError` raised in `audio_utils.py` and `extract_with_ytdlp` when yt-dlp returns error messages containing members-only keywords (`UNPLAYABLE`, `members-only`, etc.). Backend returns HTTP 403 with `{"error": "members_only"}` before any credit check or deduction. Frontend shows a bordered error card with `AlertCircle` icon and title "Members-Only Video". Whisper modal is suppressed for members-only URLs.
- **Dutch strings removed from VideoTab.tsx**: All duplicate-detection messages, confirmations, and library links replaced with English ("Je hebt dit transcript al" → "You already have this transcript in your library", "Bekijk in library" → "View in Library", "Toch extraheren" → "Extract anyway", "Annuleer" → "Cancel").
- **Members-only error card styling**: Consistent with other inline error states — `p-3 rounded-lg bg-destructive/10 border border-destructive/20` with `AlertCircle` icon, bold title, and message line.

### Whisper SSE / Real-Time Progress (Phase M)

- **Backend** (`backend/main.py`): `/api/transcribe/whisper` is now a `StreamingResponse` (`text/event-stream`). All blocking steps run via `asyncio.to_thread` so the event loop is not blocked. Emits newline-delimited JSON SSE events: `downloading` (yt-dlp starts), `transcribing` (Whisper API call starts), `saving` (credits deducted, packaging result), `complete` (with full transcript data), `error` (with `error` string and `code`). Members-only detection and credit pre-check logic unchanged.
- **Next.js route** (`src/app/api/transcribe/whisper/route.ts`): Auth and suspension checks remain as JSON responses. The backend SSE stream is piped directly to the client via `new Response(response.body, ...)` with `Content-Type: text/event-stream`.
- **Frontend** (`src/components/free-tool/VideoTab.tsx`): `consumeWhisperStream` helper parses the stream; `whisperStatus` state drives inline status messages ("Downloading audio from YouTube…", "Transcribing with Whisper AI…", "Saving transcript…") shown below the URL input. `isStreaming` state triggers a `beforeunload` guard via `useEffect`. Both `handleWhisperConfirm` and `handleWhisperUpsell` use the streaming path.
- **WhisperFallbackModal** (`src/components/free-tool/WhisperFallbackModal.tsx`): Updated to consume the SSE stream (no status display; returns complete/error event).

### Logging Verbosity Control

- `LOG_LEVEL` env var in `backend/.env` controls log output (`WARNING` in production, `INFO` for debug)
- yt-dlp verbose output suppressed by default (`quiet=True`, `verbose=False` in `audio_utils.py`)

### Tab Architecture (Phase H)

- **Pattern**: "Keep the Original" — 4 tabs (Original, Edited, AI Summary, Edited Summary)
- **Editor**: Tiptap with `immediatelyRender: false` for SSR compatibility
- **Persistence**: Edits saved to `edited_content` and `ai_summary.edited_html` columns
- **Deep-linking**: URL query parameter (`?tab=x`) for browser history support

### Rate Limiting (Phase 3)

| Tier | Limit | Scope |
|------|-------|-------|
| Anonymous | 10 req / 24h | IP-based |
| Free User | 50 req / 1h | User ID |
| Premium | Unlimited | `total_credits_purchased > 0` |

### Authentication (Phase 4)

- **Providers**: Email/Password + Google OAuth (Supabase Auth)
- **Session**: Server-Side Hydration (no flicker)
- **Security**: Rate limiting on login/signup, disposable email blocking
- **Onboarding**: Username/Role flow with 5 free welcome credits; double-claim prevention via `claim_welcome_reward` RPC (atomic check on `welcome_reward_claimed` field)

### Account Management (Phase 5)

- **Profile**: Username, role, email verification status
- **Security**: Password reset flow, change password in dashboard
- **History**: Full transaction audit log in Settings

### Analytics (Phase C)

- **PostHog** (Frontend): Pageviews, clicks, user identification
- **Tracked Events (Frontend)**: `signup_source`, `credits_purchased`, `transcript_extracted`
- **PostHog** (Backend): Implemented — Python FastAPI tracks all Whisper and credit events
- **Tracked Events (Backend)**: `whisper_started`, `whisper_completed`, `whisper_failed`, `credits_deducted`, `summarization_completed`

### Security (RLS Audit)

- **All 6 user tables** have strict Row Level Security
- **Credit mutations**: Exclusively via `deduct_credits_atomic` and `add_credits` RPCs
- **Service Role Key**: Confined to Python backend only
- **Suspended users**: `profiles.suspended` boolean enforced on all write-path API routes; admin can toggle via `/api/admin/suspend-user`

---

## 📦 Export Format & RAG Compatibility

### Current Export Formats

| Format | Fields | Use Case |
|--------|--------|----------|
| **TXT** | Plain text (with/without timestamps) | Reading, sharing |
| **JSON** | `[{text, duration, offset}, ...]` | Developer integration |
| **CSV** | `Start, Duration, Text` | Spreadsheet analysis |
| **SRT/VTT** | Standard subtitle format | Video editing |

### JSON Structure (Current)

```json
[
  { "text": "Hello world", "duration": 2.5, "offset": 0.0 },
  { "text": "Welcome to the video", "duration": 3.2, "offset": 2.5 }
]
```

- `offset`: Start time in seconds
- `duration`: Segment length in seconds
- Segments are granular (typically 2-5 seconds each)

### RAG Compatibility Assessment

**Current state**: NOT optimized for RAG pipelines.

| Requirement | Status | Notes |
|-------------|--------|-------|
| `start_time` / `end_time` per chunk | ⚠️ Partial | `offset` exists, `end_time` must be calculated |
| ~30s chunk intervals | ❌ Missing | Segments are 2-5s (too granular) |
| Semantic chunking | ❌ Missing | No sentence/paragraph boundaries |

**Future enhancement** (Parking Lot): RAG-optimized export with configurable chunk size (15s/30s/60s) and explicit `start_time`/`end_time` fields.

---

## ⚠️ PARTIALLY COMPLETE

### Dashboard Library

- **Grid/List views**: Complete
- **Search/Filter**: Basic search exists
- **Export UI**: Functional but could be improved
- **Batch operations**: Not implemented

---

## ❌ NOT BUILT YET

### ~~PostHog Backend Implementation~~

- Completed — see Analytics section above

### ~~Admin Dashboard~~

- Completed — see Admin Dashboard section above

### Whisper Language Support

- No language selector in UI
- Backend doesn't accept `language` parameter
- Whisper auto-detects, but explicit selection improves accuracy

### Timestamp/Chapter Generation

- Export formats have timestamps
- No auto-generation of YouTube-style chapters from transcripts

### Channel-Level Extraction

- Only single video and playlist extraction
- No "extract entire channel" feature

---

## 🐛 KNOWN ISSUES

- **SSL error on long Whisper videos**: `[SSL: UNEXPECTED_EOF_WHILE_READING]` — Railway proxy drops the connection during long audio downloads. Not yet fixed; affects videos over ~30 minutes.
- **Toast messages inconsistent**: Some success/error toasts appear alongside inline error cards, creating duplicate feedback. Cleanup deferred to the visual redesign phase.

---

## 🎨 DESIGN SYSTEM

### Current State: Utility Skin

The project uses a neutral utility skin (April 2025) replacing the previous Starlight/Midnight design system.

**Active tokens** (in `globals.css`):
- Background: `#f8f9fa` (light) / `#111111` (dark)
- Surface: `#ffffff` (light) / `#1a1a1a` (dark)
- Accent: `#2563eb` (both modes)
- Border radius: `6px`

**Deprecated**:
- Starlight/Midnight color system
- OKLCH color functions
- Glassmorphism effects
- `.cline/skills/indxr-design/` skill (references old system)

**Planned**: Full visual redesign post-launch (Linear/Notion-inspired aesthetic).

---

## 🚀 PRE-DEPLOYMENT CHECKLIST

### Critical — Before Production Launch

**Stripe Live Mode:**
- [ ] Add KVK details in Stripe Dashboard (EU verification)
- [ ] Replace test API keys with live keys
- [ ] Update webhook endpoint to production URL
- [ ] Test live payment with real card
- [ ] Verify webhook signature validation in production

**Supabase Security:**
- [ ] Re-enable email verification (currently disabled — must enable before launch)
- [ ] Test OAuth redirect URLs on production domain
- [ ] Backup database before launch

**Infrastructure:**
- [ ] Set all environment variables in Vercel
- [ ] Verify IPRoyal proxy credentials (password has confusable `I`/`l`)
- [ ] Fill in `STRIPE_WEBHOOK_SECRET` in Vercel — currently set but empty; required for live webhook signature validation
- [ ] Configure Upstash Redis: add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel environment variables — rate limiting is currently disabled (app falls back to `noopLimiter` automatically)
- [ ] Test rate limiting in production (after Upstash is configured)
- [ ] Run `npm audit`

**Security:**
- [ ] Add `BACKEND_API_SECRET` shared header between Vercel and Railway — the Railway backend currently has no authentication; any client that knows the Railway URL can call the API directly

**PostHog:**
- [ ] Verify event tracking in production
- [ ] Configure session replay retention (GDPR)

---

## 🎯 IMMEDIATE PRIORITIES

1. **Email Verification** — Re-enable before launch
2. **Stripe Go-Live** — Switch to live keys, verify webhooks
3. **Database Backup** — Document PITR settings
4. **UI Redesign** — Planned post-launch, not a blocker

### Backend Timeout Reference

| Setting | Value | File |
|---------|-------|------|
| Whisper API (`httpx.Client`) | 600s | `backend/whisper_client.py` |
| yt-dlp `socket_timeout` | 120s | `backend/audio_utils.py` |
| Storage display limit (`MAX_MB`) | 500 MB | `src/components/app-sidebar.tsx` (display only, no enforcement) |
