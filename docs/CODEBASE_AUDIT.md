> ⚠️ VEROUDERD — Vervangen door [docs/AUDIT_REPORT_2026-04-26.md](AUDIT_REPORT_2026-04-26.md)
> Gegenereerd op 2026-04-14, vóór de RAG JSON, channel/language,
> en TranscriptCard refactors van april 2026.

# Codebase Audit — INDXR.AI V2

Gegenereerd: 2026-04-14. Gebaseerd op directe lezing van alle bronbestanden.

---

## 1. Geïmplementeerde features (met bestandsreferenties)

### Caption-extractie (gratis, anoniem + ingelogd)
- **Frontend:** `src/components/free-tool/VideoTab.tsx` — YouTube URL invoer, yt-dlp extractie
- **Next.js route:** `src/app/api/extract/route.ts` — rate limiting, suspension check, doorsturen naar backend
- **Backend endpoint:** `POST /api/extract/youtube` in `backend/main.py:467`
- **Rate limits:**
  - Anoniem: 10/dag per IP (Upstash Redis, noop als niet geconfigureerd)
  - Ingelogd gratis: 50/uur
  - Premium (ooit gekocht): onbeperkt

### AI-transcriptie via AssemblyAI (betaald)
- **Frontend:** `src/components/free-tool/VideoTab.tsx` (YouTube pad), `src/components/free-tool/AudioTab.tsx` (upload pad)
- **Next.js route:** `src/app/api/transcribe/whisper/route.ts` — auth + rate limit check
- **Preflight route:** `src/app/api/transcribe/preflight/route.ts` — auth/rate check vóór directe upload naar Railway (bypast Vercel 4.5MB limiet)
- **Backend endpoint:** `POST /api/transcribe/whisper` in `backend/main.py:947`
- **Job polling:** `GET /api/jobs/{job_id}` → `backend/main.py:1058`
- **Kosten:** `math.ceil(duration_seconds / 60.0)` credits, minimum 1 — `backend/credit_manager.py:35-55`
- **Max upload:** 500 MB
- **Statusvolgorde:** pending → downloading → transcribing → saving → complete/error
- **Truncatiedetectie:** Waarschuwt als audio > 60s niet getranscribeerd is
- **Refund:** Automatisch bij elke fout ná credit-aftrek

### AI-samenvatting via DeepSeek V3 (betaald, 3 credits)
- **Frontend:** `src/components/library/TranscriptViewer.tsx:592` — "Generate Summary" knop
- **Next.js route:** `src/app/api/ai/summarize/route.ts`
- **Backend endpoint:** `POST /api/summarize` in `backend/main.py:1103`
- **Model:** `deepseek-chat` via `https://api.deepseek.com/chat/completions`
- **Output:** JSON `{text, action_points, generated_at, edited}`
- **Refund:** bij elk faalscenario (fetch, empty, API error, exception)

### Playlist-extractie (mix captions + Whisper)
- **Frontend:** `src/components/free-tool/PlaylistTab.tsx`, `src/components/PlaylistManager.tsx`
- **Next.js routes:** `POST /api/playlist/info`, `POST /api/playlist/extract`, `GET /api/playlist/jobs/[jobId]`
- **Backend endpoints:** `POST /api/playlist/info:551`, `POST /api/playlist/extract:1508`, `GET /api/playlist/jobs/{job_id}:1544` — allemaal in `backend/main.py`
- **Playlist info:** YouTube Data API primary, yt-dlp fallback
- **Extractie:** Asynchroon background task, pollt elke ~2–3 seconden
- **Retry:** Bot-detection en timeout worden 1x herhaald na 30s delay
- **Sessie-herstel:** `sessionStorage` key `indxr-active-playlist-job` — herstelt na page reload
- **Max:** 500 video's per playlist (yt-dlp limiet)

### Video metadata ophalen
- **Next.js route:** `GET /api/video/metadata/[videoId]/route.ts`
- **Backend endpoint:** `GET /api/video/metadata/{video_id}:646` — YouTube Data API primary, yt-dlp fallback

### Playlist beschikbaarheidscheck
- **Next.js route:** `POST /api/check-playlist-availability/route.ts`
- Checkt per video of captions beschikbaar zijn (concurrency: 5 tegelijk)
- Categoriseert errors: deleted, private, geo_blocked, member_only, restricted, unknown

### Library (transcript beheer)
- **Pagina:** `src/app/dashboard/library/page.tsx` — overzicht, zoeken, grid/list view
- **Detail:** `src/app/dashboard/library/[id]/page.tsx` — TranscriptViewer laden
- **Component:** `src/components/library/TranscriptViewer.tsx` — Tiptap editor, search, download, copy, delete, samenvatting
- **Collections:** `src/components/library/CollectionPanel.tsx` — mappen voor transcripts

