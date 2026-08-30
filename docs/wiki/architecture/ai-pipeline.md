# AI Pipeline

## Overzicht

INDXR.AI heeft twee AI-pipelines:
1. **Transcript extractie** — YouTube captions of audio-transcriptie
2. **AI samenvatting** — AssemblyAI EU LLM Gateway (gemini-2.5-flash) op bestaand transcript

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
            └─ Python backend — cascade:
                 ├─ Stap 1: youtube-transcript-api (licht, geen yt-dlp)
                 │    ├─ Succes → YouTube Data API videos.list voor metadata (title, channel, duration, upload_date)
                 │    │    ├─ Metadata OK → lever stap 1 transcript + metadata
                 │    │    └─ Metadata mislukt (quota/netwerk) → gooi stap 1 weg, door naar stap 2
                 │    └─ Mislukking → door naar stap 2
                 ├─ Stap 2: yt-dlp ios/web_embedded — log-prefix [YT-DLP]
                 │    ├─ [YT-DLP] attempting {video_id}
                 │    ├─ VTT overlap-deduplicatie (LCS algoritme)
                 │    ├─ Normaliseer naar [{text, offset, duration}]
                 │    ├─ language: yt-dlp info.language → fallback: lingua-language-detector (13 talen, module-level)
                 │    ├─ upload_date geconverteerd naar ISO YYYY-MM-DD (→ published_at in frontend)
                 │    ├─ return {} (no_captions) → terminal "No captions found" — stap 3 NIET geprobeerd
                 │    ├─ MembersOnlyVideoError → re-raise direct naar 403 — stap 3 NIET geprobeerd
                 │    └─ Exception (bot_detection/timeout/extraction_error) → door naar stap 3
                 └─ Stap 3: yt-dlp tv/android (client-rotatie) — log-prefix [YT-DLP-ROT]
                      ├─ [CASCADE] {video_id}: step 2 failed (...), trying step 3 (tv/android)
                      ├─ Identiek aan stap 2 maar met player_client=['tv', 'android']
                      └─ [YT-DLP-ROT] success/no_captions/MembersOnly/error
  └─ Na succesvolle stap: master_transcripts_write (fire-and-forget)
       ├─ Stap 1: model="youtube_transcript_api", model_quality_rank=30
       ├─ Stap 2: model="youtube_captions", model_quality_rank=20
       └─ Stap 3: model="youtube_captions_rotated", model_quality_rank=15
  └─ Next.js slaat op in Supabase (transcripts tabel)
  └─ Return naar frontend
