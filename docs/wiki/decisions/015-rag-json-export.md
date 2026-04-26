# Beslissing 015: RAG-Geoptimaliseerde JSON Export

**Status:** Geïmplementeerd (v2)
**Datum:** 2026-04-14
**Geïmplementeerd v1:** 2026-04-22
**Geïmplementeerd v2:** 2026-04-23
**Gerelateerde code:** `src/components/TranscriptCard.tsx`, `src/utils/formatTranscript.ts`, `src/app/actions/rag-export.ts`, `src/components/dashboard/settings/DeveloperExportsCard.tsx`

---

## Context

YouTube transcripts zijn niet RAG-ready in hun ruwe vorm. De YouTube API geeft segmenten van 2–5 seconden terug — te granulaire fragmenten (~5–15 woorden, ~8–20 tokens) zonder metadata, zonder timestamps per chunk, en zonder structuur voor vector databases. Elke developer die YouTube-content in een RAG pipeline wil verwerken bouwt handmatig dezelfde boilerplate: segmenten samenvoegen, metadata toevoegen, chunken, token tellen, formatteren voor Pinecone/ChromaDB/Weaviate.

INDXR.AI lost dit op met een één-klik RAG JSON export. Geen enkele bestaande tool biedt dit in een GUI — LangChain YoutubeLoader, LlamaIndex reader, en youtube-transcript-api vereisen allemaal handmatige post-processing.

---

## Beslissing

Exporteer YouTube transcripts als RAG-geoptimaliseerde JSON met:

1. Video-level metadata wrapper
2. Chunks van configureerbare grootte (30s/60s/90s/120s)
3. Sentence-boundary overlap (15% van chunk size)
4. `deep_link` per chunk (`youtu.be/{id}?t={start_time}`)
5. `token_count_estimate` per chunk
6. `chunk_id` (deterministisch, sorteerbaar)
7. Flat `metadata` object per chunk voor directe vector database upsert

---

## Research-backed rationale

### Optimale chunk grootte

Gebaseerd op: Vectara NAACL 2025 (25 chunking configuraties × 48 embedding modellen), NVIDIA Technical Blog (128–2048 token benchmark), Chroma Research (RecursiveCharacterTextSplitter benchmark), Microsoft Azure AI Search aanbevelingen.

Gesproken Engels: ~130–160 woorden per minuut. Met ~1.33 tokens per woord:

| Chunk duur | Woorden (~150 WPM) | Tokens (~1.33×) | Voor RAG? |
|---|---|---|---|
| 30 seconden | ~75 | ~100 | ❌ Onder 256-token grens |
| 60 seconden | ~150 | ~200 | ⚠️ Minimum viable |
| 90 seconden | ~225 | ~300 | ✅ Goed — binnen sweet spot |
| 120 seconden | ~300 | ~400 | ✅ Optimaal — industrie benchmark |

LangChain's YoutubeLoader defaultt op `chunk_size_seconds=120` om dezelfde reden. **Default voor INDXR.AI: 60s** (balans tussen granulariteit en context). Configureerbaar: 30s / 60s / 90s / 120s.

### Overlap

NVIDIA benchmark testte 10%, 15%, 20% overlap — 15% presteerde het best voor dense embedding retrieval. Voor 60s chunks = 9s overlap; voor 120s chunks = 18s overlap. Overlap helpt bij retrieval over chunk-grenzen heen.

**Uitzondering:** sparse retrieval (BM25, SPLADE) profiteert niet van overlap. `overlap_seconds` staat in de output zodat downstream consumers kunnen dedupliceren.

### Fixed-time vs. semantic chunking

Vectara NAACL 2025: semantic chunking rechtvaardigde de computational cost niet — fixed-size met sentence-boundary snapping presteerde even goed of beter. Vecta 2026: semantic chunking produceerde gemiddeld 43 tokens per chunk met 54% accuracy; fixed-size at 512 tokens: 69% accuracy.

