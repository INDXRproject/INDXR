# INTERACTION MAP

> Every documented user interaction with INDXR.AI derived exclusively from the source code read on 2026-04-09.
> Format per interaction: **Action** / **Condition** / **Expected** / **Error shown** / **Credits**

---

## 1. Anonymous User (not logged in)

### 1.1 Free Tool Access

| Area | Allowed | Blocked |
|------|---------|---------|
| Video tab — URL input & Extract | ✅ Yes (rate-limited) | — |
| Video tab — Whisper toggle | ❌ Hidden (`user && !whisperAutoTriggered` guards the toggle render) | — |
| Video tab — WhisperFallbackModal (auto-triggered on no-captions) | Modal opens, but "Transcribe" button calls `/api/transcribe/whisper` → auth check returns 401 | — |
| Playlist tab | ❌ Blocked — `onAuthRequired` callback fires | Auth dialog triggered |
| Audio tab | ❌ Blocked — renders "Authentication Required" amber card with sign-in link | — |
| Dashboard routes | ❌ Middleware redirects to `/login` | — |
| Admin routes | ❌ Middleware redirects to `/dashboard` | — |

---

**Action:** Anonymous user pastes a valid YouTube URL and clicks Extract
**Condition:** Rate limit not exceeded, captions available
**Expected:** Transcript extracted, displayed in VideoTab
**Error shown:** None
**Credits:** Not deducted (YouTube captions are free)

---

**Action:** Anonymous user clicks Extract
**Condition:** Rate limit exceeded (>10 requests in 24h from same IP; only enforced when Upstash Redis is configured)
**Expected:** Request rejected
**Error shown:** `"Anonymous users: 10 requests/day. Sign up free for 50 requests/hour."` — inline error text
**Credits:** Not deducted

---

**Action:** Anonymous user pastes a valid URL, Extract succeeds, but video has no captions
**Condition:** Backend returns `success: false, error: "No captions found for this video"`
**Expected:** WhisperFallbackModal opens (video ID is set, `setShowWhisperModal(true)`)
**Error shown:** Modal title "No Captions Found" with Whisper AI offer
**Credits:** Not deducted

---

**Action:** Anonymous user clicks "Transcribe" inside the WhisperFallbackModal
**Condition:** User is not logged in (`!user` check inside `handleTranscribe`)
**Expected:** Modal closes, error callback fires
**Error shown:** `"Please sign in to use AI transcription"` — toast error
**Credits:** Not deducted

---

**Action:** Anonymous user pastes a members-only YouTube URL and clicks Extract
**Condition:** Backend returns 403 `{ error: "members_only" }`
**Expected:** Inline error card shown, Whisper modal suppressed
**Error shown:** Card — bold title **"Members-Only Video"**, body "This video is only available to channel members and cannot be transcribed by INDXR.AI."
**Credits:** Not deducted

---

**Action:** Anonymous user pastes an invalid / non-YouTube URL
**Condition:** `validateYouTubeUrl` returns `NON_YOUTUBE`
**Expected:** Inline validation error, no API call made
**Error shown:** `"Please enter a valid YouTube URL (e.g., youtube.com/watch?v=...)"` — inline text below input
**Credits:** Not deducted

---

**Action:** Anonymous user pastes a playlist URL in the Video tab
**Condition:** `validateYouTubeUrl` returns `PLAYLIST_IN_VIDEO`
**Expected:** Inline validation error + Playlist Detection Banner with "Switch to Playlist" button
**Error shown:** `"This is a playlist URL. Use the Playlist tab to extract multiple videos."` — inline text
**Credits:** Not deducted

---

**Action:** Anonymous user pastes a malformed YouTube URL
**Condition:** `validateYouTubeUrl` returns `MALFORMED`
**Expected:** Inline validation error
**Error shown:** `"This doesn't look like a valid YouTube link. Please check and try again."` — inline text
**Credits:** Not deducted

---

**Action:** Anonymous user tries to access the Audio tab
**Condition:** `!user` — loading state is false
**Expected:** Auth-required state shown (amber card)
**Error shown:** `"Please sign in to use audio transcription."` with link to `/login`
**Credits:** Not deducted

---

## 2. Authenticated User — Extraction

### 2.1 Single Video — Auto Captions

---

**Action:** User pastes a valid YouTube URL and clicks Extract
**Condition:** No duplicate, captions available, rate limit not exceeded, not suspended
**Expected:** Transcript extracted; `toast.success("Transcript extracted & saved")` fires; URL input cleared; `onTranscriptLoaded` called to save to library
**Error shown:** None
**Credits:** Not deducted (YouTube captions are free)

---

**Action:** User pastes a valid YouTube URL and clicks Extract
**Condition:** Rate limit exceeded (>50 req/1h for free user; only enforced when Upstash is configured)
**Expected:** 429 response
**Error shown:** `"Free tier: 50 requests/hour. Upgrade to premium for unlimited extractions."` — inline error text
**Credits:** Not deducted

---

**Action:** User pastes a valid YouTube URL and clicks Extract
**Condition:** User account is suspended (`profiles.suspended = true`)
**Expected:** 403 from `/api/extract`, forwarded to frontend
**Error shown:** Error message from API: `"Account suspended. Contact support@indxr.ai"` — inline error text + toast
**Credits:** Not deducted

---

**Action:** User pastes a URL for a video they have already extracted (same video_id + same processing_method)
**Condition:** Duplicate found in Supabase (debounced check on URL change); `existingTranscriptId` is set
**Expected:** Extract button shows soft banner "You already have this transcript in your library — View in Library"; clicking Extract shows the pause-and-confirm prompt
**Error shown:** Amber banner with AlertCircle icon and "View in Library" link; prompt: "You already have this transcript in your library. Extract again?" + "View in Library / Extract anyway / Cancel" choices
**Credits:** Not deducted until user confirms re-extraction

