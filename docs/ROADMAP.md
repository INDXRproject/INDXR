# Development Roadmap

## ✅ Completed Phases

### Phase A: Authentication Enhancement (Jan 2025) ✅

- Email/Password + Google OAuth
- Server-Side Hydration (no-flicker sessions)
- Rate limiting on auth endpoints
- Disposable email blocking
- Onboarding flow with welcome credits

### Phase B: Stripe Payments (Feb 2025) ✅

- Checkout flow with 3 packages (Starter/Regular/Power)
- Webhook handler for `checkout.session.completed`
- Secure credit assignment via `add_credits` RPC
- Server-side PostHog tracking on purchase

### Phase C: Analytics (Feb 2025) ✅

- PostHog frontend integration
- Event tracking: `signup_source`, `credits_purchased`, `transcript_extracted`
- User identification tied to Supabase user ID

### Phase D: UI Polish (Feb 2025) ✅

- Dashboard Library grid/list views
- Component styling (buttons, inputs, cards)
- Theme toggle (light/dark mode)
- Responsive layouts

### Phase E: AI Transcription Pipeline (Mar 2025) ✅

- Two-step audio pipeline (yt-dlp + ffmpeg subprocess → AssemblyAI)
- iOS + web_embedded player clients; bgutil-pot Rust binary provides GVS PO tokens
- IPRoyal proxy integration with sticky session (IP-consistent CDN downloads)
- Node.js installed in Docker for yt-dlp-ejs n-challenge solving
- Credit pre-check and atomic deduction
- Navigation guard (beforeunload)

### Phase G: AI Summarization (Mar 2025) ✅

- DeepSeek V3 integration (`deepseek-chat`)
- JSON output with summary + action points
- 1-credit cost with failure refund
- Markdown/HTML formatting support

### Phase H: Transcript Tab Architecture (Mar 2025) ✅

- "Keep the Original" pattern (4 tabs)
- Tiptap editor with SSR compatibility
- URL-based tab navigation
- Edited content persistence

---

## 🔮 Current & Future Phases

### Phase M: Whisper SSE / Real-Time Progress ✅ (superseded by Phase N)

- SSE architecture was implemented then replaced by background job polling to eliminate Vercel timeout constraints.

### Phase N: Whisper Background Job Architecture ✅

**Goal**: Decouple the Whisper transcription from the HTTP request lifecycle so long-running jobs (30–180 seconds) cannot be killed by Vercel's function timeout. Job state persisted in Supabase — Railway-restart resilient.

- [x] **`backend/main.py`**: POST returns `{"job_id", "status": "pending"}` immediately; background task `run_whisper_job` runs the full pipeline and updates **Supabase `whisper_jobs` table**; GET `/api/jobs/{job_id}` queries Supabase with ownership check
- [x] **Job timing**: `started_at`, `completed_at`, `processing_time_seconds` written per job
- [x] **Truncation detection**: Gap > 60s between audio duration and last transcript segment triggers amber warning banner on frontend; job still marked complete
- [x] **Opus codec**: Audio compressed to 12kbps mono Opus/OGG (replaces MP3); handles ~5 hours within 25MB
- [x] **Whisper timeout**: 1800s (`httpx.Client`)
- [x] **`src/app/api/transcribe/whisper/route.ts`**: Returns `{ job_id, status }` JSON directly; `maxDuration` 60s; rate limiting added
- [x] **`src/app/api/jobs/[job_id]/route.ts`**: Auth check, suspended check, forwards GET to Railway with `?user_id` query param
- [x] **`src/components/free-tool/VideoTab.tsx`**: `pollWhisperJob` polls every 3s; refs-based interval prevents stale job_id bug; "Check" button label; processing estimate in confirm modal; 90-min risk warning; elapsed timer; amber/green success banner
- [x] **`src/components/free-tool/AudioTab.tsx`**: Rewritten to use polling instead of SSE
- [x] **`src/components/free-tool/WhisperFallbackModal.tsx`**: Replaced SSE reader with 3-second polling loop
- [x] **CORS**: Production domains added to Railway backend
- [x] **Stripe**: Suspended user check added to `/api/stripe/checkout`
- [x] **Transcripts**: `video_id` and `title` now saved in `transcripts` insert

### Phase O: AssemblyAI Integration ✅

