# Development Guide

## Local Development Setup

### Frontend (Next.js)

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

Environment file: `.env.local` (see ARCHITECTURE.md for required keys)

---

### Backend (FastAPI + Python)

The backend must be started **manually** — it is not managed by Next.js.

```bash
cd backend
venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> **Add `--reload`** so the server picks up code changes automatically without a manual restart. Without it, edits to `main.py`, `audio_utils.py`, etc. have no effect until you kill and restart the process.

The backend must be running for:

- `/api/extract` (YouTube caption extraction)
- `/api/summarize` (AI Summarization via DeepSeek V3)
- `/api/transcribe/whisper` (Whisper AI re-extraction)
- `/api/transcribe/upload` (file upload transcription)
- All playlist-related endpoints

---

## Proxy Configuration (IPRoyal)

The backend routes all yt-dlp requests through an IPRoyal residential proxy to avoid YouTube 403/429 errors.

Credentials are stored in `backend/.env`:

```
PROXY_HOST=geo.iproyal.com
PROXY_PORT=12321
PROXY_USER=RgV6nsz0OmCBRIXv
PROXY_PASSWORD=IhObPDmdrLKDInQT
```

> ⚠️ **Password confusion warning:** The password contains both a capital `I` (India) and a lowercase `l` (lima). They look nearly identical in most fonts. If the proxy returns `407 Proxy Auth Required`, double-check the password character-by-character.

To test the proxy manually from the backend directory:

```bash
venv/bin/python3 -m yt_dlp \
  --proxy "http://RgV6nsz0OmCBRIXv:IhObPDmdrLKDInQT@geo.iproyal.com:12321" \
  --extractor-args "youtube:player_client=ios,web_embedded" \
  "https://youtu.be/VIDEO_ID" \
  -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio" \
  -o "/tmp/test_audio.%(ext)s"
```

A successful download (no 403) confirms the proxy credentials and format selector are working correctly.

---

## Whisper Audio Pipeline

When debugging Whisper issues, the full flow is:

1. Frontend calls `POST /api/transcribe/whisper` with `video_id`
2. `main.py` → `extract_youtube_audio()` in `audio_utils.py`
3. yt-dlp downloads audio-only stream (`m4a` via iOS client) via IPRoyal proxy
4. ffmpeg subprocess converts to 16kHz mono 32kbps MP3
5. MP3 sent to OpenAI Whisper API
6. Transcript inserted into Supabase, credits deducted atomically

## AI Summarization Workflow

1. Frontend calls `POST /api/ai/summarize` (Next.js route)
2. Next.js route forwards to Python backend `POST /api/summarize`
3. Backend fetches `transcript` row, verifies credits
4. DeepSeek V3 (`deepseek-chat`) processes the text
5. Result saved to `ai_summary` JSONB column
6. UI redirects to `Edited Summary` tab if user saves changes

## Tab Architecture & Editing

The dashboard uses a 4-tab system for transcripts and summaries.

- **Reactivity**: Tiptap editors use `immediatelyRender: false` to prevent SSR hydration mismatches.
- **Editable State**: The `setEditable(true)` call is synced via `useEffect` to the `isEditedMode` or `isEditing` state. This avoids the "editing lockout" issue where a cursor cannot be placed in a div.
- **Formatting**: Bullet points and numbered lists require explicit CSS in `globals.css` (targeting `.prose ul` and `.prose ol`) because Tailwind's `prose` class often overrides browser defaults.

**Known warning (non-breaking):** yt-dlp logs `No supported JavaScript runtime could be found` on every run. This is harmless — we explicitly force the `ios` player client, which bypasses YouTube's JS requirement (PO Token) entirely for audio extractions.

## Stripe Webhook Setup

Local webhook testing is currently skipped — webhooks will be tested directly after deployment.

**For Production (Railway):**

1. Add the Railway public URL as a webhook endpoint in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks) under **Developers** → **Webhooks** → **Add endpoint** (e.g., `https://yourapp.up.railway.app/api/stripe/webhook`).
2. Select the event: `checkout.session.completed`.
3. Copy the signing secret (starts with `whsec_...`).
4. Add it as `STRIPE_WEBHOOK_SECRET` in your Railway environment variables.
5. Also add `STRIPE_WEBHOOK_SECRET` to your local `.env.local` for consistency.

**Test Card:**
When testing the Stripe Checkout flow in development mode, use the standard Stripe test card:

- **Card number:** `4242 4242 4242 4242`
- **Expiry:** Any date in the future (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)

---

## Common Issues

| Symptom                                       | Likely cause                                               | Fix                                                               |
| --------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Whisper returns 403                           | Proxy credentials wrong or expired                         | Re-check `PROXY_PASSWORD` (I vs l confusion)                      |
| Credit cost shows "1" for any video           | `duration` not flowing through Next.js API route           | Confirm `route.ts` returns `duration: data.duration`              |
| Frontend doesn't reflect backend code changes | uvicorn started without `--reload`                         | Restart with `--reload` flag                                      |
| yt-dlp selects video format instead of audio  | Format selector reverted to `bestaudio/best`               | Must be `bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio`        |
| Whisper 403 on CDN download despite proxy     | `FFmpegExtractAudio` postprocessor re-added                | Remove it — it causes proxy split on DASH format selection        |
| Tiptap SSR Hydration Error                    | `immediatelyRender` set to true (default)                  | Set `immediatelyRender: false` in `useEditor` config              |
| Bullet points hidden in summary               | Tailwind `prose` resetting list styles                     | Add explicit `list-style-type: disc` to `.prose ul` in CSS        |
| Cannot click to edit (Lockout)                | `pointer-events-none` on editor or non-reactive `editable` | Remove `pointer-events-none` and use `setEditable` in `useEffect` |

---

## Design System & AI Skills

To maintain the premium "Apple-like" aesthetic, all visual changes should be guided by the project's internal design tokens.

### 1. indxr-design Skill

The project includes a custom agent skill located in `.agent/skills/indxr-design/`. This skill provides the AI assistant with:

- **Color Tokens**: Midnight (dark) and Starlight (light) palettes.
- **Typography**: Inter for body, JetBrains Mono for code.
- **Spacing**: Standardized border-radius and shadows.

### 2. References

Refer to these files before making any UI updates:

- `docs/ARCHITECTURE.md` (Aesthetics section)
- `.agent/skills/indxr-design/references/design-system.md`
- `.agent/skills/indxr-design/references/component-patterns.md`