**Keuze: time-based chunking met sentence-boundary snapping.** Preserveert timestamp alignment (kritisch voor deep links) terwijl semantische coherentie wordt gerespecteerd.

### Deep links

LangChain GitHub Issue #8087 (meest gevoteerde feature request): YoutubeLoader "verliest alle informatie over wanneer iets gezegd is." Pre-geconstrueerde `youtu.be/{id}?t={N}` URLs per chunk lossen dit op. Geen enkel bestaand tool genereert dit.

### Token count estimate

Laat developers chunks valideren tegen hun embedding model's context window zonder zelf tokenizers te draaien. Gebruikt `cl100k_base` benadering: `woorden × 1.33`.

### Flat metadata per chunk

Vector databases (Pinecone, ChromaDB, Weaviate, Qdrant) vereisen scalar metadata values — geen geneste objecten. Elk chunk draagt een flat `metadata` object voor directe upsert.

---

## Definitief output schema

```json
{
  "metadata": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Video Title",
    "channel": "Channel Name",
    "language": "en",
    "published_at": "2024-01-15",
    "duration_seconds": 3600,
    "extraction_method": "youtube_captions",
    "extracted_at": "2026-04-23T12:00:00Z",
    "chunking_config": {
      "chunk_size_seconds": 60,
      "overlap_seconds": 9,
      "overlap_strategy": "sentence_boundary",
      "total_chunks": 42
    }
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "dQw4w9WgXcQ_chunk_000",
      "text": "Samengevoegde tekst van ~60 seconden met sentence-boundary overlap...",
      "start_time": 0.0,
      "end_time": 58.3,
      "deep_link": "https://youtu.be/dQw4w9WgXcQ?t=0",
      "token_count_estimate": 198,
      "metadata": {
        "video_id": "dQw4w9WgXcQ",
        "title": "Video Title",
        "channel": "Channel Name",
        "chunk_index": 0,
        "total_chunks": 42,
        "start_time": 0.0,
        "end_time": 58.3,
        "language": "en"
      }
    }
  ]
}
```

---

## Implementatiedetails

**Stack:** Frontend-only transformatie in `src/utils/formatTranscript.ts`. Geen backend calls. Sub-seconde processing.

**Chunk size opties:** 30s / 60s / 90s / 120s — instelbaar via Settings → Developer Exports, opgeslagen in `profiles.rag_chunk_size`.

**Overlap berekening:** `Math.round(chunkSizeSeconds * 0.15)` seconden.

**Overlap strategie — extraction-method aware:**

De overlap implementatie verschilt op basis van `extraction_method`:

- **`assemblyai`** — sentence-boundary overlap via `sbd` npm package. Na het bouwen van chunk K worden de laatste `Math.ceil(sentences.length * 0.15)` zinnen als overlap-tekst meegenomen aan het begin van chunk K+1. De `start_time` van chunk K+1 wordt bepaald door backwards te zoeken door de segmenten van chunk K totdat de geaccumuleerde tekst-lengte gelijk is aan de overlap-tekst — zodat `deep_link` van chunk K+1 altijd exact overeenkomt met het begin van de tekst, inclusief de overlap. Fallback: als de backwards-zoek geen match vindt, gebruik `chunkEnd - overlapSeconds` als tijdsbasis.

- **`youtube_captions`** — segment-boundary overlap. Segmenten met `offset >= chunkEnd - overlapSeconds` worden herhaald aan het begin van chunk K+1. `start_time` = offset van het eerste overlap-segment.

**Waarom het verschil:** AssemblyAI transcripts hebben leestekens — `sbd` kan zinsgrenzen detecteren. Auto-captions hebben geen leestekens en zijn niet splitbaar op zinsniveau; segment-level overlap is de enige haalbare aanpak.

**Token count:** `Math.round(text.split(/\s+/).length * 1.33)` — cl100k_base benadering.

