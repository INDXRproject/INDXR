# Project Status

- ✅ **Phase B**: Stripe Payments (test mode working, packages: €4.99/50cr, €9.99/120cr, €24.99/350cr)
- ✅ **Phase C**: PostHog Analytics (tracking: signup_source, credits_purchased, transcript_extracted)
- ✅ **Phase G**: AI Summarization (DeepSeek V3 integration, 1cr cost)
- ✅ **Phase H**: Transcript Tab Architecture (Original vs Edited pattern)
- ✅ **Phase D**: UI Polish & Design System (Complete)

## ✅ COMPLETED FEATURES

### Dashboard Library (Phase D.3 - COMPLETE)

- **State**: Fully refactored with Grid/List views.
- **Functionality**: Responsive card layout, search, empty states.
- **Design**: Verified mobile responsiveness and dark mode.

### Analytics & Monitoring

- **PostHog Integration**: Fully implemented on frontend (`posthog-js`) and Next.js server (`posthog-node`). **Not** implemented on Python FastAPI backend.
- **Tracked Events**:
  - `signup_source` (google/email)
  - `credits_purchased` (server + client-side tracking)
  - `transcript_extracted` (video/playlist, youtube/whisper)
- **Conversion Funnel**: Signup → First extraction → Credit purchase

### 1. Account Management (Phase 5 - COMPLETE)

- **Identity**: Profile management (`profiles` table) with username/role.
- **Security**:
  - Forgot Password Flow (Email Link -> Reset).
  - Change Password (Secure Dashboard UI).
  - Email Verification Status & Resend Logic.
- **History**: Full transaction audit log (`credit_transactions`) visible to user.
- **UX**: High-contrast "Apple-like" design with consistent button styling.

### 2. Authentication (Phase 4 - COMPLETE)

- **Providers**:
  - Email/Password (Supabase Auth).
  - Google OAuth (One-click login).
- **Security**:
  - **No-Flicker Session**: Server-Side Hydration (Root Layout).
  - **Rate Limiting**: Custom Upstash limiter on Login/Signup (5-10 req/hr).
  - **Disposable Email**: Blocked via `isDisposableEmail` utility.
- **Onboarding**:
  - Dedicated flow for new users to set Username/Role.
  - "Welcome Reward": Atomic transaction giving 5 free credits.

### 3. Core Extraction (Phase 1-2 - COMPLETE)

- **Single Video**: YouTube captions (XML/Text) extraction.
- **Playlist**: Full playlist extraction with video selection.
  - Credit pre-flight check: upfront check on `needs_whisper` videos, button shows exact cost, blocked if insufficient credits.
  - Correct video titles passed to library, clean availability screen on re-fetch.
  - Silence/no-speech detection with clear amber failure badge inline.
- **Audio Upload**: Manually upload `.mp3` etc. (< 25MB) to transcribe via Whisper. Fully verified and working.
- **Duplicate Detection**:
  - Composite key (`video_id` + `processing_method`) prevents cross-method false positives.
  - In-memory session tracking (`useRef<Set>`) for instant same-session duplicate catching.
  - Blocking UI prompt on extraction: "Toch extraheren" of "Bekijk in library" (voorkomt ongewenste aftrek credits).
- **Whisper AI**: ✅ Fully working end-to-end:
  - Two-step audio pipeline: yt-dlp downloads audio-only stream via IPRoyal proxy, ffmpeg converts separately to 16kHz mono 32kbps MP3
  - Format selector prioritizes `m4a` stream (iOS client native format), locked to audio-only.
  - YouTube 403 / Proxy Split fix: `extractor_args` explicitly requests `ios` (and `web_embedded`) player client to bypass the GVS PO Token requirement that breaks Android clients when no JS runtime is present.
  - PO Token UX: Specific frontend error shown for un-bypassable YouTube restrictions ("152" / "unavailable") directing users to manual upload.
  - Credit pre-check: frontend displays exact cost inline before user clicks (formula: `Math.ceil(duration_seconds / 600)`)
  - Navigation guard: `beforeunload` event listener prevents accidental tab close during extraction
  - Credit deduction: atomic RPC (`deduct_credits_atomic`) with pre-check
- **AI Summarization (Phase G - COMPLETE)**:
  - Integration with DeepSeek V3 (`deepseek-chat`).
  - Summarizes original transcript text into key paragraphs and action points.
  - Credit-aware: 1 credit per summary with atomic deduction and failure refund.
  - Formatted output: Restored support for bullet points and ordered lists within Tiptap.

