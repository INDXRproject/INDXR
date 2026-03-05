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

## 🎯 Current Focus: Playlist Whisper Testing (Completed)

**Goal:** Verify Whisper re-extraction works within playlist context.

**Tasks:**

- [x] Test Whisper re-extraction on individual videos within a playlist
- [x] Confirm credit cost display works and upfront pre-flight check blocks extraction on insufficient funds
- [x] Confirm navigation guard fires correctly in playlist context
- [x] Fix specific bugs: Video title parsing, clean availability state on re-fetch, silence/no-speech amber badge handling

---

## 🔮 Future Phases

### Phase F: Commercialization & Security (Launch Blockers)

**Goal:** Ensure the app can monetize securely before real users join.

- [ ] **Stripe Payments**: Implement checkout flow and secure webhooks. Hard blocker; no business without payments.
- [ ] **Supabase RLS Audit**: Security check to guarantee strict data isolation (User A cannot see User B data). Watertight requirement.
- [ ] **PostHog Implementation (Backend)**: Expand existing frontend PostHog to the backend. Serves as single tool for analytics AND error tracking (replaces Sentry). Get visibility from Day 1.

### Phase G: Product Value Expansion

**Goal:** Add high-value AI features for retention before the final visual overhaul.

- [ ] **AI Summarization**: Button in Library ("Samenvatten"). Generates summaries + action points using cheap models (gpt-4o-mini/claude-haiku). Biggest value-add.
- [ ] **Whisper Language Support**: Detect and select languages directly in the UI. Small frontend addition, huge UX win.
- [ ] **Timestamp & Chapter Generation**: Button in Library to auto-generate YouTube-style chapters from transcripts.

### Phase H: Polish, Operations, and Launch (Q2 2025)

**Goal:** Final visual coat of paint, system observation, and deployment.

- [ ] **UI Redesign / Overhaul**: Full visual redesign inspired by Linear/Notion. Consciously postponed until features are complete, but mandatory before launch.
- [ ] **Admin Dashboard**: Live overview of accounts, usage, and credits. Required to support live users.
- [ ] **Database Backups**: Confirm and strictly document Supabase Point-in-Time Recovery settings.
- [ ] Load Testing & Production Deploy (Vercel + Railway)
- [ ] Switch Stripe & IPRoyal to live/production credentials
