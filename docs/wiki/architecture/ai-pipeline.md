# AI Pipeline

## Overzicht

INDXR.AI heeft twee AI-pipelines:
1. **Transcript extractie** — YouTube captions of audio-transcriptie
2. **AI samenvatting** — DeepSeek V3 op bestaand transcript

---

## Pipeline 1: Transcript Extractie

### Happy path (captions beschikbaar)

```
Frontend
  └─ POST /api/extract (Next.js)
       ├─ Zod validatie (YouTube URL)
       ├─ Auth check (Supabase)
       ├─ Suspension check
       ├─ Rate limit check (Upstash Redis)
       └─ POST {PYTHON_BACKEND_URL}/api/extract/youtube
            └─ Python backend:
                 ├─ yt-dlp: extract captions (VTT format)
                 ├─ VTT overlap-deduplicatie (LCS algoritme)
                 ├─ Normaliseer naar [{text, offset, duration}]
                 └─ Return {transcript, title, duration, video_url}
  └─ Next.js slaat op in Supabase (transcripts tabel)
  └─ Return naar frontend
```

**Tijdsduur:** 1–5 seconden  
**Kosten:** 0 credits

### Fallback path (geen captions → audio transcriptie)

```
Frontend
  └─ POST /api/transcribe/whisper (Next.js)
       ├─ Auth + suspension check
       ├─ Stuurt duration mee als form-veld (indien bekend van metadata-fetch)
       └─ POST {PYTHON_BACKEND_URL}/api/transcribe/whisper
            ├─ Endpoint pre-check: check_user_balance ≥ ceil(duration/60)
            │    (valt terug op ≥ 1 als duration niet meegestuurd)
            │    → 402 bij onvoldoende credits (vóór audio-download)
            └─ Python backend (asynchroon):
                 ├─ yt-dlp: download audio (best quality, no video)
                 ├─ Valideer: MembersOnlyVideoError check
                 ├─ ffmpeg: compress naar 12kbps Opus/OGG
                 ├─ Valideer bestandsgrootte en duur
                 ├─ Exacte credit-check + deduct_credits_atomic(ceil(duur/60))
                 ├─ POST audio naar AssemblyAI API
                 ├─ Bij leeg transcript (geen spraak): job→error "no_speech_detected",
                 │    credits automatisch teruggestort via finally-blok
                 └─ Sla transcript op in Supabase, markeer job complete

Frontend pollt GET /api/jobs/{job_id} elke 3 seconden
  └─ Bij status "error" + error_message "no_speech_detected":
       toont inline card "No speech detected" met bevestiging dat credits teruggestort zijn
  └─ Wanneer klaar: normaliseer transcript → sla op in Supabase
  └─ Return {status: 'completed', transcript}
```

**Tijdsduur:** 1–10 minuten  
**Kosten:** ⌈duur_seconden / 60⌉ credits (1 credit per minuut, minimum 1)  
**Bij fout (incl. geen spraak):** credits automatisch teruggestort

---

## Pipeline 2: AI Samenvatting

### Flow

```
Frontend
  └─ POST /api/ai/summarize (Next.js)
       └─ POST {PYTHON_BACKEND_URL}/api/summarize
            └─ Python backend:
                 ├─ check_user_balance(user_id) — ≥3 credits?
                 ├─ deduct_credits_atomic(user_id, 3, "AI Summarization")
                 ├─ Haal transcript op uit Supabase
                 ├─ Combineer alle {text} velden tot volledige tekst
                 ├─ POST naar DeepSeek API:
                 │    model: "deepseek-chat"
                 │    response_format: {"type": "json_object"}
                 │    timeout: 120s
                 ├─ Parse JSON: {text, action_points}
                 ├─ Sla op als ai_summary JSONB in transcripts tabel:
                 │    {text, action_points, generated_at, edited: false}
                 └─ Bij ELKE fout: add_credits(user_id, 3, "Refund: ...")

Frontend: toont samenvatting in Summary tab
```

**Tijdsduur:** 5–30 seconden  
**Kosten:** 3 credits (automatisch teruggestort bij fout)

### System Prompt

```
"You are a helpful assistant that summarizes transcripts. 
Output JSON with two keys: 'text' (a summary paragraph) and 
'action_points' (an array of strings representing key takeaways). 
Let the length be determined by the content."
```

### Output Formaat

```json
{
  "text": "Samenvattingsparagraaf...",
  "action_points": [
    "Key takeaway 1",
    "Key takeaway 2"
  ],
  "generated_at": "2026-04-13T12:00:00Z",
  "edited": false
}
```

Het `edited` veld wordt `true` zodra de gebruiker de samenvatting aanpast in de Tiptap editor.

### Audio Upload path

Gebruikers kunnen een lokaal audiobestand uploaden (MP3, MP4, WAV, M4A, OGG, FLAC, WEBM, MPEG, MPGA — max 500MB). Dit gaat via een aparte flow die de Vercel bodylimiet van 4.5MB omzeilt:

