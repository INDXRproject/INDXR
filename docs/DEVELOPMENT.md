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

**Known warning (non-breaking):** yt-dlp logs `No supported JavaScript runtime could be found` on every run. This is harmless — we explicitly force the `ios` player client, which bypasses YouTube's JS requirement (PO Token) entirely for audio extractions.

---

## Common Issues

| Symptom                                       | Likely cause                                     | Fix                                                        |
| --------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Whisper returns 403                           | Proxy credentials wrong or expired               | Re-check `PROXY_PASSWORD` (I vs l confusion)               |
| Credit cost shows "1" for any video           | `duration` not flowing through Next.js API route | Confirm `route.ts` returns `duration: data.duration`       |
| Frontend doesn't reflect backend code changes | uvicorn started without `--reload`               | Restart with `--reload` flag                               |
| yt-dlp selects video format instead of audio  | Format selector reverted to `bestaudio/best`     | Must be `bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio` |
| Whisper 403 on CDN download despite proxy     | `FFmpegExtractAudio` postprocessor re-added      | Remove it — it causes proxy split on DASH format selection |
