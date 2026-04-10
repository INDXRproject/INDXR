# Development Guide

## Local Development Setup

### Frontend (Next.js)

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

Environment file: `.env.local` (see ARCHITECTURE.md for full key list). Additional keys needed for admin features:

```
ADMIN_EMAIL=your@email.com           # Protects /admin routes via middleware
NEXT_PUBLIC_POSTHOG_PROJECT_ID=...   # Admin PostHog deep-links (paid-users page)
```

---

### Backend (FastAPI + Python)

The backend must be started **manually** — it is not managed by Next.js.

```bash
cd backend
venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> **Add `--reload`** so the server picks up code changes automatically.

The backend must be running for:

- `/api/extract` — YouTube caption extraction
- `/api/summarize` — AI Summarization via DeepSeek V3
- `/api/transcribe/whisper` — Whisper AI re-extraction (YouTube fallback)
- `/api/transcribe/whisper` with `source_type=upload` — Audio file upload transcription
- All playlist-related endpoints

---

## Deployment

### Railway (Backend)

The Python backend is deployed on Railway at https://indxr-production.up.railway.app.

- **Dockerfile**: `backend/Dockerfile` (Python 3.12-slim with ffmpeg, unzip, Deno)
- **Auto-deploy**: Every push to `master` triggers a Railway rebuild — no manual steps needed
- **Service variables** (set in Railway dashboard): `RAILWAY_DOCKERFILE_PATH=/backend/Dockerfile`, `NO_CACHE=1`, `DENO_PATH=/root/.deno/bin`, `ASSEMBLYAI_API_KEY=<your key>`
- **Deno inside Railway container**: installed at `/root/.deno/bin` — `DENO_PATH` is already set as a Railway service variable

**To update yt-dlp or any Python package and redeploy:**

```bash
cd backend
venv/bin/pip install --upgrade yt-dlp
venv/bin/pip freeze > requirements.txt
git add backend/requirements.txt
git commit -m "chore: upgrade yt-dlp"
git push
```

Railway will detect the push and rebuild automatically.

### Vercel (Frontend)

The Next.js frontend is deployed on Vercel at https://indxr.ai.

- **Vercel account**: contact@indxr.ai (old sinbadthesyncer account deleted)
- **GitHub connection**: INDXRproject/INDXR, branch `master`
- **Auto-deploy**: Every push to `master` triggers a Vercel deployment
- **Key environment variables** (set in Vercel dashboard): `PYTHON_BACKEND_URL=https://indxr-production.up.railway.app`, `NEXT_PUBLIC_APP_URL=https://indxr.ai`
- **DNS**: `indxr.ai` points to `76.76.21.21` (Vercel)

---

## Proxy Configuration (IPRoyal)

The backend routes all yt-dlp requests through an IPRoyal residential proxy.

Credentials are stored in `backend/.env`:

```
PROXY_HOST=geo.iproyal.com
PROXY_PORT=12321
PROXY_USER=RgV6nsz0OmCBRIXv
PROXY_PASSWORD=IhObPDmdrLKDInQT
```

> **Password confusion warning:** The password contains both a capital `I` (India) and a lowercase `l` (lima). They look nearly identical in most fonts. If the proxy returns `407 Proxy Auth Required`, double-check character-by-character.

**Manual proxy test:**

```bash
venv/bin/python3 -m yt_dlp \
  --proxy "http://RgV6nsz0OmCBRIXv:IhObPDmdrLKDInQT@geo.iproyal.com:12321" \
  --extractor-args "youtube:player_client=ios,web_embedded" \
  "https://youtu.be/VIDEO_ID" \
  -f "bestaudio/best" \
  -o "/tmp/test_audio.%(ext)s"
```

---

## Deno JS Runtime

Deno is required for yt-dlp's YouTube JS challenge solving (introduced in yt-dlp 2026.03.17+).

- **Installed at (local)**: `~/.deno/bin/deno` — `DENO_PATH=/home/aladdin/.deno/bin` in `backend/.env`
- **Installed at (Railway)**: `/root/.deno/bin/deno` — `DENO_PATH=/root/.deno/bin` set as a Railway service variable
- **PATH injection**: Automatic — `DENO_PATH` in `backend/.env` (or Railway service variable) is read at startup in `main.py`; no manual `export PATH` needed when starting uvicorn
- **To install deno**:
  ```bash
  curl -fsSL https://deno.land/install.sh | sh
  ```

---

## Whisper Audio Pipeline

Full flow when debugging Whisper issues:

