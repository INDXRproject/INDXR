# Development Roadmap

## ✅ Completed Phases

- **Phase A**: Authentication Enhancement (Jan 2025) ✅
- **Phase C**: Error Handling & Analytics (Jan 2025) ✅
- **Phase D**: UI Polish & Design System (Feb 2025) ✅
- **Phase E (partial)**: Whisper AI end-to-end (Mar 2025) ✅

### Whisper AI — Completed (Mar 2025)

- ✅ Two-step audio pipeline (yt-dlp + ffmpeg subprocess) — eliminates proxy split / 403
- ✅ Format selector locked to audio-only streams (no accidental video download)
- ✅ IPRoyal proxy consistently applied to yt-dlp download step
- ✅ Credit cost displayed inline on button before user clicks
- ✅ Navigation guard (`beforeunload`) + double-click prevention
- ✅ Credit pre-check and atomic deduction on backend
- ✅ YouTube captions `duration` returned from `/api/extract` and forwarded by Next.js route

---

## 🎯 Current Focus: Phase G - AI Summarization

**Goal:** Add high-value AI features for retention before the final visual overhaul. This is the biggest UX differentiator before launch.

**Tasks:**

- [ ] Implement AI Summarization using DeepSeek V3 (`deepseek-chat` via `api.deepseek.com`). Button in Library ("Samenvatten"). Generates summaries + action points.

---

## 🔮 Future Phases

### Phase F: Commercialization & Security (Launch Blockers)

**Goal:** Ensure the app can monetize securely before real users join.

- [ ] **Stripe Payments**: Implement checkout flow and secure webhooks. Hard blocker; no business without payments.
      _Note: Checkout flow implemented and tested. Webhook credit assignment pending — will be verified after Railway deployment._
- [x] **Supabase RLS Audit**: Security check to guarantee strict data isolation (User A cannot see User B data). Watertight requirement. ✅

### Phase G: Product Value Expansion

**Goal:** Add high-value AI features for retention before the final visual overhaul.

- [ ] **AI Summarization**: Button in Library ("Samenvatten"). Generates summaries + action points using cheap models (gpt-4o-mini/claude-haiku). Biggest value-add.
- [ ] **Whisper Language Support**: Detect and select languages directly in the UI. Small frontend addition, huge UX win.
- [ ] **Timestamp & Chapter Generation**: Button in Library to auto-generate YouTube-style chapters from transcripts.

### Phase H: Polish, Operations, and Launch (Q2 2025)

**Goal:** Final visual coat of paint, system observation, and deployment.

- [ ] **PostHog Implementation (Backend)**: Expand existing frontend PostHog to the backend. Serves as single tool for analytics AND error tracking (replaces Sentry).
      _Note: PostHog backend tracks feature usage, but the AI features (summarization, chapters) don't exist yet. Tracking empty events has no value. After the UI Redesign, the feature set is stable and we'll know exactly which events matter._
- [ ] **UI Redesign / Overhaul**: Full visual redesign inspired by Linear/Notion. Consciously postponed until features are complete, but mandatory before launch.
- [ ] **Admin Dashboard**: Live overview of accounts, usage, and credits. Required to support live users.
      _Note: Delete User feature: do NOT use Supabase's built-in delete — it fails due to foreign key constraints. Build a delete_user_cascade(user_id uuid) RPC that deletes in order: credit_transactions → user_credits → transcripts → collections → profiles → auth.users._
      _Note: Email templates: after UI redesign, add custom branded email templates in Supabase for: account creation confirmation, password reset, email verification. Templates should match INDXR.AI visual identity._
- [ ] **Database Backups**: Confirm and strictly document Supabase Point-in-Time Recovery settings.
- [ ] Load Testing & Production Deploy (Vercel + Railway)
- [ ] **Stripe Go-Live Checklist**:
  - [ ] Add KVK details in Stripe Dashboard (required for EU verification)
  - [ ] Switch Stripe & IPRoyal to live/production credentials
  - [ ] Update webhook endpoint to production URL in Stripe Dashboard
  - [ ] Test a live payment with a real card (small amount)

---

### Future Considerations / Parking Lot

- **BYOK (Bring Your Own Key) + markup model**: users can plug in their own OpenAI/Anthropic/etc API key for AI features, or use our default cheap model (DeepSeek). Stripe's new LLM token billing (currently private preview) could handle automatic cost pass-through + markup. Build when: (1) Stripe token billing exits preview, (2) we have validated demand from paying users.