**Goal**: Replace OpenAI Whisper API with AssemblyAI Universal-3 Pro to eliminate truncation, reduce cost, and improve speed.

- [x] Retain yt-dlp audio download pipeline; upload file to AssemblyAI instead of OpenAI
- [x] Benefits: no token-limit truncation, 3–5× faster turnaround, 42% cheaper ($0.21/hr vs $0.36/hr), no 25MB file size limit
- [x] `assemblyai_client.py` created; models `["universal-3-pro", "universal-2"]`; word-level timestamps → ~5s segments
- [x] `processing_method: 'assemblyai'` and `duration` and `character_count` now saved in `transcripts` insert
- [x] Frontend duplicate-insert bug fixed: `onTranscriptLoaded()` removed from AudioTab; backend is sole writer; `indxr-library-refresh` CustomEvent dispatched instead
- [x] Verified working at: 11 min, 22 min, 54 min, 113 min, 148 min, 214 min
- [x] Direct browser→Railway audio upload with JWT auth — bypasses Vercel 4.5MB body limit; preflight endpoint handles rate limiting; 500MB max
- [x] `whisper_jobs` table renamed → `transcription_jobs`; added `file_size_bytes`, `file_format`, `processing_time_seconds` columns
- [x] AudioTab light-mode UI fixed (theme-aware Tailwind classes); live elapsed timer during job

**Tech debt remaining**:
- 90-min warning in Whisper confirmation modal references old OpenAI limitations — should be removed

### Phase F: Commercialization & Admin (Q2 2025) — Partially Complete

**Goal**: Launch-ready operations and monitoring.

- [x] **Admin Dashboard**: Protected `/admin` route — overview, user management, credits, transcripts, paid-users
  - User management: list accounts, view credit balance, suspend/unsuspend, delete
  - Credit management: manually add credits, full transaction log
  - **IMPORTANT**: Deletions use `delete_user_cascade(user_id)` RPC (FK constraints)
  - Protected by `ADMIN_EMAIL` env var in middleware
- [x] **Suspended User Enforcement**: `profiles.suspended` boolean checked on all write-path API routes
- [x] **Welcome Bonus Double-Claim Prevention**: Atomic `claim_welcome_reward` RPC + server-side pre-check
- [x] **Playwright E2E Test Suite**: 29 tests across 4 spec files; global setup auto-tops-up test accounts to ≥ 50 credits; metrics logged per run
- [ ] **Email Verification**: Re-enable (currently disabled for testing)
- [ ] **Stripe Go-Live**: Switch to live keys, verify webhook in production; fill in `STRIPE_WEBHOOK_SECRET` in Vercel (currently empty)
- [ ] **Database Backups**: Document Supabase PITR settings
- [ ] **Rate Limiting**: Configure Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel) — currently disabled, app falls back to `noopLimiter`
- [ ] **Backend Auth**: Add `BACKEND_API_SECRET` shared header between Vercel and Railway — Railway endpoint is currently unauthenticated

### Phase I: SEO & Content Foundation (Q2 2025) ✅

**Goal**: Organic traffic acquisition through content and SEO.

- [x] **SEO Landing Pages** (8 pages built):
  - `/youtube-transcript-generator` (primary)
  - `/youtube-to-text`
  - `/bulk-youtube-transcript`
  - `/youtube-transcript-downloader`
  - `/youtube-transcript-without-extension`
  - `/youtube-srt-download`
  - `/youtube-playlist-transcript`
  - `/audio-to-text`
- [x] **FAQ Page**: Schema markup for Google rich results
- [x] **Sitemap**: `sitemap.ts` auto-generates XML sitemap
- [x] **Footer**: Resource links across all pages
- [x] **Competitor Alternative Pages**: `/alternative/downsub`, `/alternative/tactiq`
- [ ] **Blog Infrastructure**: MDX or CMS integration for content marketing

### Phase J: AI Feature Expansion (Q3 2025)

**Goal**: Differentiate with AI-powered features.

- [ ] **Whisper Language Support**: UI selector + backend `language` param
- [ ] **Timestamp/Chapter Generation**: Auto-generate YouTube-style chapters
- [ ] **Smart Search**: Search within transcripts using embeddings

### Phase K: Visual Redesign (Q3 2025)

**Goal**: Replace utility skin with premium design.