### 4. Tab Architecture Reform (Phase H - COMPLETE)

- **Pattern**: Implemented "Keep the Original" pattern for all transcripts and summaries.
- **Tabs**: Dynamically serves up to 4 tabs (Original, Edited, AI Summary, Edited Summary).
- **Security**: Strictly read-only modes for "Original" tabs once edits exist, preventing accidental data loss or unauthorized modifications.
- **UX**: URL query parameter deep-linking (`?tab=x`) for browser history support.

### 5. Rate Limiting (Phase 3 - COMPLETE)

- **Three-tier system**:
  - **Anonymous**: 10 requests / 24 hours (IP-based).
  - **Free User**: 50 requests / 1 hour (User ID).
  - **Premium**: Unlimited (Bypassed if `total_credits_purchased > 0`).

---

## ⚠️ PARTIALLY COMPLETE

### Dashboard Library

- **State**: Scaffolding exists at `/dashboard`.
- **Functionality**: Users can view saved lists (Partial).
- **Needs**: Search/Filter, better Export UI.

---

## ❌ NOT BUILT YET

### Stripe Payments

- **Integration**: Complete Stripe checkout flow needs to be built before launch.
- **Packages**: Starter (€4.99/50cr), Regular (€9.99/120cr), Power (€24.99/350cr).
- **Webhooks**: Handling `checkout.session.completed` to assign credits via RPC safely.

### Admin Dashboard

- **Operations**: Live overview of all accounts, usage, and credits. No internal tool to view user stats or ban abusers yet.

### System Infrastructure

- **Error Tracking & Analytics**: PostHog Backend implementation needed. Will act as the single source for both product analytics and error tracking (Sentry / Google Analytics are explicitly excluded).
- **Database Backups**: Automated Supabase backups (Point-in-Time Recovery) strategy needs confirmation.
- **Supabase Security (RLS)**: Row Level Security policies have been rigorously checked and implemented for all user tables. ✅

---

## 🔍 NEXT STEPS (Planned Features)

1.  **Redesign / UI Overhaul**: Full visual redesign (postponed but mandatory before launch).
2.  **Whisper Language Support**: Detect and select languages directly in the UI.
3.  **Timestamp & Chapter Generation**: Button in Library to auto-generate YouTube-style chapters based on transcripts. Logic to mirror the AI Summarization flow.

## 🚀 PRE-DEPLOYMENT CHECKLIST

### Critical - Before Production Launch:

**Stripe Live Mode:**

- [ ] Add KVK details in Stripe Dashboard (required for EU business verification)
- [ ] Replace test API keys with live keys in .env.local
- [ ] Update webhook endpoint to production URL
- [ ] Test live payment with real card (small amount)
- [ ] Verify webhook signature validation works in production

**PostHog Production:**

- [ ] Verify event tracking in production environment
- [ ] Set up alerts for critical errors (payment failures, credit bugs)
- [ ] Configure session replay retention (GDPR compliance)
- [ ] Test funnel analysis with real user data

**Supabase Security:**

- [ ] Re-enable email verification (currently disabled for testing)
- [ ] Verify RLS policies on all tables (transcripts, user_credits, profiles)
- [ ] Test OAuth redirect URLs in production domain
- [ ] Backup database before launch

**General:**

- [ ] Set all environment variables in Vercel production
- [ ] Test rate limiting in production (Upstash Redis)
  - [ ] Verify IPRoyal proxy credentials in backend `.env` (note: password contains capital `I` and lowercase `l` — easy to confuse)
- [ ] Run security audit (npm audit, dependency check)

---

## 🎨 DESIGN SYSTEM IMPLEMENTATION STATUS

### ✅ What's Actually Implemented (Phase D)

#### Foundation Layer (D.1)

- OKLCH color palette in globals.css (light + dark mode)
- SF Pro Display font via CDN (400/500/600 weights)
- Theme toggle (sun/moon icon in navbar)
- Waveform logo component
- All pages respond to theme switching
- **Design System Defined**: Formalized tokens and patterns defined in `.agent/skills/indxr-design/` (Midnight/Starlight).

#### Component Layer (D.2)

- Button: hover states, active scale, cursor pointer
- Input: purple focus rings, transitions
- Card: base structure + hover on interactive cards
- CreditBalance: sky blue pill, clickable
- LoadingSkeleton: animated placeholders
- EmptyState: "no content" component
- PricingCard: featured badge, hover effects

