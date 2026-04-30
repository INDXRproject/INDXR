# Test Reports

Handmatige testrapporten per feature of sprint. Automatische Playwright-specs staan in `tests/`.

---

## Error messaging audit + AI-suggestie differentiatie — Sessie 1

**Datum:** 2026-04-30 04:35–04:39
**Tester:** Khidr
**Commit:** 518666e (taak 1.19b)
**Status:** PASS

### Scenario's getest

| Scenario | Video | error_type | Resultaat |
|----------|-------|------------|-----------|
| Members-only fail-fast (geen AI) | cyzrkZT2y2E (Kings & Generals) | `members_only` | ✅ `[YT-API] VideoUnplayable` → `[YT-DLP] MembersOnly` → 403; foutbox "Members-Only Video", AI-toggle correct verborgen |
| No-captions (WEL AI-suggestie) | LolBuzO8RWw (My Mechanics, ambient music) | `no_captions` | ✅ `[YT-API] TranscriptsDisabled` → `[YT-DLP] no_captions` → 200 met success=false; foutbox v2 "No captions available" + 1 credit/min disclaimer + refund disclosure; AI-toggle wel zichtbaar |
| No-speech refund flow (bonus) | LolBuzO8RWw + Generate with AI | `no_speech` | ✅ Hele AI-pijplijn end-to-end: yt-dlp 30.89MB → ffmpeg 3.38MB ogg → AssemblyAI upload+poll → no_speech detectie → automatische refund van 42 credits (2670→2628→2670); foutbox "No speech detected" met refund-bevestiging |

### Conclusie

ADR-029 architectuur volledig in productie geverifieerd:
- AI-suggestie wordt correct **niet** getoond bij structurele faalmodi (members_only) waarbij audio sowieso niet beschikbaar is
- AI-suggestie wordt correct **wel** getoond bij `no_captions` met eerlijke disclaimer over kosten en automatische refund
- Bestaande no_speech refund-flow werkt zoals gedocumenteerd: credits worden afgetrokken bij start AssemblyAI en automatisch teruggestort bij detectie geen spraak
- Light mode rendering bevestigd (screenshot 3)
- Whisper end-to-end pipeline (download→ffmpeg→AssemblyAI→detectie→refund) duurde 140 seconden voor 41-min video

### Validatie-keten compleet

Met deze sessie is taak 1.19b einde-tot-einde gevalideerd:
- Backend retourneert error_type consistent voor alle eindstaten
- Frontend toont AI-toggle alleen op whitelist
- v2 messages renderen correct in beide thema's (dark + light)
- Refund-mechanisme bij no_speech is intact gebleven

---

## Cascade stap 1+2+3 orchestratie — Sessie 2

**Datum:** 2026-04-29 19:36–19:37  
**Tester:** Khidr  
**Commit:** f17b4c1 (feat: cascade stap 3 + stap 2 productiebewijs)  
**Status:** PASS

### Scenario's getest

| Scenario | Video | Resultaat |
|----------|-------|-----------|
| Stap 1 succes (Huberman 1) | K4Ze-Sp6aUE | ✅ `[YT-API] success` in 3.8s, master cache 225KB/40981 woorden |
| Stap 1 succes (Huberman 2) | DkS1pkKpILY | ✅ `[YT-API] success` in 2.8s, master cache 125KB/22141 woorden |
| Stap 1→2 → MembersOnly fail-fast (Kings & Generals) | zleyKAEz-Qs | ✅ `[YT-API] VideoUnplayable` → `[YT-DLP] MembersOnly` → 403; stap 3 NIET aangeroepen (correct — structureel) |
| Stap 1→2 → no_captions, geen stap 3 (music-only) | LolBuzO8RWw | ✅ `[YT-API] TranscriptsDisabled` → `[YT-DLP] no_captions` → "No captions found" + AI-suggestie; stap 3 NIET aangeroepen (correct — andere client lost ontbrekende captions niet op) |

### Conclusie