---

**Action:** User clicks "Extract anyway" after duplicate confirmation
**Condition:** `showDuplicateChoices` is true
**Expected:** `showDuplicateChoices` reset to false, extraction proceeds normally
**Error shown:** None (proceeds as normal extraction)
**Credits:** Not deducted (captions are free)

---

**Action:** User pastes a valid URL and clicks Extract
**Condition:** Video has no captions (backend returns `success: false, error: "No captions found..."`; error message includes "captions")
**Expected:** WhisperFallbackModal opens silently; no error card or toast shown
**Error shown:** WhisperFallbackModal — "No Captions Found" with Whisper AI offer
**Credits:** Not deducted

---

**Action:** User pastes a members-only YouTube URL and clicks Extract
**Condition:** Backend returns 403 `{ error: "members_only" }`
**Expected:** Members-only error card shown; WhisperFallbackModal is NOT triggered
**Error shown:** Bordered card — bold title **"Members-Only Video"**, body "This video is only available to channel members and cannot be transcribed by INDXR.AI."
**Credits:** Not deducted

---

**Action:** User pastes URL of a private, deleted, or otherwise unavailable video
**Condition:** Backend yt-dlp extraction throws a non-members-only, non-captions exception
**Expected:** Generic error shown + toast
**Error shown:** `"Unable to retrieve captions — this video may be restricted or our server is temporarily blocked"` — inline error text + toast
**Credits:** Not deducted

---

**Action:** User pastes a valid URL and clicks Extract
**Condition:** Python backend is unreachable (Railway down, cold start timeout)
**Expected:** 503 from `/api/extract`
**Error shown:** `"Unable to connect to extraction service. Please try again later."` — inline error text + toast
**Credits:** Not deducted

---

**Action:** User pastes a valid URL with captions and previously had a youtube_captions transcript; same URL is pasted again; user already extracted via whisper_ai
**Condition:** Supabase has a `whisper_ai` record for this video_id; soft banner shows "You already have this transcript (Whisper AI) — View in Library"
**Expected:** Banner identifies the method variant correctly
**Error shown:** Amber banner with whisper_ai-specific copy
**Credits:** Not deducted

---

### 2.2 Single Video — Whisper AI (User-Initiated via Toggle)

---

**Action:** User enables Whisper toggle and clicks Extract
**Condition:** Toggle is on, `useWhisper && videoId` branch executes; `isFetchingMeta` set to true
**Expected:** Button label changes to "Checking…" while metadata is fetched via `/api/extract` (full extraction used for duration/title). After fetch, WhisperConfirm inline panel shown with credit cost and video duration.
**Error shown:** None during fetch; credit cost displayed
**Credits:** Not deducted yet

---

**Action:** Whisper toggle on, user clicks Extract
**Condition:** User has fewer credits than `creditsRequired` (client-side check against `credits` state)
**Expected:** Error shown immediately, loading stopped
**Error shown:** `"Not enough credits. This video requires N credit(s), you have X."` — inline error text below input; "Buy Credits →" link shown
**Credits:** Not deducted

---

**Action:** User confirms Whisper extraction in the inline confirm panel
**Condition:** Sufficient credits, video accessible; SSE stream starts
**Expected:** SSE stream begins; status messages shown below input; skeleton hidden (`!isStreaming`); `beforeunload` guard active
**Error shown:** None while streaming
**Credits:** Not deducted until `saving` event

---

**Action:** SSE stream in progress
**Condition:** `downloading` event received
**Expected:** Status message: "Downloading audio from YouTube…"
**Error shown:** None
**Credits:** Not deducted

---

**Action:** SSE stream in progress
**Condition:** `transcribing` event received
**Expected:** Status message: "Transcribing with Whisper AI…"
**Error shown:** None
**Credits:** Not deducted

---

**Action:** SSE stream in progress
**Condition:** `saving` event received
**Expected:** Status message: "Saving transcript…"
**Error shown:** None
**Credits:** Being deducted server-side at this exact point

---

**Action:** SSE stream in progress
**Condition:** `complete` event received
**Expected:** Transcript displayed; success banner shown above TranscriptCard; `toast.success("Transcript extracted & saved with Whisper AI")`; credits refreshed; URL cleared; Whisper toggle reset
**Error shown:** None
**Credits:** Deducted (`Math.ceil(duration_seconds / 600)`, minimum 1)

---

**Action:** Whisper extraction, SSE stream
**Condition:** Backend re-checks credits inside SSE generator and finds insufficient balance (race condition between frontend check and backend execution)
**Expected:** SSE error event with `code: "insufficient_credits"`, `required_credits`, `available_credits`
**Error shown:** `"Not enough credits. This video requires N credit(s), you have X."` — inline error text; "Buy Credits →" link
**Credits:** Not deducted

---

**Action:** Whisper extraction, SSE stream
**Condition:** yt-dlp audio download fails with SSL/EOF/RemoteDisconnected error
**Expected:** Retry loop fires up to 3 times with 2s/4s/8s backoff (`audio_utils.py`); each retry logged. If all fail, SSE error event emitted.
**Error shown:** Error message from yt-dlp propagated as inline error text + toast
**Credits:** Not deducted

---

**Action:** Whisper extraction, SSE stream
**Condition:** yt-dlp detects members-only content during audio download
**Expected:** `MembersOnlyVideoError` raised immediately (no retries); SSE error event with `code: "members_only"`
**Error shown:** Members-only error card (bold title "Members-Only Video")
**Credits:** Not deducted