### Export-formaten (implementatiestatus: zie Sectie 4)
Geïmplementeerd in code:
- **TXT** — met/zonder timestamps, paragraph mode
- **SRT** — `HH:MM:SS,mmm --> HH:MM:SS,mmm` formaat
- **VTT** — `HH:MM:SS.mmm` formaat, WEBVTT header
- **JSON** — `{metadata, transcript[]}` structuur
- **CSV** — `Start,Duration,Text` kolommen
- **Edited TXT** — plain text van Tiptap edited content
- **Edited MD** — Markdown van Tiptap edited content

Geïmplementeerd in twee plaatsen:
- `src/utils/formatTranscript.ts` — gebruikt door TranscriptViewer (library)
- `src/components/TranscriptCard.tsx` — lokale implementaties voor free-tool resultaat

### Tiptap rich-text editor (library)
- **Bestand:** `src/components/library/TranscriptViewer.tsx`
- Twee modi: Original (read-only of editable), Edited
- Custom `SearchExtension` met highlight en navigatie
- Sla op als `edited_content` JSONB in `transcripts` tabel
- `immediatelyRender: false` — SSR-safe

### Stripe-betalingen
- **Checkout:** `POST /api/stripe/checkout/route.ts`
- **Webhook:** `POST /api/stripe/webhook/route.ts`
- **Pakketten (server-side):**
  | Key | Naam | Prijs | Credits |
  |-----|------|-------|---------|
  | try | Try Package | €2.49 | 200 |
  | basic | Basic Package | €5.99 | 500 |
  | plus | Plus Package | €11.99 | 1.100 |
  | pro | Pro Package | €24.99 | 2.600 |
  | power | Power Package | €49.99 | 5.500 |
- Credits worden toegevoegd via `add_credits` RPC na `checkout.session.completed` webhook event
- Signature-verificatie: altijd als `STRIPE_WEBHOOK_SECRET` aanwezig is

### Auth
- **Supabase Auth:** email + Google OAuth
- **Middleware:** `src/middleware.ts` — `updateSession()` op elke request
- **Context:** `src/contexts/AuthContext.tsx` — user, profile, credits, quota, loading, refreshCredits
- **Signup flow:** `src/app/signup/page.tsx` → `src/app/onboarding/page.tsx`
- **Suspended check:** in elke API route + Python upload path

### Welcome credits (25 credits, eenmalig)
- **Server Action:** `src/app/actions/credits.ts` — `claimWelcomeRewardAction()`
- **RPC:** `claim_welcome_reward(p_user_id)` — atomisch idempotent
- **UI:** `src/components/dashboard/WelcomeCreditCard.tsx`

### Admin panel
- **Routes:** `src/app/admin/` — users, transcripts, credits, paid-users
- **API endpoints:**
  - `POST /api/admin/add-credits` — credits toekennen
  - `POST /api/admin/suspend-user` — account suspenderen/activeren
  - `POST /api/admin/delete-user` — cascade-verwijdering user + data
  - `GET /api/admin/user-detail` — profiel + credit history (max 50 rijen)
  - `POST /api/admin/delete-transcript` — enkel transcript verwijderen
- **Auth:** `user.email === process.env.ADMIN_EMAIL`

### Free-tool pagina's (SEO-landing pages)
- `src/app/youtube-transcript-generator/page.tsx`
- `src/app/youtube-transcript-downloader/page.tsx`
- `src/app/youtube-srt-download/page.tsx`
- `src/app/youtube-transcript-without-extension/page.tsx`
- `src/app/bulk-youtube-transcript/page.tsx`
- `src/app/youtube-playlist-transcript/page.tsx`
- `src/app/audio-to-text/page.tsx`
- `src/app/alternative/downsub/page.tsx`, `src/app/alternative/tactiq/page.tsx`

### Rate limiting
- **Bestand:** `src/lib/ratelimit.ts`
- Upstash Redis (sliding window), noop als niet geconfigureerd
- Anoniem: 10/24h per IP
- Free user: 50/1h per userId
- Premium (ooit gekocht): bypass
- Login: 10/15min, Signup: 5/1h

### Proxy (IPRoyal/Decodo)
- **Bestand:** `backend/main.py:110-210`
- Provider-agnostisch (env vars)
- Sticky sessions via `_session-{job_id[:8]}_lifetime-10m` wachtwoord-suffix
- `PROXY_ENABLED=false` standaard

### bgutil-pot (PO tokens voor YouTube)
- **Binary:** `backend/bin/bgutil-pot-linux-x86_64`
- Start op port 4416 bij app startup
- Socket-probe: alleen eerste worker start de binary

