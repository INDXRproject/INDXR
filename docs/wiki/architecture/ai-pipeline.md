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
       └─ POST {PYTHON_BACKEND_URL}/api/transcribe/whisper
            └─ Python backend (asynchroon):
                 ├─ yt-dlp: download audio (best quality, no video)
                 ├─ Valideer: MembersOnlyVideoError check
                 ├─ ffmpeg: compress naar 12kbps Opus/OGG
                 │    (minimale bestandsgrootte voor API upload)
                 ├─ Valideer bestandsgrootte en duur
                 ├─ POST audio naar AssemblyAI API
                 ├─ Ontvang job_id van AssemblyAI
                 └─ Sla job op in Supabase (status: processing)

Frontend pollt GET /api/jobs/{job_id} elke 2 seconden
  └─ GET {PYTHON_BACKEND_URL}/api/jobs/{job_id}
       └─ Controleer AssemblyAI job status
       └─ Wanneer klaar: normaliseer transcript → sla op in Supabase
       └─ Return {status: 'completed', transcript}
```

**Tijdsduur:** 1–10 minuten  
**Kosten:** ⌈duur_min / 10⌉ credits

---

## Pipeline 2: AI Samenvatting

### Flow

```
Frontend
  └─ POST /api/ai/summarize (Next.js)
       └─ POST {PYTHON_BACKEND_URL}/api/summarize
            └─ Python backend:
                 ├─ check_user_balance(user_id) — ≥1 credit?
                 ├─ deduct_credits_atomic(user_id, 1, "AI Summarization")
                 ├─ Haal transcript op uit Supabase
                 ├─ Combineer alle {text} velden tot volledige tekst
                 ├─ POST naar DeepSeek API:
                 │    model: "deepseek-chat"
                 │    response_format: {"type": "json_object"}
                 │    timeout: 120s
                 ├─ Parse JSON: {text, action_points}
                 ├─ Sla op als ai_summary JSONB in transcripts tabel:
                 │    {text, action_points, generated_at, edited: false}
                 └─ Bij ELKE fout: add_credits(user_id, 1, "Refund: ...")

Frontend: toont samenvatting in Summary tab
```

**Tijdsduur:** 5–30 seconden  
**Kosten:** 1 credit (automatisch teruggestort bij fout)

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
PROXY_HOST=rotating.proxy.io
PROXY_PORT=12321
PROXY_USERNAME=username
PROXY_PASSWORD=password_session-{job_id[:8]}_lifetime-10m
```

Sticky sessions worden via de wachtwoord-suffix opgegeven (`_session-X_lifetime-10m`). Ondersteunde providers: LunaProxy, IPRoyal, BrightData.