```
Frontend (AudioTab.tsx)
  └─ POST /api/transcribe/preflight (Next.js) — auth + rate check, geen bestand
  └─ GET supabase.auth.getSession() — haalt JWT op
  └─ POST {NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/transcribe/whisper (direct naar Railway)
       Headers: Authorization: Bearer <supabase-jwt>
       Body: FormData { source_type: 'upload', audio_file: <file> }
       └─ verify_backend_secret: slaat X-Backend-Secret check OVER als Bearer header aanwezig
          → JWT wordt gevalideerd in de endpoint body zelf
       └─ Verder identiek aan YouTube Whisper path (AssemblyAI job)

Frontend pollt GET /api/jobs/{job_id} (via Next.js proxy) elke 3 seconden
  └─ Response bevat ook: created_at (voor elapsed timer na page refresh + Resume)
```

**Beveiligingsaspect:** De browser kan geen server-side `BACKEND_API_SECRET` meesturen. De JWT (Supabase session token) vervangt de secret-check voor dit pad. De upload is dus beveiligd via Supabase JWT, niet via het gedeelde backend-secret.

**SessionStorage recovery:** Bij page refresh wordt `indxr-active-audio-job` uit sessionStorage gelezen. De frontend haalt de job status op (inclusief `created_at`) en berekent de elapsed tijd zodat de timer na Resume op de juiste positie start.

---

## VTT Overlap Deduplicatie

YouTube VTT captions bevatten een bekende quirk: opeenvolgende segmenten overlappen in tekst. Voorbeeld:

```
Segment 1: "Hello this is a"
Segment 2: "this is a test video"  ← "this is a" is dubbel
```

De backend gebruikt een **Longest Common Substring (LCS)** algoritme met sliding window (previous, current, next) om overlappen te detecteren en te verwijderen. Implementatie: `backend/main.py:212-261`.

**Performance:** O(N) sliding window, niet O(N²) naïeve vergelijking.

---

## AssemblyAI Modellen

INDXR.AI gebruikt de volgende modellen voor AI-transcriptie:

| Model | Talen | Gebruik |
|-------|-------|---------|
| **Universal-3 Pro** | EN, ES, DE, FR, PT, IT | Primair — voor de zes ondersteunde talen |
| **Universal-2** | 99 talen | Automatisch fallback — voor alle overige talen |

**Waarom beter dan YouTube auto-captions:**
- Verwerkt de audio opnieuw (vervangt niet bestaande captions)
- Beter bij accenten, achtergrondgeluid, snel gesproken tekst
- Universal-3 Pro heeft tot 99% woordnauwkeurigheid op helder gesproken Engels

**FAQ-tekst voor gebruikers:**
> "INDXR.AI's AI-transcriptie gebruikt AssemblyAI Universal-3 Pro, een van de meest nauwkeurige spraakherkenningsmodellen ter wereld. Voor video's in Engels, Spaans, Duits, Frans, Portugees of Italiaans wordt Universal-3 Pro gebruikt. Voor alle andere talen schakelt het systeem automatisch over naar Universal-2, dat 99 talen ondersteunt."

---

## Audio Format Optimalisatie

**Huidig (pending wijziging):** `bestaudio/best` → selecteert Opus 251 (~128–160 kbps, ~1.0 MB/min)

**Gepland (ADR-016):** `249/250/251/bestaudio/best` → selecteert Opus 249 (~50 kbps, ~0.37 MB/min)

Vóór deploy naar productie: valideer transcriptie-kwaliteit op 50 diverse video's. Zie [ADR-016](../decisions/016-opus-249-audio-format.md).

---

## Error Types

De backend classificeert YouTube-fouten naar canonical slugs (`main.py:1233-1246`):

| error_type | Trigger |
|-----------|---------|
| `members_only` | Members-only video gedetecteerd |
| `age_restricted` | Leeftijdsbeperking vereist inloggen |
| `bot_detection` | YouTube 429 / bot-check triggered |
| `timeout` | Request timeout (>60s) |
| `youtube_restricted` | Video unavailable (gelimiteerd land, etc.) |
| `extraction_error` | Generieke fout |

Frontend toont per `error_type` een specifieke gebruikersboodschap.

---

## Proxy Configuratie (optioneel)

Voor omzeilen van YouTube IP-bans kan een proxy geconfigureerd worden:

```env
PROXY_ENABLED=true
PROXY_HOST=gate.decodo.com
PROXY_PORT=12321
PROXY_USERNAME=username
PROXY_PASSWORD=password
```

Sticky sessions worden via de **username-suffix** opgegeven: `user-{PROXY_USERNAME}-session-{session_id}`. Huidige provider: Decodo residentieel (10GB plan, overgestapt 2026-04-20). Zie [ADR-017](../decisions/017-proxy-provider-decodo.md).

**Implementatiedetail:** `extract_with_ytdlp(video_id, use_proxy=True, session_id=...)` geeft de session_id door aan `get_proxy_url(session_id)`. De proxy wordt op twee niveaus gebruikt:

1. **yt-dlp metadata call** — proxy via `ydl_opts['proxy']`
2. **VTT httpx download** — proxy via `httpx.Client(proxy=proxy_url)` (zelfde session_id)

Binnen een playlist-job krijgt elke video een unieke session_id: `f"{job_id[:4]}{idx:04d}"` (bijv. `abcd0000`, `abcd0001`). Dit zorgt voor een ander exit-IP per video, zodat een rate-limited video de rest van de job niet blokkeert. De retry-pass gebruikt `video_ids.index(vid)` als index, waardoor hetzelfde exit-IP als de eerste poging beschikbaar is.

**Gevalideerd 2026-04-16:** 20-video playlist (Introduction to Psychology, Paul Bloom) — 20/20 succesvol, 2:21, nul VTT-fouten.