---

**Action:** Whisper extraction, SSE stream
**Condition:** yt-dlp download fails with `Error 152` or "unavailable" in message
**Expected:** SSE error with `code: "download_failed"`; frontend checks if `isYouTubeRestricted` (errMsg.includes('152') or 'unavailable')
**Error shown:** "This video's owner has restricted automated access. You can still transcribe it — many browser extensions and download tools let you save audio files, which you can then upload here." — inline text (no toast)
**Credits:** Not deducted

---

**Action:** Whisper extraction, SSE stream
**Condition:** Whisper API call fails (non-200 response from OpenAI)
**Expected:** SSE error with `code: "api_error"`
**Error shown:** Error message from Whisper API — inline error text + toast
**Credits:** Not deducted (transcription failed before deduction)

---

**Action:** Whisper extraction, SSE stream
**Condition:** Whisper API returns empty transcript (no speech detected)
**Expected:** SSE error with `code: "no_speech"`, `error: "no_speech_detected"`
**Error shown:** `"no_speech_detected"` — inline error text + toast; in PlaylistTab this sets video status to `no_speech`
**Credits:** Not deducted

---

**Action:** Whisper extraction, SSE stream
**Condition:** Transcription succeeds but credit deduction RPC fails
**Expected:** SSE error with `code: "deduction_failed"`
**Error shown:** `"Transcription succeeded but credit deduction failed. Please contact support."` — inline error text + toast
**Credits:** Not deducted (deduction failed) — user receives transcript data but extraction is not saved; ⚠️ transcript is shown in-memory but `onTranscriptLoaded` is never called so it is NOT persisted to the library

---

**Action:** Whisper extraction, SSE stream
**Condition:** Unexpected exception anywhere in the SSE generator
**Expected:** SSE error with `code: "internal_error"`
**Error shown:** `"Internal server error: <exception message>"` — inline error text + toast
**Credits:** Not deducted

---

**Action:** User initiates Whisper upsell (clicks "Re-extract with Whisper AI" in Whisper Promo Banner after captions extraction)
**Condition:** Sufficient credits, `currentVideoId` set
**Expected:** Same SSE flow via `handleWhisperUpsell`; `isReextracting` = true; existing transcript cleared; `handleWhisperSuccess` called on completion
**Error shown:** Same error handling as direct Whisper flow
**Credits:** Deducted on success

---

**Action:** User navigates away (closes tab / reloads) while SSE Whisper stream is open
**Condition:** `isStreaming = true` → `beforeunload` event listener is active
**Expected:** Browser shows native "Leave site? Changes you made may not be saved." dialog
**Error shown:** Browser native dialog
**Credits:** Depends on whether `saving` event was already emitted server-side

---

### 2.3 Playlist

---

**Action:** Unauthenticated user clicks on Playlist tab
**Condition:** `isAuthenticated = false`
**Expected:** `onAuthRequired` callback fires immediately
**Error shown:** Auth dialog / redirect (handled by parent component)
**Credits:** Not deducted

---

**Action:** Authenticated user submits a playlist URL
**Condition:** Valid playlist URL, backend reachable
**Expected:** `POST /api/playlist/info` → backend tries YouTube Data API first, falls back to yt-dlp; playlist metadata returned with entries, titles, durations
**Error shown:** None on success
**Credits:** Not deducted

---

**Action:** User submits a playlist URL
**Condition:** Backend cannot fetch playlist info (invalid URL / network error)
**Expected:** Error shown in PlaylistTab error banner
**Error shown:** Red banner with AlertCircle icon: `"Failed to fetch playlist information"` or backend error message
**Credits:** Not deducted

---

**Action:** User submits a playlist URL
**Condition:** User account is suspended
**Expected:** `/api/playlist/info` returns 403
**Error shown:** `"Account suspended. Contact support@indxr.ai"` in PlaylistTab error banner
**Credits:** Not deducted

---

**Action:** User selects videos including Whisper videos and clicks Extract
**Condition:** Total Whisper credits required > user's current balance
**Expected:** Pre-flight credit check fires before any extraction; error shown with deselect suggestion
**Error shown:** Red banner: `"Not enough credits. You need N credits for M Whisper video(s) but only have X. Deselect at least Y Whisper video(s) or top up to proceed."` + "Buy Credits →" button
**Credits:** Not deducted

---

**Action:** User starts playlist extraction
**Condition:** Auto-collection: `playlistTitle` is provided; collection with matching name exists for the user
**Expected:** Existing collection ID used; all extracted transcripts assigned to that collection
**Error shown:** None (silent match)
**Credits:** Not deducted for collection creation

---

**Action:** User starts playlist extraction
**Condition:** Auto-collection: `playlistTitle` provided; no matching collection exists
**Expected:** New collection created via Supabase insert; all extracted transcripts assigned
**Error shown:** None
**Credits:** Not deducted for collection creation

---

**Action:** Playlist extraction iterates over a video
**Condition:** Video has captions available (`status !== 'needs_whisper'`)
**Expected:** `onExtractVideo` called with standard captions path; status → `success`
**Error shown:** None on success
**Credits:** Not deducted

---

**Action:** Playlist extraction iterates over a video
**Condition:** Video needs Whisper AI (`status === 'needs_whisper'` or `'whisper_ai'`)
**Expected:** `onExtractVideo` called with Whisper path; credits deducted per video; `refreshCredits()` called after each success
**Error shown:** None on success per video
**Credits:** Deducted (`estimatedCredits` per video)

---