Cascade-orchestratie scheidings-logica volledig geverifieerd in productie:
- MembersOnlyVideoError → re-raise zonder stap 3 ✓
- return {} (no_captions) → terminal "No captions found" zonder stap 3 ✓
- Stap 3 wordt alleen getriggerd bij stap 2 Exception (bot_detection/timeout) — organische verificatie volgt vanzelf bij eerste productie-bot_detection.

`[YT-DLP-ROT]` log-prefix zichtbaarheid: nog niet bewezen in productie (geen stap 2 exception getriggerd in deze testronde). Code-pad is wel geverifieerd via negative-test (stap 3 niet aangeroepen waar dat ook niet zou moeten).

---

## Cascade stap 1+2 + cache-hit — Sessie 1

**Datum:** 2026-04-29 17:43–17:46  
**Tester:** Khidr  
**Commit:** 55324cd (feat: cascade stap 2 formaliseren + quality rank fix)  
**Status:** PASS

### Scenario's getest

| Scenario | Video | Resultaat |
|----------|-------|-----------|
| Cache HIT | xZ4I2aE8zQA | ✅ Redis HIT 26s na eerste extractie — geen YT-API/YT-DLP calls in logs |
| Stap 1 succes | IAnhFUUCq6c | ✅ `[YT-API] success` + master cache write (227KB transcript, 42836 woorden) |
| Stap 1→2 cascade + MembersOnly | djKFARxiH8A (Kings & Generals) | ✅ `[YT-API] VideoUnplayable` → `[YT-DLP] attempting` → `[YT-DLP] MembersOnly (keyword detected)` → 403 Forbidden |
| [YT-DLP] log-zichtbaarheid | alle bovenstaande | ✅ alle `[YT-DLP]` prefixes correct zichtbaar in Railway logs |

### Conclusie

Cascade-orchestratie, log-prefixen, error-classificatie en master cache write werken correct in productie. Stap 1→2 overgang bewezen via VideoUnplayable → MembersOnly pad. Redis cache-hit bevestigd binnen één sessie.

---

## RAG JSON Export — Sessie 1

**Datum:** 2026-04-22  
**Tester:** Khidr  
**Commit:** c342f53 (feat: Clean JSON + RAG JSON export + Developer Settings)  
**Status:** PASS

### Videos getest

| Video | URL | Duur | Chunks (60s) | Credits | Resultaat |
|-------|-----|------|--------------|---------|-----------|
| Pavel Durov / Lex Fridman | youtu.be/uLqBKa2dCUA | 394s (6.6 min) | 7 | 1 | ✅ |
| Elon Musk / Joe Rogan | youtu.be/YcSIp8n-IXA | 1225s (20.4 min) | 20 | 2 | ✅ |
| Andrej Karpathy micrograd | youtu.be/VMj-3S1tku0 | 8752s (145.9 min) | 143 | 10 | ✅ |

### UX flow

- Bevestigingsmodal toont video-lengte, credits en chunk preset correct ✅
- "Don't show this again" — tweede export direct zonder modal ✅
- Credit-aftrek onmiddellijk na export ✅
- Joe Rogan eerste extractie: bot-challenge → tweede poging OK (bekende proxy/infra issue)

### Metadata output

| Veld | Sessie 1 | Na fix (zelfde dag) |
|------|----------|---------------------|
| video_id, title, duration_seconds, extracted_at, extraction_method, chunking_config | ✅ | ✅ |
| channel | ❌ ontbrak | ✅ via `info.get('uploader')` |
| language | ❌ ontbrak | ✅ yt-dlp + lingua fallback |
| published_at | niet geïmplementeerd | ✅ YYYY-MM-DD conversie + prop |
| language_detected | — | ✅ nieuw, tot aan PostHog |

### Chunking kwaliteit

- 60s default: correct, gemiddeld ~61s per chunk
- Laatste chunk korter dan chunk_size — expected
- Geen interpunctie bij YouTube auto-captions — expected (caption-artefact)
- Speaker markers (`>>`) zichtbaar in Joe Rogan output — YouTube caption-artefact, geen INDXR-bug

### Credit-formule verificatie

`Math.max(1, Math.ceil(duration_seconds / 900))` — correct op alle drie lengtes

---

## RAG JSON Export — Sessie 2