1. Frontend calls `POST /api/transcribe/whisper` with `video_id` or `audio_file`
2. `main.py` creates a `whisper_jobs` row in Supabase (`status: pending`) and returns `{ job_id }` immediately
3. `run_whisper_job` background task begins: `extract_youtube_audio()` in `audio_utils.py`
4. yt-dlp downloads audio-only stream (`bestaudio/best` via iOS client) via IPRoyal proxy
5. ffmpeg converts to **mono 12kbps Opus/OGG** (`libopus`, `-application voip`, output `.ogg`)
6. OGG file sent to AssemblyAI Universal-3 Pro (`assemblyai_client.py`)
7. Truncation check: if `audio_duration − last_segment_end > 60s`, warning written to `whisper_jobs.error_message`
8. Transcript inserted into Supabase `transcripts` (with `video_id` and `title`), credits deducted atomically
9. `whisper_jobs` row updated to `status: complete` with `completed_at` and `processing_time_seconds`
10. Frontend polling detects `complete`, loads transcript, shows green (or amber if truncation warning) banner

> **Job state in Supabase**: All job state lives in `whisper_jobs` — not in-memory. This means Railway restarts mid-job will not lose job metadata, though the background task itself will be lost and the job will stall (no automatic recovery yet).

> **AssemblyAI**: No file size limit, no timeout constraint. The SDK handles polling internally until the job completes.

**Deno JS runtime**: yt-dlp uses deno (at `~/.deno/bin`) to solve YouTube JS challenges. You should see `[jsc:deno] Solving JS challenges using deno` in the logs. If missing, check `DENO_PATH` in `backend/.env`.

---

## AI Summarization Workflow

1. Frontend calls `POST /api/ai/summarize` (Next.js route)
2. Next.js route forwards to Python backend `POST /api/summarize`
3. Backend fetches `transcript` row, verifies credits (≥ 1)
4. Deducts 1 credit atomically
5. DeepSeek V3 (`deepseek-chat`) processes the text
6. Result saved to `ai_summary` JSONB column
7. On failure: automatic refund via `add_credits`

---

## Stripe Payments

### Checkout Flow

1. User clicks "Buy" on pricing page
2. Frontend calls `POST /api/stripe/checkout` with `{ plan: "starter" | "regular" | "power" }`
3. Backend creates Stripe checkout session with server-side pricing
4. User redirected to Stripe Checkout
5. On success: redirected to `/dashboard/billing/success`

### Webhook Handling

1. Stripe sends `checkout.session.completed` to `/api/stripe/webhook`
2. Handler validates signature (requires `STRIPE_WEBHOOK_SECRET`)
3. Extracts `userId` and `credits` from session metadata
4. Calls `add_credits` RPC with metadata (session_id, amount, currency)
5. Tracks `credits_purchased` event in PostHog (server-side)

### Local Testing

For local development, set `STRIPE_WEBHOOK_SECRET` to empty or omit it — the handler will skip signature verification with a warning.