**Action:** Playlist extraction iterates over a video
**Condition:** Video is flagged as `unavailable` in availability data
**Expected:** Video skipped immediately (`initialStatuses[videoId] = 'unavailable'`); status badge shows unavailable
**Error shown:** Per-video status badge "unavailable" in PlaylistManager UI
**Credits:** Not deducted

---

**Action:** Playlist extraction iterates over a video
**Condition:** Extraction throws error with `'no_speech_detected'` message
**Expected:** Video status set to `'no_speech'`
**Error shown:** Per-video status badge in PlaylistManager
**Credits:** Not deducted (Whisper failed before deduction)

---

**Action:** Playlist extraction iterates over a video
**Condition:** Extraction throws error with `'152'` or `'unavailable'` in message
**Expected:** Video status set to `'youtube_restricted'`
**Error shown:** Per-video status badge in PlaylistManager
**Credits:** Not deducted

---

**Action:** Playlist extraction iterates over a video
**Condition:** Any other extraction error
**Expected:** Video status set to `'error'`
**Error shown:** Per-video status badge in PlaylistManager; error logged to console
**Credits:** Not deducted

---

**Action:** Playlist extraction completes
**Condition:** All selected videos processed (mix of success, errors, skips)
**Expected:** `progressMessage` cleared; PlaylistManager handles "Extraction Complete" view
**Error shown:** None at playlist level; per-video statuses visible
**Credits:** Deducted only for successfully transcribed Whisper videos

---

**Action:** Playlist extraction completes
**Condition:** All selected videos were unavailable or errored; `successCount = 0`
**Expected:** `progressMessage` cleared; no error banner at playlist level
**Error shown:** ⚠️ NOT HANDLED — no banner or toast indicating that zero videos were successfully extracted
**Credits:** Not deducted

---

**Action:** User fetches a playlist with 100+ videos
**Condition:** yt-dlp `playlist_items: '1-500'` cap; YouTube Data API has no explicit limit in the code
**Expected:** Up to 500 videos returned via yt-dlp; `total_count` reported from `playlist_count` or entry length
**Error shown:** None — silently truncated at 500
**Credits:** Not deducted for metadata fetch

---

### 2.4 Audio Upload

---

**Action:** User drops or selects an audio file
**Condition:** File type not in `['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.mp4', '.mpeg', '.mpga', '.webm']`
**Expected:** File rejected before API call
**Error shown:** `toast.error("Unsupported file type. Please use: .mp3, .wav, ...")`
**Credits:** Not deducted

---

**Action:** User drops or selects an audio file
**Condition:** File size > 25MB
**Expected:** File rejected before API call
**Error shown:** `toast.error("File too large (X.XX MB). Maximum size is 25 MB.")`
**Credits:** Not deducted

---

**Action:** User selects a valid audio file
**Condition:** File passes type and size checks; browser attempts to read duration via `HTMLAudioElement`
**Expected:** `audioDuration` set; credit cost displayed (`Math.ceil(seconds / 600)`, min 1); if duration read fails, falls back to file-size estimate (`Math.ceil(sizeMB / 10)`)
**Error shown:** None (silent fallback on duration read failure)
**Credits:** Not deducted

---

**Action:** User has a valid file selected; credit preview shown
**Condition:** `credits < estimatedCredits`
**Expected:** Transcribe button disabled; amber "Not enough credits" indicator shown; "Buy Credits →" link shown
**Error shown:** Inline "Not enough credits" alert with `AlertCircle` icon
**Credits:** Not deducted

---

**Action:** User clicks "Transcribe" with a valid file
**Condition:** `canTranscribe = true` (file present, user logged in, enough credits, not already transcribing)
**Expected:** `POST /api/transcribe/whisper` with `source_type: upload`; button shows "Transcribing... this may take up to 30 seconds"
**Error shown:** None while in progress
**Credits:** Awaiting backend result

---

**Action:** AudioTab receives response from `/api/transcribe/whisper`
**Condition:** Response is `!response.ok` and `response.status === 402`
**Expected:** Insufficient credits toast rendered
**Error shown:** Toast with `"Not enough credits"` title, required vs available credits, "Buy Credits →" link
**Credits:** Not deducted

> ⚠️ **NOT HANDLED — AudioTab SSE incompatibility**: AudioTab calls `response.json()` on the Whisper route response. The route now returns an SSE stream (`text/event-stream`) for the success path, not JSON. `response.json()` on an SSE response will either hang or throw a JSON parse error. The upload transcription path is therefore broken for successful requests. Pre-stream error responses (401, 403, 400) still return JSON and are handled correctly.

---

**Action:** AudioTab receives a non-402 error response
**Condition:** `!response.ok`, status is not 402 (e.g., 401, 403, 400)
**Expected:** Generic error toast
**Error shown:** `toast.error(data.user_friendly_message || data.error || 'Transcription failed')`
**Credits:** Not deducted

---

**Action:** AudioTab fetch throws a network exception
**Condition:** Backend unreachable
**Expected:** Catch block runs
**Error shown:** `toast.error('Something went wrong. Please try again.')`
**Credits:** Not deducted

---

**Action:** Audio transcription succeeds and `onTranscriptLoaded` is called
**Condition:** `onTranscriptLoaded` prop is provided
**Expected:** `setSaveStatus('saving')` → `onTranscriptLoaded(...)` → `setSaveStatus('saved')`; green banner shown above TranscriptCard
**Error shown:** None
**Credits:** Deducted server-side during processing

---

