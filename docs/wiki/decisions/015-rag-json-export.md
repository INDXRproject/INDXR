# Beslissing 015: RAG-Geoptimaliseerde JSON Export

**Status:** Geïmplementeerd
**Datum:** 2026-04-14
**Geïmplementeerd:** 2026-04-22
**Gerelateerde code:** `src/components/TranscriptCard.tsx`, `src/utils/formatTranscript.ts`, `src/app/actions/rag-export.ts`, `src/components/dashboard/settings/DeveloperExportsCard.tsx`

---

## Context

Het huidige JSON-exportformaat geeft ruwe segmenten per 2–5 seconden:
```json
[{"text": "Hello world", "duration": 2.5, "offset": 0.0}]
```

Gebruikers op Product Hunt vroegen specifiek: *"One feature you could add is to collate the text every 30 seconds for RAG."* AI/ML-developers gebruiken INDXR-transcripten als input voor RAG-pipelines (vector databases, LangChain, etc.).

---

## Beslissing

Voeg een **"RAG-optimized" toggle** toe aan de JSON-export die:
1. Segmenten samenvoegt tot ~30-seconde chunks
2. Volledige video-metadata toevoegt
3. `start_time`/`end_time` gebruikt (in plaats van `offset` + `duration`)
4. `chunk_index` toevoegt voor ordening na retrieval

**Output formaat:**
```json
{
  "metadata": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Video Title",
    "channel": "Channel Name",
    "duration_seconds": 3600,
    "extraction_method": "auto_captions",
    "language": "en",
    "extracted_at": "2026-04-13T14:30:00Z"
  },
  "chunks": [
    {
      "text": "Samengevoegde tekst van ~30 seconden...",
      "start_time": 0.0,
      "end_time": 30.0,
      "chunk_index": 0
    }
  ]
}
```

---

## Rationale

**Technische fit:** Embedding-modellen werken het beste met 100–200 woorden per chunk. Huidige 2–5 seconden segmenten (~5–15 woorden) zijn te granulaar.

**Kosten:** Nul — dit is een frontend-transformatie van bestaande data. Geen extra API-calls.

**SEO-pagina's die dit mogelijk maakt:**
- `/youtube-transcript-json-api` — "YouTube Transcript to JSON for RAG Pipelines"
- `/youtube-transcript-for-ai` — "Feed YouTube Videos to ChatGPT, Claude, or Your RAG Pipeline"
- Blog: "How to Build a YouTube Knowledge Base with INDXR.AI + LangChain"

**Gebruikersgroep:** AI/ML-developers en researchers met hoge betalingsbereidheid en sterke word-of-mouth.

---

## Implementatiedetails (2026-04-22)

**Definitief output formaat:**
```json
{
  "metadata": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Video Title",
    "channel": "Channel Name",
    "duration_seconds": 3600,
    "extraction_method": "youtube_captions",
    "language": "en",
    "extracted_at": "2026-04-22T...",
    "chunking_config": { "chunk_size_seconds": 60, "total_chunks": 42 }
  },
  "chunks": [
    { "chunk_index": 0, "text": "...", "start_time": 0.0, "end_time": 58.3 }
  ]
}
```

**Chunk-size opties:** 30s (~100 tokens), 60s (~200 tokens, default), 120s (~390 tokens) — instelbaar via Settings → Developer Exports, opgeslagen in `profiles.rag_chunk_size`.

**Pricing:** `Math.max(1, Math.ceil(duration_seconds / 900))` — 1 credit per 15 minuten video.

**UX:** Bevestigingsmodal bij eerste gebruik (Radix Dialog), overgeslagen bij `profiles.rag_export_confirmed = true`. Insufficient-credits banner als saldo tekort is.

**Gating:** Ingelogde users (gratis én betaald). Anoniem ziet de dropdown entry met lock-icon.

## Consequenties

- [x] Frontend: "RAG JSON ✦" entry in export dropdown
- [x] Chunk-merge algoritme: `buildRagChunks()` in `formatTranscript.ts`
- [x] Video-metadata in export (video_id, title, duration, extraction_method, channel, language)
- [x] `extracted_at` timestamp per export
- [x] Credit-aftrek via `deduct_credits_atomic` RPC (Server Action)
- [x] Supabase migratie: `profiles.rag_export_confirmed`, `profiles.rag_chunk_size`
- [x] Developer Exports sectie in Settings
- [x] Clean JSON (reguliere JSON-export) bijgewerkt: `segments` met `start_time`/`end_time`
- [ ] SEO-pagina's aanmaken na implementatie