```

**Bij cascade-eind zonder succes**

Cascade Product 1 (caption extraction) eindigt met een `error_type`.
AI transcription is een apart Product 2 dat de user expliciet kiest via de "Generate with AI" knop in de UI.

Frontend toont AI-suggestie alleen bij `error_type`s waar het zinvol is:
- `no_captions` — JA (met disclaimer over no_speech refund)
- `bot_detection` — JA (twee opties: wachten of AI)
- `extraction_error` — JA
- `members_only` / `age_restricted` / `youtube_restricted` — NEE (yt-dlp kan video sowieso niet bereiken voor audio-download)

Zie [ADR-029](../decisions/029-caption-vs-ai-transcription-products.md) voor de architectuur-beslissing en `error-taxonomy.md` voor volledige classificatie.

Zie [ADR-028](../decisions/028-youtube-data-api-metadata.md) voor de keuze van YouTube Data API als metadata-bron voor cascade stap 1, en het fallback-gedrag bij quota-uitputting.

**Tijdsduur:** 1–5 seconden  
**Kosten:** 0 credits

> **Native-track-selectie (2026-06-27 tlang-fix, herzien 2026-07-12):** de captie-cascade levert **altijd de ORIGINELE/native track, nooit een (machine- of menselijke) vertaling** — zonder ooit een taal te prefereren of te hardcoden. `lang_pref` (YouTube Data API) is onbetrouwbaar (`'en'` voor Japanse video's) en stuurt de keuze **niet**.
>
> De native taal wordt bepaald uit twee betrouwbare signalen: **`info['language']`** (yt-dlp's gedetecteerde audio-taal, bv. `en-GB`/`ar`/`ja`) en de **`-orig`-sleutel** in `automatic_captions` (YouTube's structurele native-ASR-marker, heeft nooit `tlang=`). Selectie in `extract_with_ytdlp` (stap 2/3): P1 = **manueel** ondertitelspoor in de native taal (base-code-match, dus `en-GB` matcht `en`), P2 = **`-orig` ASR** in de native taal, P3 = non-orig auto-caption in de native taal mits geen `tlang=`. Geen native track → `no_captions` (geen vreemde taal, AI-transcriptie is de betaalde uitweg). Safety-net URL-check op `tlang=` blijft vlak vóór download.
>
> Stap 1 (`youtube-transcript-api`) is óók native-geankerd: het leest de **generated (ASR) track** (`is_generated=True`) → dat is de native taal; het kiest een manueel native spoor of de native ASR, en gebruikt **nooit `.translate()`**. Is er geen ASR-track (kan native niet bepalen) → `return None` → de yt-dlp-cascade (met `info['language']`) beslist.
>
> **Bug die dit oploste (`Bm1RhjcdJek`, Napoleon — Engelse audio, 26 manuele community-vertalingen, GEEN `-orig`):** de oude Priority-1 iterereerde `['en'] + list(manual_subs.keys())`; bare `'en'` was geen sleutel (het Engelse spoor heet `en-GB`), dus viel het terug op `manual_subs.keys()[0]` = **`sq` (Albanees)** — een menselijke vertaling. Nu ankert P1 op `info['language']='en-GB'` (base `en`) → kiest het `en-GB`-spoor → Engels. Geverifieerd 2026-07-12 tegen echte repro's: Napoleon → Engels; Arabische video → Arabisch native; Japanse video → Japans native. Fix geldt voor single-video én playlist (gedeelde `extract_with_ytdlp` + `extract_via_youtube_transcript_api`).

> **Cache-lagen & self-healing (2026-07-12) — waarom een caption-fix in productie niet meteen aanslaat:** vóór de cascade staan **drie** lagen in `/api/extract/youtube`: (1) Redis `caption:{video_id}`, (2) `master_transcripts` (Supabase-row + R2-JSON, language-keyed op `normalised_lang` uit de YouTube Data API), (3) de cascade. De Napoleon-fix draaide correct maar productie bleef Albanees geven omdat een **pre-fix `master_transcripts`-row** (`language='en'` → Albanese R2-content) bij `normalised_lang='en'` de read HITte en de cascade oversloeg — én de master-hit **backfilt Redis opnieuw**, zodat een losse Redis-clear niet standhield. De caption master-write was bovendien **insert-only**, dus een correcte her-extractie kon de vergiftigde row nooit overschrijven (409 duplicate-key) → de row was onsterfelijk (= waarom retry/redeploy niet hielp). **Fix:** de caption `master_transcripts_write` gebruikt nu `force_refresh=True` (UPSERT) in `main.py` én `worker.py` → een correcte extractie self-heal't de row + refresh't `fetched_from_provider_at` (de 90-dagen-caption-refresh werkte voorheen nooit onder insert-only). **Regel:** bij het landen van een caption-content/taal-fix moet je de `master_transcripts`-rows (+ Redis) van de getroffen video's purgen, niet alleen Redis. Details in `docs/LESSONS.md` (`caption-cache-lagen-purge-én-self-heal`).

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
            └─ Python backend — splitst op source_type:

  source_type='youtube' → ARQ worker (Fase 2 — zie ADR-019):
       └─ enqueue_job('run_whisper_job', job_id, user_id, video_id)
            └─ ARQ worker (backend/worker.py) verwerkt asynchroon:
                 ├─ yt-dlp: download audio (KLEIN formaat, fallback-keten — geen video)
                 │    └─ extract_youtube_audio() retry-loop (ADR-031):
                 │         ├─ format 'bestaudio[abr<=70]/bestaudio[abr<=128]/bestaudio/best' — we
                 │         │    transcoderen sowieso naar 12kbps mono, dus brontbitrate >~48k = verspilde
                 │         │    proxy-egress; /best-fallback zorgt dat een werkende video nooit gaat falen
                 │         ├─ download-timeout AFGELEID van videoduur (base 180 + 25/min, cap 3600s),
                 │         │    niet vlak → clip krijgt niet te veel, lange video niet te weinig
                 │         ├─ deadline-hook (DownloadCancelled uit progress_hook) breekt de download ÉCHT
                 │         │    af — geen doorlopende thread die egress verspilt na de timeout
                 │         ├─ Attempt 1/2/3: proxy session {sid}-r1/r2/r3 (ander exit-IP per poging)
                 │         └─ Na 3 failures / deadline: raise → job→error "timeout"/"connection_error"/…
                 ├─ Valideer: MembersOnlyVideoError check
                 ├─ ffmpeg: compress naar 12kbps Opus/OGG
                 ├─ AssemblyAI submit()+poll (ADR-082): non-blocking indienen → provider_transcript_id
                 │    op de jobrij, dan poll-loop (heartbeat per poll, fase-capture submitted_at→
                 │    provider_processing_at→provider_processing_ms, assemblyai_language/model)
                 │    └─ worker-herstart her-pollt de lopende provider-job onder strakke gates i.p.v.
                 │       opnieuw indienen (geen dubbele facturering)
                 ├─ Bij leeg transcript (geen spraak): job→error "no_speech_detected",
                 │    credits automatisch teruggestort (reservering/refund, ADR-050)
                 └─ Sla transcript op in Supabase, markeer job complete

  source_type='upload' → asyncio.create_task (bytes in memory, niet queue-serializable):
       └─ Identiek aan YouTube-flow hierboven, maar audio-bytes komen uit request-body

Frontend pollt GET /api/jobs/{job_id} elke 3 seconden
  └─ Bij status "error" + error_message "no_speech_detected":
       toont inline card "No speech detected" met bevestiging dat credits teruggestort zijn
  └─ Wanneer klaar: job response bevat ook transcript_id, channel, language
       (backend haalt channel + language op via JOIN op transcripts tabel bij job completion)
  └─ Frontend slaat transcript_id op in existingTranscriptIdRef (synchronous ref) + state
  └─ videoChannel en videoLanguage worden gezet zodat RAG JSON export correcte metadata bevat
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
                 ├─ POST naar AssemblyAI EU LLM Gateway (ADR-068):
                 │    llm-gateway.eu.assemblyai.com/v1/chat/completions
                 │    model: "gemini-2.5-flash" (fallback "claude-haiku-4-5-20251001")
                 │    response_format: {"type": "json_object"}; timeout: 120s
                 ├─ Strip ```json-fences, parse JSON: {text, action_points}
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