### PostHog analytics
- **Backend events:** `track_event()` in `backend/main.py` — whisper_started, whisper_completed, whisper_failed, credits_deducted, summarization_completed
- **Webhook:** credits_purchased
- **Frontend:** posthog-js import in diverse componenten (export_clicked, etc.)

---

## 2. Export-formaten: beschikbaarheid per gebruikersklasse

### `TranscriptCard` (free-tool resultaat)
| Formaat | Anoniem | Ingelogd gratis | Betaald |
|---------|---------|-----------------|---------|
| TXT | ✓ | ✓ | ✓ |
| JSON | ✓ | ✓ | ✓ |
| CSV | ✓ | ✓ | ✓ |
| SRT | ✓ | ✓ | ✓ |
| VTT | ✓ | ✓ | ✓ |

**⚠️ Geen login-check geïmplementeerd.** Alle formaten beschikbaar voor iedereen.

### `TranscriptViewer` (library, ingelogd vereist voor toegang)
| Formaat | Ingelogd gratis | Betaald |
|---------|-----------------|---------|
| TXT (origineel) | ✓ | ✓ |
| JSON | ✓ | ✓ |
| CSV | ✓ | ✓ |
| SRT | ✓ | ✓ |
| VTT | ✓ | ✓ |
| Edited TXT | ✓ (als edits opgeslagen) | ✓ |
| Edited MD | ✓ (als edits opgeslagen) | ✓ |

De library is sowieso alleen toegankelijk voor ingelogde gebruikers (auth check in dashboard layout).

---

## 3. Alle API endpoints

### Next.js (Vercel)

| Route | Methode | Auth vereist | Beschrijving |
|-------|---------|--------------|-------------|
| `/api/extract` | POST | Nee | Caption-extractie YouTube (proxy naar backend) |
| `/api/transcribe/whisper` | POST | Ja | Start Whisper job (YouTube pad) |
| `/api/transcribe/preflight` | POST | Ja | Auth-check voor directe upload naar Railway |
| `/api/jobs/[job_id]` | GET | Ja | Poll Whisper job status |
| `/api/playlist/info` | POST | Optioneel | Playlist metadata ophalen |
| `/api/playlist/extract` | POST | Ja | Start playlist-extractie job |
| `/api/playlist/jobs/[jobId]` | GET | Ja | Poll playlist job status |
| `/api/video/metadata/[videoId]` | GET | Nee | Video titel + duur |
| `/api/check-playlist-availability` | POST | Optioneel | Captions vs Whisper check per video |
| `/api/ai/summarize` | POST | Ja | AI samenvatting (doorsturen naar backend) |
| `/api/stripe/checkout` | POST | Ja | Stripe Checkout Session aanmaken |
| `/api/stripe/webhook` | POST | (Stripe sig) | Credits toekennen na betaling |
| `/api/admin/add-credits` | POST | Admin | Credits toekennen |
| `/api/admin/suspend-user` | POST | Admin | Account suspenderen |
| `/api/admin/delete-user` | POST | Admin | User cascade-verwijderen |
| `/api/admin/delete-transcript` | POST | Admin | Transcript verwijderen |
| `/api/admin/user-detail` | GET | Admin | Profiel + transactiehistory |

### Python FastAPI (Railway)

| Endpoint | Methode | Beschrijving |
|----------|---------|-------------|
| `/health` | GET | Status check |
| `/api/extract/youtube` | POST | YouTube captions via yt-dlp |
| `/api/playlist/info` | POST | Playlist metadata (YouTube API + yt-dlp fallback) |
| `/api/playlist/extract` | POST | Start async playlist job |
| `/api/playlist/jobs/{job_id}` | GET | Poll playlist job |
| `/api/video/metadata/{video_id}` | GET | Video titel + duur |
| `/api/transcribe/whisper` | POST | Start Whisper/AssemblyAI job |
| `/api/jobs/{job_id}` | GET | Poll Whisper job |
| `/api/summarize` | POST | DeepSeek V3 samenvatting |

**Let op:** CLAUDE.md vermeldt `/api/extract` voor de backend, maar de werkelijke endpoint is `/api/extract/youtube`.

---

## 4. Bekende bugs zichtbaar in code

### Bug 1: Export-gating niet geïmplementeerd (ADR-014)
**Bestand:** `src/components/TranscriptCard.tsx`  
ADR-014 zegt: anoniem = TXT only, ingelogd = alle formaten.  
De code biedt TXT, JSON, CSV, SRT, VTT aan iedereen zonder enige login-check.

### Bug 2: Playlist "eerste 3 gratis" niet geïmplementeerd (ADR-010)
**Bestand:** `backend/main.py` — `run_playlist_job()`  
ADR-010 beschrijft: eerste 3 video's gratis per playlist-extractie.  
De backend-code heeft deze logica niet. Alle videos worden direct verwerkt zonder gratis tier.

