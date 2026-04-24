# Test Reports

Handmatige testrapporten per feature of sprint. Automatische Playwright-specs staan in `tests/`.

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