#### Page Redesigns (D.3)

- ✅ Homepage: responsive hero, feature cards, persona grid, testimonials, and **HeroUIPreview** app mockup.
- ✅ Transcript Generator: tabs, inputs, export menu
- ✅ Dashboard Transcribe: same as generator
- ✅ Library: 3-column grid, transcript cards
- ✅ Settings: card sections, transaction table
- ✅ Pricing: 3 tiers with featured badge
- ✅ Login/Signup: centered layout, OAuth buttons

#### Pages NOT Redesigned

- ❌ FAQ
- ❌ Onboarding
- ❌ Forgot Password
- ❌ Billing Success/Cancel

### ⚠️ Known Issues & Gaps

#### Low Priority / Non-Blocker Gaps

1. **YouTube PO Token Enforcement**: Whisper upsell fails on videos with GVS PO Token enforcement.
   - _Temporary fix_: Force `ios` player client.
   - _Structural fix_: Install `yt-dlp-pot-bgutil-http` plugin (requires Node.js on Railway). Can wait, not a launch blocker.
2. **Frontend Credit Estimation (UX)**: Bij video's zonder captions toont de frontend "1 credit" schatting vóór de download. Werkelijke kosten (gebaseerd op exacte audioduur) pas bekend ná de audio download. Low priority UX issue.
3. **Error states inconsistent** - No unified Alert/Toast pattern (will be solved during UI Redesign).
4. **Loading states missing** - Some actions show blank screens during fetching.

#### Component Gaps

- Badge: only default variant (need success/warning/info)
- Select/Checkbox/Radio: not styled
- Toast: not consistently designed
- Dialog: basic animations, not smooth

#### Mobile/Accessibility

- Responsive tables need card view on mobile
- Some touch targets may be <44px
- Dark mode contrast needs audit
- Keyboard navigation inconsistent

### 📊 Component Status

| Component | Styled | All Variants | Mobile OK | Notes                     |
| --------- | ------ | ------------ | --------- | ------------------------- |
| Button    | ✅     | ⚠️           | ✅        | Missing icon-only variant |
| Input     | ✅     | ✅           | ✅        | Good                      |
| Card      | ✅     | ⚠️           | ✅        | Only interactive variant  |
| Badge     | ⚠️     | ❌           | ✅        | Need color variants       |
| Select    | ❌     | ❌           | ❌        | Not styled                |
| Checkbox  | ❌     | ❌           | ❌        | Not styled                |
| Progress  | ⚠️     | ❌           | ✅        | Basic only                |
| Toast     | ❌     | ❌           | ❌        | Not implemented           |

### 📋 Page Status

| Page         | Redesigned | Mobile Tested | Issues                         |
| ------------ | ---------- | ------------- | ------------------------------ |
| Homepage     | ✅         | ✅            | HeroUIPreview hidden on mobile |
| Generator    | ✅         | ⚠️            | Needs device testing           |
| Library      | ✅         | ⚠️            | Empty state works              |
| Settings     | ✅         | ⚠️            | Table needs card view          |
| Pricing      | ✅         | ⚠️            | Cards stack correctly          |
| Login/Signup | ✅         | ⚠️            | Forms full-width               |
| FAQ          | ❌         | ❌            | Not started                    |
| Onboarding   | ❌         | ❌            | Not started                    |

---

## 🎯 IMMEDIATE PRIORITIES (Based on Roadmap)

We are consciously deferring the UI Redesign until the core business blocks and differentiating AI features are built.

1. **Stripe Payments**: Hard blocker. Zonder betalingen geen business. _(Checkout geïmplementeerd, webhooks te testen na deploy)_
2. **Whisper Language Support**: Detect and select languages in the UI.
3. **Timestamp & Chapter Generation**: Logische iteratie na AI Summarization.
4. **UI Redesign / Overhaul**: Full visual redesign (Linear/Notion stijl).
5. **PostHog Backend Implementatie**: Eén tool voor analytics én error tracking.
6. **Admin Dashboard**: Om gebruikers gedrag en credits op te volgen.
   - [IMPORTANT] Gebruik `delete_user_cascade` RPC voor user verwijdering.
7. **Database Backups Bevestigen**: Point-in-Time Recovery documenteren.

_(Notitie: Sentry en Google Analytics zijn bewust geschrapt; PostHog vangt deze Use Cases op)._
