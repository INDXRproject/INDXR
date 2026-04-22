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

## RAG JSON Export — Sessie 2 (gepland)

**Status:** Niet uitgevoerd

### Edge cases te testen

| Case | Wat te checken |
|------|----------------|
| AssemblyAI/Whisper flow → RAG export | `extractionMethod = "whisper_ai"`, channel/language = undefined (expected) |
| Niet-Engelse video | `language` correct via yt-dlp of lingua auto-detectie |
| Video ~2 min | Minimum 1 credit enforced |
| Chunk preset 120s (Context) | Minder chunks, grotere tekst per chunk |
| Insufficient credits | Banner verschijnt, geen modal |
| Playlist-video → RAG export | Nog niet beschikbaar — library gebruikt TranscriptViewer, niet TranscriptCard |
