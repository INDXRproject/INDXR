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

### Phase E: Whisper AI Pipeline (Mar 2025) ✅

- Two-step audio pipeline (yt-dlp + ffmpeg subprocess)
- iOS player client to bypass PO Token restrictions
- IPRoyal proxy integration
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
- [ ] **Stripe Go-Live**: Switch to live keys, verify webhook in production
- [ ] **Database Backups**: Document Supabase PITR settings

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
- **Railway Deno Runtime**: Railway does not have deno pre-installed. Add to Railway build or Dockerfile:
  ```bash
  curl -fsSL https://deno.land/install.sh | sh
  export DENO_INSTALL=/root/.deno
  export PATH=$DENO_INSTALL/bin:$PATH
  ```
  Or set `DENO_PATH` environment variable in Railway dashboard pointing to the deno binary location after install.

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
