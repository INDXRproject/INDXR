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

**UX:** Bevestigingsmodal bij eerste gebruik (Radix Dialog), overgeslagen bij `profiles.rag_export_confirmed = true`. Insufficient-credits banner als saldo tekort is. Reset confirmation knop in Developer Exports settings.

**Gating:** Ingelogde users (gratis én betaald). Anoniem ziet de dropdown entry met lock-icon.

**Language detection fallback:** `language` komt van yt-dlp's `info.get('language')`. Fallback: `lingua-language-detector` detecteert taal uit eerste 500 woorden (13 talen). `language_detected: true` in backend response als via detectie bepaald.

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
- [x] Supabase migratie: `profiles.rag_export_confirmed`, `profiles.rag_chunk_size`
- [x] Developer Exports sectie in Settings met reset confirmation knop
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
- [ ] Filler word removal ([Music], [Applause], "um", "uh") — backlog
- [ ] SEO-pagina's aanmaken na implementatie