Gebruikers kunnen een lokaal audio- of videobestand uploaden (14 formaten — audio: MP3, MPGA, M4A, WAV, OGG, OPUS, FLAC; video: MP4, MPEG, WEBM, MOV, FLV, AVI, MKV — max 500MB). Enige bron: `packages/shared/src/lib/uploadFormats.ts` (`UPLOAD_EXTENSIONS`), gespiegeld door `backend/audio_utils.py` (`SUPPORTED_FORMATS`). OPUS is dezelfde Ogg-Opus-container als OGG (WhatsApp-spraakberichten zijn `.opus`) → ffprobe rapporteert `format_name=ogg`, dus raw doorgestuurd naar AssemblyAI. Validatie is extensie-only op elke laag (nooit MIME). Dit gaat via een aparte flow die de Vercel bodylimiet van 4.5MB omzeilt:

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

## yt-dlp Client Strategie

yt-dlp ondersteunt meerdere YouTube "player clients" die elk anders worden behandeld door YouTube's CDN en bot-protection. De huidige configuratie in `audio_utils.extract_youtube_audio()`:

```python
'extractor_args': {
    'youtube': {
        'player_client': ['ios', 'web_embedded'],
    },
},
```

| Client | PO Token vereist | Proxy-compatibel | Status |
|--------|-----------------|------------------|--------|
| `ios` | Nee | Ja | Primair — bypasses PO tokens |
| `web_embedded` | Ja (via bgutil) | Ja | Fallback — bgutil verwijderd (ADR-027) |
| `tv` | Nee | Ja | Kandidaat cascade-stap 3 (taak 1.6) |
| `android` | Deels | Beperkt | Kandidaat cascade-stap 3 (taak 1.6) |

**Waarom geen bgutil PO tokens:** bgutil-pot was geconfigureerd op de API-container, maar yt-dlp draait op de worker-container (aparte Railway service). De split-architectuur (ADR-025) maakte bgutil onbereikbaar precies waar het nodig was. Verwijderd via ADR-027. De iOS client werkte al maanden zonder PO tokens in productie.

**Taak 1.6** introduceert een volledige cascade: `youtube-transcript-api` → yt-dlp ios/web_embedded → yt-dlp tv/android → AssemblyAI → `needs_manual_review`.

---

## AssemblyAI Modellen

AI-transcriptie draait op een **taal-router**: `speech_models = ["universal-3-5-pro", "universal-2"]`
(`backend/assemblyai_client.py`). AssemblyAI kiest per gedetecteerde taal het beste van deze twee
modellen; `universal-3-pro` zit **bewust niet** in de router (ADR-071). De talenaantallen zijn de
single source in `packages/shared/src/lib/models.ts` (`TRANSCRIPTION_MODEL.nativeLanguages` = 18 /
`.totalLanguages` = 99) — hieronder met de hand gespiegeld, want een `.md` kan de TS-constante niet importeren.

| Model | Talendekking | Gebruik |
|-------|--------------|---------|
| **Universal-3.5 Pro** | 18 talen natief (incl. Arabisch) | Primair — voor de talen die het natief dekt |
| **Universal-2** | 99 talen | Automatisch fallback — voor alle overige talen |