**Datum:** 2026-04-23
**Tester:** Khidr
**Commits getest:** lingua + published_at (2026-04-22) + session_id proxy fix (2026-04-22)
**Status:** PARTIAL PASS — 3/4 videos geslaagd, 2 bugs gevonden, 1 UX-gap

### Videos getest

| Video | URL | Duur | Chunks | Credits | Preset | Resultaat |
|-------|-----|------|--------|---------|--------|-----------|
| Fireship - How to Learn to Code | youtu.be/NtfbWkxJTHw | 405s (6.75 min) | 7 | 1 | 60s | ✅ |
| Joe Rogan - Peruvian Pyramid | youtu.be/24UyoR0g3aQ | 862s (14.4 min) | 7 | 1 | 120s | ✅ |
| Tariq Al-Suwaidan - Salman Al-Farisi (AR) | youtu.be/tpu8vOtFoMQ | 1710s (28.5 min) | 24 | 2 | 60s | ✅ (zie bug 1) |
| Lex + Vitalik Russisch | youtu.be/4XkFY9IsACk | — | — | — | — | ❌ 429 rate limit VTT |

### Nieuwe metadata velden — validatie

| Veld | Fireship | Joe Rogan | Arabisch |
|------|----------|-----------|---------|
| channel | ✅ "Fireship" | ✅ "JRE Clips" | ✅ "د. طارق السويدان" |
| language | ✅ "en" | ⚠️ "en-US" (locale-code, gefixed 2026-04-23) | ✅ "ar" |
| published_at | ✅ "2022-02-09" | ✅ "2026-04-22" | ✅ "2014-07-03" |

### 120s preset — validatie

- 862s video bij 60s → 20 chunks (verwacht)
- 862s video bij 120s → 7 chunks ✅ — correct, ~2x minder chunks

### Bugs gevonden

**BUG 1 — Arabische video: yt-dlp pakt `tlang=en` vertaling i.p.v. originele captions**
yt-dlp selecteert standaard de Engelse vertaling van auto-captions voor niet-Engelse video's. `language` metadata zegt `"ar"` (correct — audio taal), maar tekst is Engelse vertaling. Voor RAG op niet-Engelse content misleidend. AssemblyAI flow geeft wel correct origineel terug. Fix: taalpreferentie in yt-dlp opts forceren. Status: **open**.

**BUG 2 — language locale-code niet genormaliseerd (gefixed 2026-04-23)**
`"en-US"` i.p.v. `"en"` — yt-dlp geeft soms locale-codes terug. Fix: `raw_language[:2].lower()` — eerste twee tekens. `main.py:474`.

### UX gaps

- **Settings chunk size ✓ feedback**: Auto-save on change geïmplementeerd maar success-indicator niet zichtbaar tijdens test. Controleer `DeveloperExportsCard.tsx` success state rendering.
- **Geen reset voor "Don't show again"**: Na bevestiging geen manier om confirmation modal terug aan te zetten. Gewenst: reset knop in Developer Exports settings.

### AssemblyAI → RAG export — validatie

Arabische video (youtu.be/tpu8vOtFoMQ, 28.5 min) via AI transcriptie getest:

- AssemblyAI transcriptie: ✅ voltooid in 3:22, 29 credits gebruikt
- RAG JSON export na AI transcriptie: ✅ PASS
- `extraction_method: "assemblyai"` correct in metadata
- Tekstkwaliteit: correct Arabisch, significant beter dan caption vertaling
- `language`: correct gedetecteerd
- Twee betaalde features gecombineerd zonder problemen ✅

### Stresstest — 2u49min podcast

Joe Rogan Experience #1368 - Edward Snowden (youtu.be/efs3QRr8LWw):

- `duration_seconds`: 10172 (2u49min)
- Chunks bij 120s preset: 84 ✅
- Alle metadata aanwezig ✅
- Geen fouten, geen timeouts ✅
- Grootste video getest tot nu toe — pipeline stabiel op volledige lengte ✅

### Openstaand na sessie 2