- [ ] **Design System**: Linear/Notion-inspired aesthetic
- [ ] **Component Library**: Fully styled variants for all components
- [ ] **Motion Design**: Purposeful animations (not decorative)
- [ ] **Mobile Optimization**: Touch targets, responsive tables

### Phase L: Scale & Enterprise (Q4 2025)

**Goal**: Handle growth and enterprise customers.

- [ ] **API Access**: REST API for developers with rate limits
- [ ] **Team Features**: Shared workspaces, team billing
- [ ] **Usage Analytics**: Detailed dashboards for power users

---

## 🅿️ Parking Lot (Future Considerations)

Ideas validated but not prioritized:

### Content Features

- **Channel-Level Extraction**: Extract all videos from a YouTube channel
- **Batch Processing UI**: Select multiple videos from search results
- **Collection Folders**: Organize transcripts into projects

### Export & Integration

- **RAG-Optimized JSON Export**: Configurable chunk size (15s/30s/60s) with explicit `start_time`/`end_time`
- **Notion Integration**: Direct export to Notion pages
- **Obsidian Integration**: Export as linked markdown notes
- **Zapier/Make Webhooks**: Automation triggers on new transcripts

### Monetization

- **BYOK (Bring Your Own Key)**: Users provide their own OpenAI/Anthropic API keys
- **Subscription Tiers**: Monthly plans alongside credit packs
- **Pricing Calculator**: Interactive tool on homepage
- **Affiliate Program**: Revenue share for referrals

### Developer Experience

- **Public API**: REST endpoints with API key auth
- **Webhook Notifications**: Real-time updates on transcript completion
- **SDK Libraries**: Python, JavaScript, Go clients

### Infrastructure

- **Custom Email Templates**: Branded transactional emails (Supabase)
- **Multi-Region Deployment**: EU + US hosting options

### Phase Q: Pre-Launch Validation & Launch

**Goal**: Validate all user flows under real conditions, resolve remaining tech debt, and go live.

**Testing & QA**
- [ ] Free tool vs logged-in limits testing — Playwright automation covering rate limits, credit gates, and anonymous vs authenticated flows
- [ ] Audio upload + AssemblyAI stress test — multiple concurrent uploads, large files, edge-case formats
- [ ] 4+ hour video stress test — confirm no regression on very long content

**Product**
- [ ] JSON output: research 30-second chunk format for content creators; implement configurable chunk size with explicit `start_time`/`end_time` fields
- [ ] `INTERACTION_MAP.md`: full audit of all user flows; standardize all error and success messages across VideoTab, AudioTab, and Whisper modals

**Growth**
- [ ] Google Analytics / Search Console setup and verification
- [ ] Google Ads account setup — US market, long-tail keywords (e.g. "youtube transcript generator", "transcribe youtube video")

**Admin & Observability**
- [ ] Admin dashboard: add processing times, error rates, and success ratios per time window

**Tech Debt**
- [ ] iOS PO token for bgutil — currently only `web_embedded` client receives PO tokens; iOS client bypasses the flow entirely but may need tokens in future yt-dlp versions
- [x] Random session ID per job — `get_proxy_url(session_id)` now uses `job_id[:8]`; falls back to `secrets.token_hex(4)` for one-off requests
- [x] Rename `processing_method: 'whisper_ai'` → `assemblyai` — done; `transcription_jobs` table renamed from `whisper_jobs`; `character_count` added to transcript insert

**Infrastructure & Go-Live**
- [ ] Stripe live keys — switch from test to live, verify webhook, fill `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Email verification — re-enable in Supabase (currently disabled for testing)
- [ ] Configure Upstash Redis for rate limiting (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel)
- [ ] Add `BACKEND_API_SECRET` shared header between Vercel and Railway
- [ ] Go live 🚀

---

## 📝 Notes

### Deprecated Items

The following have been explicitly removed or deprecated:

- **Sentry**: Error tracking handled by PostHog
- **Google Analytics**: Replaced by PostHog
- **Starlight/Midnight Design System**: Replaced by utility skin (April 2025)
- **`.cline/skills/indxr-design/`**: References deprecated design system

### Design Decision: Utility Skin

As of April 2025, the project uses a neutral utility skin:
- Background: `#f8f9fa` (light) / `#111111` (dark)
- Accent: `#2563eb`
- Border radius: `6px`

This is intentionally minimal — a "holding design" that will be replaced wholesale during Phase K.