**Action:** Audio transcription succeeds but `onTranscriptLoaded` is not provided
**Condition:** `onTranscriptLoaded` is undefined
**Expected:** Transcript displayed; `setSaveStatus('saving')` called but never transitions to `'saved'`
**Error shown:** ⚠️ NOT HANDLED — save status stuck at `'saving'`; no success banner appears; transcript is not persisted
**Credits:** Deducted server-side

---

## 3. Rate Limiting

| Tier | Limit | Window | Key | Enforced When |
|------|-------|--------|-----|---------------|
| Anonymous | 10 req | 24h | IP address | Upstash Redis configured |
| Free User | 50 req | 1h | user ID | Upstash Redis configured |
| Premium | Unlimited | — | — | `total_credits_purchased > 0` |
| Login | 10 req | 15 min | IP address | Upstash Redis configured |
| Signup | 5 req | 1h | IP address | Upstash Redis configured |

> Rate limiting only applies to `/api/extract`. It is NOT applied to `/api/transcribe/whisper`, `/api/playlist/info`, or `/api/stripe/*` routes.

---

**Action:** Any request to `/api/extract`
**Condition:** Upstash Redis env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are NOT set
**Expected:** `noopLimiter` returns `{ success: true }` always; rate limiting is entirely disabled
**Error shown:** None
**Credits:** N/A

---

**Action:** Anonymous user exceeds rate limit
**Condition:** >10 requests from same IP in 24h; Upstash configured
**Expected:** 429 response with `Retry-After` header
**Error shown:** `"Anonymous users: 10 requests/day. Sign up free for 50 requests/hour."` — inline error text
**Credits:** Not deducted

---

**Action:** Free user exceeds rate limit
**Condition:** >50 requests from same user ID in 1h; Upstash configured
**Expected:** 429 response with `Retry-After` header
**Error shown:** `"Free tier: 50 requests/hour. Upgrade to premium for unlimited extractions."` — inline error text
**Credits:** Not deducted

---

**Action:** Premium user makes any number of extraction requests
**Condition:** `total_credits_purchased > 0` (checked via `get_user_credits` RPC)
**Expected:** Rate limit bypassed entirely; `mode: 'premium'` returned
**Error shown:** None
**Credits:** N/A

---

**Action:** User attempts login
**Condition:** >10 login attempts from same IP in 15 minutes; Upstash configured
**Expected:** Rate limit rejection
**Error shown:** Handled by auth route (not in files read) ⚠️ NOT VERIFIED from code read
**Credits:** N/A

---

**Action:** User attempts signup
**Condition:** >5 signups from same IP in 1 hour; Upstash configured
**Expected:** Rate limit rejection
**Error shown:** Handled by auth route (not in files read) ⚠️ NOT VERIFIED from code read
**Credits:** N/A

---

## 4. Library & Editor

> The library and editor routes (`/dashboard/library`) were not among the files read. The following is derived from STATUS.md, ARCHITECTURE.md, and indirect references in the code read.

---

**Action:** User navigates to `/dashboard/library`
**Condition:** User is authenticated
**Expected:** Grid/list view of all saved transcripts; search/filter available
**Error shown:** None
**Credits:** Not deducted

---

**Action:** User navigates to `/dashboard/library`
**Condition:** User is not authenticated
**Expected:** Middleware redirects to `/login`
**Error shown:** Redirect
**Credits:** N/A

---

**Action:** User opens a transcript in the library
**Condition:** Transcript has content
**Expected:** 4-tab view: Original / Edited / AI Summary / Edited Summary; Tiptap editor loads for editable tabs; URL-based tab navigation via `?tab=x` query param
**Error shown:** None
**Credits:** Not deducted

---

**Action:** User edits transcript in the Tiptap editor
**Condition:** Edit tab active; content changed
**Expected:** Edits persisted to `edited_content` column in Supabase
**Error shown:** ⚠️ NOT VERIFIED from code read — save failure handling not confirmed
**Credits:** Not deducted

---

**Action:** User requests AI Summary
**Condition:** User has ≥ 1 credit; transcript has content
**Expected:** `POST /api/summarize` → DeepSeek V3 call → summary saved to `transcripts.ai_summary`; 1 credit deducted
**Error shown:** None on success
**Credits:** 1 credit deducted

---

**Action:** User requests AI Summary
**Condition:** User has 0 credits
**Expected:** Backend returns error "Insufficient credits"
**Error shown:** ⚠️ NOT VERIFIED from code read — frontend error handling for this route not in files read
**Credits:** Not deducted

---

**Action:** AI Summary request — transcript fetch from Supabase fails
**Condition:** Transcript not found or empty in DB
**Expected:** 1 credit refunded immediately; error returned
**Error shown:** Handled by parent component (not in files read) ⚠️ NOT VERIFIED
**Credits:** 1 credit deducted then refunded with reason `"AI Summarization Refund (Transcript fetch failed)"`

---

**Action:** AI Summary request — transcript fetched but text is empty
**Condition:** All items in transcript array have no `text` field
**Expected:** 1 credit refunded; error returned
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** 1 credit deducted then refunded with reason `"AI Summarization Refund (Empty text)"`

---

**Action:** AI Summary request — DeepSeek API key not configured
**Condition:** `DEEPSEEK_API_KEY` env var missing
**Expected:** 1 credit refunded; error returned
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** 1 credit deducted then refunded with reason `"AI Summarization Refund (DeepSeek API key missing)"`

---

**Action:** AI Summary request — DeepSeek API returns non-200
**Condition:** API error (rate limit, service down, etc.)
**Expected:** 1 credit refunded; `SummarizeResponse(success=False, error="Failed to generate summary")`
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** 1 credit deducted then refunded with reason `"AI Summarization Refund (DeepSeek API Error)"`

---