**Waarom beter dan YouTube auto-captions:**
- Verwerkt de audio opnieuw (vervangt niet bestaande captions)
- Beter bij accenten, achtergrondgeluid, snel gesproken tekst
- Hoge woordnauwkeurigheid op helder gesproken Engels; de per-taal-nauwkeurigheid verschilt (WER-banden op `/docs/reference/accuracy`, uit de provider, geen eigen headline-getal)

Model- en talenclaims voor content renderen uit `models.ts` (`transcriptionModelName()` = "AssemblyAI Universal-3.5 Pro", `transcriptionRouterPhrase()`), nooit hardgecodeerd in proza.

---

## Audio Format Optimalisatie

**Live (sinds 2026-07-27, commit `1600ddf`):** `bestaudio[abr<=70]/bestaudio[abr<=128]/bestaudio/best`
→ kiest een klein audioformaat (~48–70 kbps) i.p.v. `bestaudio` (~128–160 kbps).

Rationale: we transcoderen sowieso alles naar **12 kbps mono Opus** vóór AssemblyAI, dus elke
brontbitrate boven ~48 kbps is verspilde proxy-egress met een identiek eindresultaat. Halveert ruwweg
de gedownloade bytes (een 76-min video was 82 MB als `bestaudio`), wat de blootstelling aan een trage
residentiële exit — en dus de download-timeout — sterk verkleint. **Fallback-keten, geen harde keuze:**
de `/best` aan het eind garandeert dat een video die nu lukt niet kan gaan falen. Zie ook
[ADR-016](../decisions/016-opus-249-audio-format.md) (eerdere planvorm) en de download-timeout-fix.

**Download-timeout (samen gewijzigd):** afgeleid van de videoduur (`base 180 + 25/min`, cap 3600s,
`transcription_pipeline._derive_download_timeout`) i.p.v. een vlakke 600s; een `DownloadCancelled`-
progress_hook breekt de lopende download écht af (geen doorlopende thread die egress verspilt).

---

## Error Types

De backend classificeert YouTube-fouten naar canonical slugs (`main.py:1233-1246`):

| error_type | Trigger |
|-----------|---------|
| `members_only` | Members-only video gedetecteerd |
| `age_restricted` | Leeftijdsbeperking vereist inloggen |
| `bot_detection` | YouTube 429 / bot-check triggered |
| `timeout` | Download overschreed het duur-afgeleide budget (`base 180 + 25/min`, cap 3600s) |
| `connection_error` | Verbinding naar YouTube brak (SSL/EOF/reset) — los van timeout |
| `server_error` | YouTube/proxy 5xx |
| `youtube_restricted` | Video unavailable (gelimiteerd land, etc.) |
| `extraction_error` | Generieke fout |

Frontend toont per `error_type` een specifieke gebruikersboodschap.

---

## Proxy Configuratie (optioneel)

Voor omzeilen van YouTube IP-bans kan een proxy geconfigureerd worden:

```env
PROXY_ENABLED=true
PROXY_HOST=gate.decodo.com
PROXY_PORT=10001
PROXY_USERNAME=username
PROXY_PASSWORD=password
```

Sticky sessions worden via de **username-suffix** opgegeven: `user-{PROXY_USERNAME}-session-{session_id}`. Huidige provider: Decodo residentieel (10GB plan, overgestapt 2026-04-20). Zie [ADR-017](../decisions/017-proxy-provider-decodo.md).

**Implementatiedetail:** `extract_with_ytdlp(video_id, use_proxy=True, session_id=...)` geeft de session_id door aan `get_proxy_url(session_id)`. De proxy wordt op twee niveaus gebruikt:

1. **yt-dlp metadata call** — proxy via `ydl_opts['proxy']`
2. **VTT httpx download** — proxy via `httpx.Client(proxy=proxy_url)` (zelfde session_id)

**Single-video requests** gebruiken `session_id = video_id[-8:]` — deterministisch per video, zodat yt-dlp metadata fetch en httpx VTT download hetzelfde exit-IP gebruiken. Dit voorkomt CDN-fouten waarbij de VTT URL op een ander IP binnenkomt dan waarmee hij was opgehaald.

Binnen een playlist-job krijgt elke video een unieke session_id: `f"{job_id[:4]}{idx:04d}"` (bijv. `abcd0000`, `abcd0001`). Dit zorgt voor een ander exit-IP per video, zodat een rate-limited video de rest van de job niet blokkeert. De retry-pass gebruikt `video_ids.index(vid)` als index, waardoor hetzelfde exit-IP als de eerste poging beschikbaar is.

**Gevalideerd 2026-04-16:** 20-video playlist (Introduction to Psychology, Paul Bloom) — 20/20 succesvol, 2:21, nul VTT-fouten.