**Production:** Add the Railway/Vercel URL as webhook endpoint in [Stripe Dashboard](https://dashboard.stripe.com/webhooks):
- Endpoint: `https://yourapp.com/api/stripe/webhook`
- Event: `checkout.session.completed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

**Test Card:**
- Number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

---

## Tab Architecture & Editing

The dashboard uses a 4-tab system for transcripts and summaries.

- **Reactivity**: Tiptap editors use `immediatelyRender: false` to prevent SSR hydration mismatches
- **Editable State**: The `setEditable(true)` call is synced via `useEffect`
- **Formatting**: Bullet points require explicit CSS in `globals.css` (`.prose ul`, `.prose ol`)

---

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Whisper returns 403 | Proxy credentials wrong/expired | Re-check `PROXY_PASSWORD` (I vs l) |
| Credit cost shows "1" for any video | `duration` not flowing through API | Confirm route returns `duration` |
| Backend changes not reflected | uvicorn without `--reload` | Restart with `--reload` flag |
| yt-dlp selects video format | Format selector reverted | Must be `bestaudio/best` |
| Tiptap SSR Hydration Error | `immediatelyRender` not set | Set `immediatelyRender: false` |
| Bullet points hidden | Tailwind `prose` reset | Add `list-style-type: disc` to CSS |
| Cannot click to edit (Lockout) | `pointer-events-none` or non-reactive editable | Use `setEditable` in `useEffect` |
| Stripe webhook 400 | Invalid signature | Check `STRIPE_WEBHOOK_SECRET` |
| Credits not added after purchase | Webhook not receiving events | Check Stripe Dashboard webhook logs |
| `/admin` returns 403 | `ADMIN_EMAIL` not set or doesn't match session email | Add `ADMIN_EMAIL=your@email.com` to `.env.local` |
| User gets 403 on extract/whisper/summarize | Account suspended | Check `profiles.suspended` — toggle via `/admin/users` or `/api/admin/suspend-user` |

---

## Backend Endpoints Reference

### Python FastAPI (port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/extract` | POST | Extract YouTube captions |
| `/api/summarize` | POST | AI summarization via DeepSeek |
| `/api/transcribe/whisper` | POST | Start Whisper job — returns `{ job_id, status }` immediately |
| `/api/jobs/{job_id}` | GET | Poll Whisper job status (`?user_id=`) |
| `/api/playlist/info` | GET | Get playlist metadata |
| `/api/check-playlist-availability` | POST | Check video availability in playlist |

### Next.js Admin API Routes (require `ADMIN_EMAIL` session)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/add-credits` | POST | Grant credits to a user |
| `/api/admin/suspend-user` | POST | Toggle `profiles.suspended` |
| `/api/admin/delete-user` | POST | Cascade-delete user via RPC |
| `/api/admin/delete-transcript` | POST | Remove a transcript |
| `/api/admin/user-detail` | GET | Full user profile + credit history |

---

## Logging & Debugging

**Default log level**: `WARNING` (production) — only warnings and errors are emitted.

To enable verbose logging, set in `backend/.env`:
```
LOG_LEVEL=INFO
```

yt-dlp verbose output is suppressed by default (`quiet=True`, `verbose=False` in `audio_utils.py`). To debug a specific download issue, temporarily set `verbose=True` and `quiet=False` in the `ydl_opts` dict in `audio_utils.py:98`.

---

## Test Suite

### Playwright E2E Suite (primary)

```bash
npx playwright test                        # run all 29 tests headless
npx playwright test specs/01-single-video  # run one spec
npx playwright test "extracts: 19s" --headed  # run by test name, headed
```

Requires:
- Dev server running: `npm run dev` (on `http://localhost:3000`)
- Backend running: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- `tests/test_accounts.json` present (4 accounts: `test1–4@indxr-test.com`)
- `PLAYWRIGHT_BASE_URL` in `.env.local` (defaults to `http://localhost:3000`)

**Global setup** (`tests/playwright/global-setup.ts`) runs once before all tests. It reads `tests/test_accounts.json` and auto-tops-up any account below 50 credits via the `add_credits` Supabase RPC, so tests always start with sufficient credits.

**Metrics**: Per-test results (timing, method, success/fail) logged to `tests/playwright-report/metrics_{date}.json`.

**Spec files**:

| File | Tests | Description |
|------|-------|-------------|
| `01-single-video.spec.ts` | 14 | Auto-captions, Whisper, duplicate detection, long videos |
| `02-playlist.spec.ts` | 6 | Small/large/mixed Whisper playlists, 100-video fetch |
| `03-library.spec.ts` | 5 | Library operations, AI summary, transcript/summary editing |
| `04-stress.spec.ts` | 4 | Concurrent extraction, rapid sequential, race conditions |

### Legacy Python Suite

```bash
cd tests
pip3 install -r requirements.txt --break-system-packages
python3 test_suite.py
```

Results saved to `tests/results/run_{timestamp}.json`. Superseded by Playwright suite but retained for reference.

---

## Git Hygiene

The following paths are in `.gitignore` and removed from git tracking:

- `tests/playwright-report/` — Playwright HTML reports and per-run metrics JSON
- `tests/results/` — Legacy Python test suite JSON results
- `tests/__pycache__/` — Python bytecode cache
- `test-results/` — Playwright raw test artifacts

Do not commit any of the above. If they reappear in `git status`, run `git rm -r --cached <path>` to remove them from tracking without deleting the local files.

---

## Design System

The project currently uses a **neutral utility skin**. All design tokens are defined in `src/app/globals.css`:

```css
:root {
  --bg-base: #f8f9fa;
  --bg-surface: #ffffff;
  --accent: #2563eb;
  --radius: 6px;
}

.dark {
  --bg-base: #111111;
  --bg-surface: #1a1a1a;
}
```

**Deprecated:**
- The `.cline/skills/indxr-design/` skill references the old Starlight/Midnight design system
- OKLCH color functions have been replaced with hex values
- Glassmorphism effects (`backdrop-blur`, `bg-gradient`) have been removed

A full visual redesign is planned post-launch. Until then, use the CSS variables in `globals.css` as the source of truth for colors and spacing.