**Action:** AI Summary request — any unexpected exception during DeepSeek call
**Condition:** Network error, JSON parse error, etc.
**Expected:** 1 credit refunded
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** 1 credit deducted then refunded with reason `"AI Summarization Refund (<ExceptionType>)"`

---

**Action:** User exports a transcript
**Condition:** Any supported format selected
**Expected:** File downloaded in selected format
**Formats available:** TXT (plain text with/without timestamps), JSON (`[{text, duration, offset}]`), CSV (`Start, Duration, Text`), SRT, VTT
**Error shown:** ⚠️ NOT VERIFIED from code read — export route not in files read
**Credits:** Not deducted

---

**Action:** User deletes a transcript from the library
**Condition:** User owns the transcript
**Expected:** Transcript removed from Supabase; library view updates
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** Not deducted (no refund)

---

## 5. Billing & Credits

### 5.1 Packages

| Key | Name | Price | Credits |
|-----|------|-------|---------|
| `starter` | Starter Package | €1.99 | 15 |
| `basic` | Basic Package | €4.99 | 50 |
| `plus` | Plus Package | €9.99 | 130 |
| `pro` | Pro Package | €24.99 | 400 |
| `power` | Power Package | €49.99 | 850 |

> `starter` and `power` are marked `TODO: Create in Stripe Dashboard` in `checkout/route.ts`. The server-side code will attempt to create Stripe sessions for these plans using `price_data` (dynamic pricing), so sessions may be created even without pre-configured products. All 5 are functional at the API level.

---

**Action:** User clicks a pricing button on the pricing page
**Condition:** User is not authenticated
**Expected:** `POST /api/stripe/checkout` returns 401 `"Unauthorized"`
**Error shown:** ⚠️ NOT VERIFIED — frontend handling of 401 from checkout route not in files read
**Credits:** N/A

---

**Action:** User clicks a pricing button
**Condition:** User authenticated, valid plan key sent
**Expected:** Stripe checkout session created; `{ url: session.url }` returned; frontend redirects user to Stripe-hosted checkout
**Error shown:** None
**Credits:** N/A

---

**Action:** User submits a plan key that is not in the `PACKAGES` object
**Condition:** e.g., `plan: "enterprise"`
**Expected:** 400 `"Invalid plan"`
**Error shown:** ⚠️ NOT VERIFIED from code read — frontend handling not confirmed
**Credits:** N/A

---

**Action:** Stripe checkout session creation throws an exception
**Condition:** Stripe API key invalid, network error, etc.
**Expected:** 500 `"Internal Error"`
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** N/A

---

**Action:** User completes payment on Stripe-hosted checkout
**Condition:** Webhook `checkout.session.completed` fires; `STRIPE_WEBHOOK_SECRET` is set
**Expected:** Signature verified; `add_credits` RPC called with `p_amount` from metadata; credits added to user account; PostHog `credits_purchased` event fired
**Error shown:** None (no user-visible error; 200 returned to Stripe)
**Credits:** Added to user balance

---

**Action:** Stripe webhook fires
**Condition:** `STRIPE_WEBHOOK_SECRET` is NOT set (local dev)
**Expected:** Warning logged; body parsed as raw JSON without signature verification
**Error shown:** None (silent bypass)
**Credits:** Added if parsing succeeds

---

**Action:** Stripe webhook fires with invalid signature
**Condition:** `STRIPE_WEBHOOK_SECRET` is set but signature does not match
**Expected:** 400 `"Webhook Error: <message>"`
**Error shown:** None to user; Stripe will retry
**Credits:** Not added

---

**Action:** Stripe webhook fires for `checkout.session.completed`
**Condition:** `userId` or `credits` missing from `session.metadata`
**Expected:** 200 returned to Stripe (to prevent retries); credits NOT added; error logged
**Error shown:** None to user
**Credits:** Not added

---

**Action:** Stripe webhook fires and `add_credits` RPC fails (DB error)
**Condition:** Supabase error during RPC call
**Expected:** 500 `"Database Error"` returned to Stripe; Stripe will retry
**Error shown:** None to user
**Credits:** Not added (Stripe will retry)

---

> ⚠️ **NOT HANDLED — Webhook Idempotency**: If the same `checkout.session.completed` event fires twice (Stripe retry after a 500), `add_credits` will be called twice with the same `stripe_session_id` metadata. There is no deduplication check in the webhook handler — the same credits could be added twice.

---

**Action:** User completes payment; navigates to success page
**Condition:** `?session_id=` query param present in URL
**Expected:** Success page shown at `/dashboard/billing/success`
**Error shown:** ⚠️ NOT VERIFIED — success page not in files read
**Credits:** Already added via webhook

---

**Action:** User cancels Stripe checkout
**Condition:** Clicks "Back" or browser back on Stripe checkout page
**Expected:** Redirect to `/dashboard/billing/cancel`
**Error shown:** ⚠️ NOT VERIFIED — cancel page not in files read
**Credits:** Not deducted

---

**Action:** User views their credit balance
**Condition:** Authenticated; balance displayed in sidebar and on pricing page
**Expected:** Real-time balance from `useAuth` hook; refreshed after every Whisper transcription
**Error shown:** None
**Credits:** Display only

---

**Action:** New user completes onboarding
**Condition:** Welcome credits not yet claimed; `claim_welcome_reward` RPC called atomically
**Expected:** 5 free credits added; `profiles.welcome_reward_claimed` set to true
**Error shown:** ⚠️ NOT VERIFIED from code read — onboarding route not in files read
**Credits:** +5 welcome credits (one-time, atomic, double-claim prevented)

---

## 6. Authentication

---