### Bug 3: `BACKEND_API_SECRET` niet geïmplementeerd
**CLAUDE.md** beschrijft dit als kritiek shared secret tussen Next.js en Python backend, verstuurd als header bij elke server-to-server call.  
In de werkelijke Next.js API routes wordt deze header nergens verstuurd. Python backend valideert hem nergens.

### Bug 4: `has_ever_purchased` / `isPaidUser` niet geïmplementeerd
**credit-system.md wiki** beschrijft: na Stripe-aankoop wordt `has_ever_purchased = true` gezet in `profiles`, waarmee permanente premium-status verkregen wordt.  
Werkelijkheid: de Stripe webhook (`/api/stripe/webhook/route.ts`) voegt alleen credits toe via `add_credits` RPC. Het `has_ever_purchased` veld wordt nergens gezet.  
**AuthContext** heeft ook geen `isPaidUser` veld — de code bepaalt `isPremium` ad-hoc via `total_credits_purchased > 0` per API route.

### Bug 5: Playlist-quota UI vs. werkelijkheid
**WelcomeCreditCard** toont: "Quota: 50 Videos/month Free" voor playlists.  
**Backend:** Geen quotasysteem voor playlists. `get_user_credits` RPC geeft `playlist_quota_used`/`playlist_quota_remaining` terug, maar de backend implementeert dit niet in `run_playlist_job`.  
**AuthContext** fetcht quota-data maar gebruikt het niet om playlist-extractie te beperken.

### Bug 6: `processing_time_seconds` / `started_at` ontbreken in `transcription_jobs` insert
**Bestand:** `backend/main.py:1034`  
De insert bij job-aanmaak heeft `started_at` en `processing_time_seconds` niet. Worden later ingevuld door `update_job()` — gedrag is correct, maar de initiële insert is minimaal.

### Bug 7: `no_warnings` staat op False in audio_utils.py
**Bestand:** `backend/audio_utils.py` (~regel 113) — al gedocumenteerd in known-issues.md

### Bug 8: Hardcoded sticky session in sommige audio paths
**Bestand:** `backend/audio_utils.py` — al gedocumenteerd in known-issues.md

---

## 5. Dingen in code maar nog niet werkend/compleet

### `BACKEND_API_SECRET` verificatie
Staat beschreven in CLAUDE.md als kritiek, maar is niet geïmplementeerd in Next.js → Python calls of Python validatie.

### Playlist "eerste 3 gratis"
Ontworpen in ADR-010, "pending implementatie" status — niet aanwezig in `run_playlist_job`.

### Export-gating voor anonieme gebruikers
Ontworpen in ADR-014, "pending implementatie" status — `TranscriptCard` heeft geen login-check.

### "FREE" labels op eerste 3 playlist-video's
Staat in pre-launch checklist van `known-issues.md` — niet zichtbaar in `PlaylistManager.tsx`.

### `has_ever_purchased` in profiles
Beschreven in credit-system.md wiki, maar Stripe webhook zet dit veld niet.

### Upstash Redis rate limiting
`UPSTASH_REDIS_REST_URL` + token niet geconfigureerd lokaal → noop limiter actief.

### Supabase email verificatie
Uitgeschakeld voor development — moet re-enabled worden voor productie.

### `LOG_LEVEL=WARNING` in Railway
Staat in pre-launch checklist, waarschijnlijk nog op INFO.

### Duplicate transcript detectie
Geen uniekheidscontrole op `video_id + user_id` — credits verbruikt bij elke nieuwe extractie van hetzelfde video.

---

## 6. Dependencies

### Frontend (package.json)
- Next.js 16.1.4, React 19.2.3
- Tiptap 3.20 (rich-text editor)
- Supabase SSR 0.8 + supabase-js 2.90
- Stripe 20.2 + stripe-js 8.6
- Upstash ratelimit 2.0 + redis 1.36
- PostHog-js 1.335
- Zod 4.3, react-hook-form 7.71
- file-saver 2.0, jszip 3.10 (aanwezig maar gebruik niet zichtbaar in audit)
- openai 6.25 (aanwezig als dependency maar gebruik niet zichtbaar in huidige routes)
- Radix UI primitives (volledig)

### Backend (requirements.txt)
- FastAPI 0.128, uvicorn 0.40
- yt-dlp 2026.3.17
- assemblyai (geen versie gepind — let op)
- supabase 2.27
- posthog 7.6
- pydub 0.25, ffmpeg-python 0.2 (audio processing)
- httpx 0.28 (HTTP client)
- google-api-python-client 2.188 (YouTube Data API)