**Deep link:** `https://youtu.be/{video_id}?t={Math.floor(start_time)}` — weggelaten als `video_id` niet beschikbaar is.

**Chunk ID:** `{video_id}_chunk_{index.toString().padStart(3, '0')}` — deterministisch, sorteerbaar, uniek. Fallback als geen video_id: `chunk_{index.toString().padStart(3, '0')}`.

**Pricing:** `Math.max(1, Math.ceil(duration_seconds / 900))` — 1 credit per 15 minuten video.

**UX:** Bevestigingsmodal altijd tonen (Radix Dialog) — bevat chunk selector (4 opties), prijs, en een "Wat is RAG JSON?" link. `profiles.rag_export_confirmed`, de reset-knop, en de `confirmExport` parameter in `deductRagExportCreditsAction` zijn verwijderd. Insufficient-credits banner als saldo tekort is.

**Gating:** Ingelogde users (gratis én betaald). Anoniem ziet de dropdown entry met lock-icon.

**Channel extractie:** `audio_utils.py` gebruikt `info.get('uploader') or info.get('channel')` — fallback nodig omdat yt-dlp per video type wisselend gebruikt.

**Language detectie (AssemblyAI pad):** lingua-language-detector op eerste 20 segmenten na transcriptie. `language` in DB wordt gezet als niet-None.

**AssemblyAI channel/language in frontend:** `GET /api/jobs/{job_id}` haalt `channel` en `language` op via JOIN-query op `transcript_id` (`transcripts` tabel). `WhisperCompleteEvent` bevat deze velden; `handleWhisperSuccess` en Pad B roepen `setVideoChannel`/`setVideoLanguage` aan zodat `TranscriptCard.buildRagJson` de metadata correct meekrijgt.

**Library export pad:** `TranscriptViewer` accepteert `channel` (als `channelTitle`) en `language` props — `page.tsx` geeft ze door uit `transcript.channel` / `transcript.language`. Beide worden doorgegeven aan `buildRagJson` zodat library RAG exports dezelfde metadata bevatten als transcribe-pagina exports.

**`processing_method` waarde:** backend slaat `'assemblyai'` op (niet `'whisper_ai'`). `VideoTab.tsx` gebruikt `'assemblyai'` bij DB lookups en in `setExistingTranscriptMethod` — cruciaal voor `rag_exports` write en `revalidatePath` correctheid.

**Race condition fix — `existingTranscriptId`:** `pollWhisperJob` geeft `transcript_id` terug in `WhisperCompleteEvent` (rechtstreeks uit de job completion response). `handleWhisperSuccess` en het directe Whisper-pad roepen `setExistingTranscriptId(transcript_id)` aan zonder aparte Supabase query — elimineert de race condition waarbij de RAG export knop klikbaar was voordat `existingTranscriptId` gezet was.

**Cache invalidatie na export:** `revalidatePath(\`/dashboard/library/${transcriptId}\`)` in `deductRagExportCreditsAction` — Next.js-gedocumenteerde methode voor cache-invalidatie vanuit een Server Action. Zorgt dat de library pagina verse data laadt na navigatie.

**Niet-Engelse content:** YouTube auto-captions geven altijd Engelse vertaling terug ongeacht de video-taal — YouTube CDN beperking, niet fixbaar. Voor niet-Engelse content is AssemblyAI transcriptie de enige betrouwbare route.

---

## Competitive gap

| Feature | youtube-transcript-api | LangChain YoutubeLoader | LlamaIndex | INDXR.AI |
|---|---|---|---|---|
| RAG-ready chunks | ❌ Ruwe 2–5s segmenten | ⚠️ 120s, geen sentence snapping | ❌ Monolithische tekst | ✅ Configureerbaar + sentence snap |
| Deep link per chunk | ❌ | ❌ | ❌ | ✅ |
| Token count per chunk | ❌ | ❌ | ❌ | ✅ |
| Overlap | ❌ | ❌ | ❌ | ✅ 15% default |
| Flat metadata per chunk | ❌ | ⚠️ Video-level alleen | ❌ | ✅ |
| IP blocking handled | ❌ | ❌ | ❌ | ✅ Residential proxies |
| GUI (geen code) | ❌ | ❌ | ❌ | ✅ |