**Action:** New user signs up with email/password
**Condition:** Email is not disposable; signup rate limit not exceeded; email not already registered
**Expected:** Account created; onboarding flow shown; 5 welcome credits awarded via `claim_welcome_reward` RPC
**Error shown:** None on success
**Credits:** +5 welcome credits

---

**Action:** New user signs up with email/password
**Condition:** Disposable email address used (e.g., mailinator, guerrillamail)
**Expected:** Signup rejected
**Error shown:** ⚠️ NOT VERIFIED from code read — disposable email blocking referenced in STATUS.md but auth routes not read
**Credits:** N/A

---

**Action:** New user signs up
**Condition:** Email already registered
**Expected:** Signup rejected
**Error shown:** ⚠️ NOT VERIFIED from code read — auth routes not read
**Credits:** N/A

---

**Action:** New user signs up
**Condition:** Signup rate limit exceeded (>5/1h from same IP; Upstash configured)
**Expected:** Request rejected
**Error shown:** ⚠️ NOT VERIFIED from code read — auth route using `limiters.signup` not read
**Credits:** N/A

---

**Action:** User signs up or logs in with Google OAuth
**Condition:** Google account not already linked; OAuth flow completes
**Expected:** Account created/matched; session established; redirect to dashboard or onboarding
**Error shown:** ⚠️ NOT VERIFIED from code read — OAuth callback route not read
**Credits:** +5 welcome credits on first login (if onboarding flow runs)

---

**Action:** User logs in with email/password
**Condition:** Correct credentials; login rate limit not exceeded
**Expected:** Session established via Supabase SSR; server-side hydration with no flicker
**Error shown:** None
**Credits:** N/A

---

**Action:** User logs in with email/password
**Condition:** Incorrect credentials
**Expected:** Login rejected
**Error shown:** ⚠️ NOT VERIFIED from code read — auth routes not read
**Credits:** N/A

---

**Action:** User logs in
**Condition:** Login rate limit exceeded (>10/15min from same IP; Upstash configured)
**Expected:** Request rejected
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** N/A

---

**Action:** Authenticated user's session cookie is present but invalid/expired
**Condition:** `supabase.auth.getUser()` in middleware returns no user
**Expected:** Dashboard routes: redirect to `/login`; Admin routes: redirect to `/dashboard`
**Error shown:** Redirect
**Credits:** N/A

---

**Action:** User requests a password reset
**Condition:** Email exists in Supabase auth
**Expected:** Password reset email sent; user can complete reset flow
**Error shown:** ⚠️ NOT VERIFIED from code read — password reset route not read
**Credits:** N/A

---

**Action:** User changes password from account settings
**Condition:** Current password correct; new password meets policy
**Expected:** Password updated in Supabase auth
**Error shown:** ⚠️ NOT VERIFIED from code read
**Credits:** N/A

---

## 7. Admin Dashboard

### 7.1 Access Control

---

**Action:** Any user navigates to `/admin/*`
**Condition:** User is not authenticated OR `user.email !== process.env.ADMIN_EMAIL`
**Expected:** Middleware redirects to `/dashboard`; layout also redirects to `/dashboard` as a second gate
**Error shown:** Redirect (no error page)
**Credits:** N/A

---

**Action:** Admin navigates to `/admin`
**Condition:** Authenticated as admin email
**Expected:** Overview page with metrics: Total Users, Total Transcripts, Credits Purchased/Consumed, Active (7d), Revenue, New Users (7d), Paying Users, Conversion %, Whisper Usage %, Credits Balance; Recent Transcripts (last 20); Top 10 Users by transcript count
**Error shown:** None
**Credits:** N/A

---

### 7.2 User Management (`/admin/users`)

---

**Action:** Admin views users list
**Condition:** Users exist in `auth.users`
**Expected:** Paginated table (50/page) with email, username, role, credit balance, total purchased, join date, last active, suspension status; search by email or UUID
**Error shown:** None
**Credits:** N/A

---

**Action:** Admin clicks "View" on a user row
**Condition:** Row expanded; "Load details" button clicked
**Expected:** `GET /api/admin/user-detail` fetches user's transcripts and credit transaction history
**Error shown:** None on success; ⚠️ NOT VERIFIED error handling
**Credits:** N/A

---

**Action:** Admin clicks "Add Credits" for a user
**Condition:** Enters amount (positive integer) and optional reason
**Expected:** `POST /api/admin/add-credits` → credits added; balance updated in UI optimistically; success banner shown
**Error shown:** Banner: `"Added N credits to user@email.com"` on success; error banner with message on failure
**Credits:** Added to user's balance

---

**Action:** Admin clicks "Add Credits" with invalid amount (0, negative, non-numeric)
**Condition:** `parseInt(amount)` fails or is ≤ 0
**Expected:** Modal shows error; no API call made
**Error shown:** StatusBanner: `"Enter a valid amount"` (red)
**Credits:** Not added

---

**Action:** Admin clicks "Suspend" on an active user
**Condition:** User is not currently suspended
**Expected:** `POST /api/admin/suspend-user` with `{ suspend: true }`; badge changes to "suspended"; success banner shown; user's write-path API calls will now return 403
**Error shown:** Success banner: `"Suspended user@email.com"`; error banner on failure
**Credits:** N/A

---

**Action:** Admin clicks "Unsuspend" on a suspended user
**Condition:** User is currently suspended
**Expected:** `POST /api/admin/suspend-user` with `{ suspend: false }`; badge changes to "active"; success banner
**Error shown:** Success banner: `"Unsuspended user@email.com"`; error banner on failure
**Credits:** N/A

---