| Item | Type | Status |
|------|------|--------|
| yt-dlp originele taal forceren i.p.v. `tlang=en` | Bug | Open |
| Settings chunk size ✓ feedback zichtbaarheid | UX | Open |
| "Reset export confirmation" knop in settings | Feature | Open |
| 429 niet-Engelse VTT endpoints — video-specifiek of structureel? | Investigate | Open |

---

## RAG JSON Export — Sessie 3 (v2 upgrade validatie)

**Datum:** 2026-04-23
**Tester:** Khidr
**Commits:** 82a7108 (v2 upgrade) + bugfix (sentence_boundary + assemblyai label)
**Status:** PASS

### Videos getest

| Video | URL | Duur | Chunks | Preset | Extractie | Resultaat |
|---|---|---|---|---|---|---|
| Fireship - How to Learn to Code | youtu.be/NtfbWkxJTHw | 405s (6.75 min) | 8 | 60s | captions | ✅ |
| 3Blue1Brown - But what is a neural network? | youtu.be/aircAruvnKk | 1119s (18.65 min) | 18 | 60s | assemblyai | ✅ |
| Andrej Karpathy - Let's build GPT | youtu.be/kCc8FmEb1nY | 6980s (1u56min) | 89 | 90s | captions | ✅ |

### v2 velden — validatie

Alle v2 velden aanwezig in alle drie outputs:
- `chunk_id` (formaat `{video_id}_chunk_{index:03d}`) ✅
- `deep_link` (`youtu.be/{id}?t={floor(start_time)}`) ✅
- `token_count_estimate` ✅
- Flat `metadata` object per chunk ✅
- `overlap_seconds` in `chunking_config` ✅
- `overlap_strategy` in `chunking_config` ✅
- `extraction_method: "assemblyai"` correct voor AI transcriptie ✅

### Overlap — aantoonbaar correct

**Fireship (segment_boundary, 60s):** chunk 0 eindigt op 62.8s, chunk 1 begint op 54.64s — 8.16s overlap op segmentgrens ✅

**3Blue1Brown (sentence_boundary, 60s, AssemblyAI):** chunk 0 eindigt op 67.98s, chunk 1 begint op 57.463s — 10.5s overlap op zinsgrens. Overlap tekst zijn complete zinnen, niet willekeurige segmentgrenzen ✅

**Karpathy (segment_boundary, 90s):** chunk 0 eindigt op 93.4s, chunk 1 begint op 80.56s — 12.84s overlap ✅

### 90s preset — validatie

- Karpathy bij 60s (sessie 1): 143 chunks
- Karpathy bij 90s (sessie 3): 89 chunks ✅
- `overlap_seconds: 14` (15% van 90s) ✅

### Bugs gevonden en gefixed

| Bug | Beschrijving | Fix |
|---|---|---|
| AssemblyAI triggerde segment_boundary | `extractionMethod === 'assemblyai'` match faalde omdat waarde `'whisper_ai'` was | Conditie uitgebreid: `=== 'assemblyai' \|\| === 'whisper_ai'`; AudioTab prop gecorrigeerd naar `'assemblyai'`; VideoTab transformeert bij doorgeven |
| extraction_method toonde "whisper_ai" | Verkeerd label in JSON output | AudioTab prop + VideoTab prop transformatie gecorrigeerd; interne DB state `'whisper_ai'` intact |

### Bekende niet-kritieke observatie

`channel: null` en `language: null` voor AssemblyAI transcripts — expected gedrag. Bij AI transcriptie is geen yt-dlp metadata fetch aanwezig, dus deze velden zijn niet beschikbaar.

---

## Markdown Export — Upgrade Test (Sessie 4)

**Datum:** 2026-04-24
**Tester:** Khidr
**Commits:** 28d2c7d (fix: Markdown timestamps paragraafgroepering + deep links)
**Status:** PASS

### Videos getest

| Video | URL | Duur | Extractie | Variant | Resultaat |
|---|---|---|---|---|---|
| Huberman Lab - Dopamine | youtu.be/QmOF0crdyRU | 8191s (137 min) | AssemblyAI | Clean MD + Timestamps MD | ✅ PASS |

### Validatie