---

## Pricing

| Video lengte | RAG export kosten |
|---|---|
| 0–15 min | 1 credit |
| 16–30 min | 2 credits |
| 31–60 min | 4 credits |
| 61–120 min | 8 credits |
| 121+ min | 1 credit per 15 min |

---

## Bekende beperkingen

- Niet-Engelse YouTube captions geven Engelse vertaling — gebruik AssemblyAI voor niet-Engelse content
- Sentence-boundary snapping werkt beter op AssemblyAI transcripts (leestekens aanwezig) dan op auto-captions (geen leestekens)
- Filler word removal ([Music], [Applause], "um", "uh") nog niet geïmplementeerd — backlog

---

## Consequenties

- [x] Frontend: "RAG JSON ✦" entry in export dropdown
- [x] Video-metadata in export (video_id, title, duration, extraction_method, channel, language, published_at)
- [x] `extracted_at` timestamp per export
- [x] Credit-aftrek via `deduct_credits_atomic` RPC (Server Action)
- [x] Supabase migratie: `profiles.rag_chunk_size` (`rag_export_confirmed` is verwijderd — modal altijd tonen)
- [x] Developer Exports sectie in Settings (chunk size selector; reset-knop verwijderd)
- [x] Clean JSON bijgewerkt: `segments` met `start_time`/`end_time`
- [x] `lingua-language-detector` fallback
- [x] `chunk_id` per chunk
- [x] `deep_link` per chunk
- [x] `token_count_estimate` per chunk
- [x] Flat `metadata` object per chunk
- [x] Sentence-boundary overlap (15%) — AssemblyAI via `sbd`; YouTube captions via segment-boundary
- [x] `overlap_strategy` in `chunking_config` (`sentence_boundary` / `segment_boundary`)
- [x] 90s chunk preset
- [x] Supabase migratie: CHECK constraint uitbreiden naar `(30, 60, 90, 120)` — `supabase/migrations/20260423_rag_chunk_size_90.sql` (handmatig uitvoeren)
- [x] `rag_exports JSONB DEFAULT '[]'` kolom aan `transcripts` toegevoegd — slaat export history op per transcript
- [x] "Developer ✦" tabblad in library — export history + gratis herexport met elke preset
- [x] "RAG ✦" badge in transcript-lijst als `rag_exports` niet leeg is
- [x] `buildRagJson()` utility in `formatTranscript.ts` — gedeeld tussen TranscriptCard en RagExportView
- [x] "RAG JSON ✦" in library export dropdown (`TranscriptViewer`) — opent altijd Dialog; State A (eerste export) met chunk selector + kredietkosten; State B (herexport) gratis clientside download
- [x] Chunk selector in TranscriptCard modal — 4-knops grid, init op `profiles.rag_chunk_size`; vervangt read-only label + settings-link
- [x] AssemblyAI transcripties slaan `channel` (yt-dlp uploader) en `language` (lingua detector op eerste 20 segmenten) op in `transcripts` — conditioneel (alleen als niet None). Captions path slaat ook channel en language op via TranscriptMetadata → INSERT in transcribe/page.tsx

**Chunk size scoping:** `profiles.rag_chunk_size` (Settings → Developer Exports) is de *default* voor de eerste export vanuit de transcribe-pagina (TranscriptCard) en de library dialog. De gebruiker kan per export een andere preset kiezen.

- [ ] Filler word removal ([Music], [Applause], "um", "uh") — backlog
- [ ] SEO-pagina's aanmaken na implementatie