**Action:** Admin clicks "Delete" on a user and confirms
**Condition:** User exists
**Expected:** `POST /api/admin/delete-user` → `delete_user_cascade(user_id)` RPC removes all user data (transcripts, credits, auth record); page reloads
**Error shown:** Success banner: `"Deleted user@email.com"`; error banner on failure; page reload on success
**Credits:** All user credits/transactions deleted as part of cascade

---

### 7.3 Credit Management (`/admin/credits`)

---

**Action:** Admin views credits page
**Condition:** Transactions exist
**Expected:** Summary metrics (Total Purchased, Consumed, Net Balance, Transaction Count); paginated transaction log (50/page) with type/amount/reason/metadata; filters by type (credit/debit), date range; CSV export
**Error shown:** None
**Credits:** N/A

---

**Action:** Admin downloads CSV export
**Condition:** Transactions are loaded
**Expected:** CSV file downloaded with transaction data including user emails
**Error shown:** ⚠️ NOT VERIFIED from code read — `CreditsCsvExport` component not read
**Credits:** N/A

---

### 7.4 Transcript Management (`/admin/transcripts`)

---

**Action:** Admin views transcripts page
**Condition:** Transcripts exist
**Expected:** Paginated table (50/page) with user, title, method, source, credits used, date; filters by method and date range; "View" link to `/admin/transcripts/[id]`; "Delete" button per row
**Error shown:** None
**Credits:** N/A

---

**Action:** Admin clicks "Delete" on a transcript
**Condition:** Transcript exists
**Expected:** `POST /api/admin/delete-transcript` → transcript deleted from Supabase; `TranscriptDeleteButton` component handles UI
**Error shown:** ⚠️ NOT VERIFIED from code read — `TranscriptDeleteButton` not read
**Credits:** No refund issued for deleted transcript

---

### 7.5 Paid Users (`/admin/paid-users`)

---

**Action:** Admin views paid users page
**Condition:** Users have made Stripe purchases
**Expected:** Summary metrics (Total Revenue, Paying Users, ARPU, Avg Credits/Purchase); paginated table sorted by total paid descending; "View" link to users search; "PostHog →" deep-link per user
**Error shown:** None
**Credits:** N/A

---

**Action:** Admin views paid users page
**Condition:** No Stripe purchases in DB
**Expected:** `"No purchase data found."` plain text message
**Error shown:** Text message only
**Credits:** N/A

---

## 8. Error States & Edge Cases Summary

### Suspended User Enforcement Matrix

| Route | Suspension Check | Response on Suspension |
|-------|-----------------|------------------------|
| `POST /api/extract` | ✅ Yes | 403 `"Account suspended. Contact support@indxr.ai"` |
| `POST /api/transcribe/whisper` | ✅ Yes | 403 JSON (before SSE stream starts) |
| `POST /api/playlist/info` | ✅ Yes | 403 |
| `POST /api/stripe/checkout` | ❌ No | ⚠️ NOT HANDLED — suspended user can initiate Stripe checkout |
| `POST /api/ai/summarize` | ⚠️ NOT VERIFIED from code read (Next.js summarize route not read) | — |

---

### Credit Deduction / Refund Reference

| Operation | Deducted | When | Refund Condition |
|-----------|----------|------|-----------------|
| YouTube captions extraction | Never | — | — |
| Whisper (YouTube or upload) | Yes | After successful transcription, during `saving` SSE event | Never — deduction only on success |
| AI Summary | Yes | Before API call (atomic deduction first) | Transcript not found / empty text / missing API key / DeepSeek error / network exception |
| Admin manual add | Added | On admin action | — |
| Welcome credits | Added | On onboarding completion | — |

---

### Known Gaps

| # | Gap | Location |
|---|-----|----------|
| 1 | AudioTab calls `response.json()` on what is now an SSE stream — upload transcription path broken for successful requests | `AudioTab.tsx:180` |
| 2 | Rate limiting entirely disabled (noopLimiter) when Upstash env vars not set — currently the case in production per STATUS.md | `ratelimit.ts` |
| 3 | Stripe checkout not blocked for suspended users | `checkout/route.ts` |
| 4 | Webhook has no idempotency guard — same session_id can add credits twice if Stripe retries | `webhook/route.ts` |
| 5 | `metadataOnly: true` sent by VideoTab is silently ignored by `/api/extract` — does full extraction just to get duration/title | `extract/route.ts`, `VideoTab.tsx:307` |
| 6 | Playlist with 0 successful extractions shows no failure banner | `PlaylistTab.tsx:150–155` |
| 7 | AudioTab: if `onTranscriptLoaded` prop is undefined, `saveStatus` gets stuck at `'saving'` | `AudioTab.tsx:221–231` |
| 8 | Suspended user enforcement on `/api/ai/summarize` (Next.js route) not verified | Not in files read |
| 9 | CORS in `main.py` only allows `localhost:3000` and `localhost:3001` — production Vercel domain is not in the allow-list | `main.py:70–74` |
| 10 | Private/deleted/unavailable videos have no dedicated error code — treated as generic errors | `main.py:457–462` |
| 11 | Deduction failure after successful Whisper transcription: transcript displayed in-memory but not persisted; `onTranscriptLoaded` never called | `VideoTab.tsx:handleWhisperConfirm` |
| 12 | Rate limit on `/api/transcribe/whisper`, `/api/playlist/info`, and `/api/stripe/checkout` is not applied | `ratelimit.ts` (only used in `extract/route.ts`) |

---

*Total interactions mapped: **112** · ⚠️ NOT HANDLED / NOT VERIFIED gaps found: **28** · File written: `docs/INTERACTION_MAP.md`*