**YAML frontmatter:**
- `title`, `url`, `duration: 8191`, `transcript_source: "AI Transcription (AssemblyAI)"`, `created: "2026-04-24"`, `type: youtube`, `tags` ✅
- `channel` en `language` afwezig bij AssemblyAI — expected (geen YouTube metadata beschikbaar) ✅

**Clean MD:**
- Paragraafgroepering correct — lange coherente blokken ✅
- Leesbaar als Obsidian note ✅

**Timestamps MD:**
- Klikbare deep links per paragraaf: `## [HH:MM:SS](https://youtu.be/QmOF0crdyRU?t=N)` ✅
- Paragraafgroepering correct — één header per paragraaf, niet per segment ✅
- Werkt correct op grote schaal (137 min, groot transcript) ✅

### Bugs gefixed in deze sessie

| Bug | Beschrijving | Fix |
|---|---|---|
| YAML frontmatter ontbrak | Code was correct maar niet gepusht — productie draaide nog op oude versie | Gepusht na diagnose |
| Timestamp granulariteit te fijn | Elke 2-5s caption segment kreeg eigen ## header | Paragraafgroepering (gap > 5s) ook toegepast in timestamps variant |
| Deep links ontbraken | Zelfde oorzaak als frontmatter — oud deployment | Opgelost na push |

---

## Fase 3b.3 — Per-video chain productie verificatie

**Datum:** 2026-04-28
**Tester:** Khidr
**Playlist:** Joe Rogan conspiracies playlist (PL2JC3CjMLeMsIT3eEwbqT7rC46zhao18B)
**Job ID:** 7371f0a2-46b8-4c6e-a890-d5349981c8af
**Status:** ✅ Architecture validated

### Setup

