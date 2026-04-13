# Beslissing 015: RAG-Geoptimaliseerde JSON Export

**Status:** Geaccepteerd (pending implementatie)
**Datum:** 2026-04-14
**Gerelateerde code:** Export component (frontend-only transformatie, geen backend API-calls)

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

## Consequenties

- [ ] Frontend: toggle "RAG-optimized" toevoegen aan JSON-export
- [ ] Implementeer chunk-merge algoritme: accumuleer segmenten tot ~30 seconden
- [ ] Voeg video-metadata toe aan export (video_id, title, duration, extraction_method)
- [ ] Documenten `extracted_at` timestamp per export
- [ ] SEO-pagina's aanmaken na implementatie
- [ ] Overweeg of RAG-export achter paid user status geplaatst wordt (zie ADR-014)