| Parameter | Waarde |
|-----------|--------|
| Totaal video's | 22 |
| Captions (yt-dlp) | 19 — waarvan 3 Whisper-fallback |
| Whisper (AssemblyAI) | 3 (video's op index 0, 1, 2) |
| User | testuser (1edb05e9) |
| Verwachte credits | 47cr |

### Resultaten

| Metric | Waarde |
|--------|--------|
| Status (DB) | `complete` |
| Succesvol | 18/22 |
| Gefaald | 4/22 (alle YouTube-kant) |
| Doorlooptijd (DB) | 295s (≈4:55) |
| Gemiddeld per video | ≈13s |
| Transcripts aangemaakt | 18 (geverifieerd via Supabase) |
| Credits afgetrokken | 45cr (30cr Whisper + 15cr captions) |
| Verwacht vs. werkelijk | 47cr vs. 45cr — 2cr minder door extra caption-failures in paid zone |

### Credit breakdown

| Type | Videos | Credits |
|------|--------|---------|
| Whisper idx 0 | 1 | 10cr (≈10 min video) |
| Whisper idx 1 | 1 | 14cr (≈14 min video) |
| Whisper idx 2 | 1 | 6cr (≈6 min video) |
| Caption idx 3+ (succesvol) | 15 | 15cr (1cr/video) |
| Caption idx 0-2 (gratis) | 0 | 0cr — geen captions op idx 0-2 (Whisper bezette die slots) |
| Caption idx 3+ (gefaald) | 4 | 0cr — geen aftrek bij failure |
| **Totaal** | | **45cr** |

Timing: 3 Whisper-charges (07:36–07:37) kwamen vóór caption-charges (07:38–07:40), consistent met sequentiële chain: Whisper op idx 0-2 voltooid voordat caption-extractie op idx 3+ begon.

### Failure breakdown

| Error type | Aantal | Video IDs | Oorzaak |
|------------|--------|-----------|---------|
| `bot_detection` | 2 | qP0veW9gBxI, sozmnOjN97c | YouTube bot-challenge; taak 1.6 (yt-dlp cascade) adresseert dit |
| `youtube_restricted` | 1 | w3YNGnrAeS8 | Content geo/age-restrictie aan YouTube-kant |
| `extraction_error` | 1 | si6aHp0U6wg | Generieke extractie-fout (transient network of yt-dlp parse error) |

Alle 4 failures zijn externe YouTube-problemen. Geen architecture-issues of unhandled exceptions in de chain.

### Supabase-checks (A–D)

**A. playlist_extraction_jobs:**
- `status = 'complete'` ✅
- `completed + failed = 18 + 4 = 22 = total_videos` ✅
- `completed_at = 2026-04-28 07:40:41 UTC` ✅
- `last_progress_at` gevuld ✅
- `processing_time_seconds = 295` ✅
- `video_results` bevat 22 entries (18 success + 4 error) ✅

**B. Transcripts:** `COUNT(*) = 18` — exact gelijk aan `completed` ✅

**C. Credit transactions:** 18 entries, startend bij 07:36:13 UTC. Geen entries vóór idx 3 voor captions (eerste 3 slots bezet door Whisper). ✅

**D. Failures gecategoriseerd:** 2× bot_detection, 1× youtube_restricted, 1× extraction_error ✅

### Architectuur observaties

- Sequentiële chain van index 0 t/m 21 verlopen zonder onderbreking ✅
- `_job_id = "{playlist_id}:{video_index}"` determinisme werkte — geen dubbele jobs ✅
- Idempotente RPC-updates (`update_playlist_video_progress`) werkten correct ✅
- `keep_result=0` voorkwam Redis uniqueness-locks na completion ✅
- `completed + failed >= total_videos` triggerde automatisch `status='complete'` via RPC ✅
- Geen unhandled exceptions in Railway worker logs

### Retry-pass verificatie

Worker logs na video 21 (07:40 UTC), geverifieerd door Khidr:

```
07:40:01 - [playlist] Enqueued retry pass for 2 video(s)
07:40:01 - ← process_playlist_video idx=21 ●
07:40:32 - 31.06s → process_playlist_retries (delayed=31.06s)
07:40:32 - [retries] Retrying 2 video(s)
07:40:36 - qP0veW9gBxI retry failed (bot_detection)
07:40:41 - sozmnOjN97c retry failed (bot_detection)
07:40:41 - [retries] Retry pass complete
```

| Aspect | Bevinding |
|--------|-----------|
| `process_playlist_retries` getriggerd | ✅ ja, na idx=21 |
| `_defer_by=30` werkte | ✅ actual delay 31.06s |
| Beide bot_detection videos opnieuw geprobeerd | ✅ |
| Uitkomst retries | ❌ beide opnieuw bot_detection |

**Inzicht:** 30s delay + dezelfde proxy session ID lost bot_detection niet op. IP-reputatie kleeft — YouTube-bot-challenges verdwijnen niet binnen 30s. De retry-pass is effectief voor `timeout` (transient network hiccups) maar niet voor `bot_detection`. Structurele fix: taak 1.6 (yt-dlp cascade met PO tokens + alternatieve clients).

**Open vraag:** heeft retry-pass voor bot_detection überhaupt nog zin als het in praktijk niet werkt? Voorlopig geen kwaad (kost <10s extra). Herzien in taak 1.6 scope.

### Performance observaties

- Whisper extracties (AssemblyAI): 60–90s per video afhankelijk van duur
- Caption extracties (yt-dlp): gemiddeld ≈7s per video
- Sequentialiteit respecteerde YouTube rate-limits — geen burst-patronen

### Wat dit valideert

- ADR-025 per-video decompositie ✅
- ADR-019 ARQ chain pattern ✅
- Credit-logica: gratis idx 0-2 voor captions, Whisper altijd op duur ✅
- Retry-pass mechanisme (enqueue + delay + sequential retry) ✅
- `_defer_by=30` effectief voor timeouts, niet voor bot_detection (verified) ✅

### Openstaand na deze sessie

| Item | Type | Taak |
|------|------|------|
| Retry-pass (process_playlist_retries) niet getest | Validation gap | Test apart met geforceerde bot_detection |
| ack_late=True ontbreekt — worker-crash = hangende job | Known limitation | Fase 4 |
| Idempotency keys ontbreken op POST-endpoints | Known limitation | Fase 4 |
| bot_detection reductie | Feature | Taak 1.6 (yt-dlp cascade) |
