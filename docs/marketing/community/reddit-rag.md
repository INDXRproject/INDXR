# r/Rag — kennisbijdrage (Khidr plaatst)

**Lees eerst de regels in de zijbalk (zelfpromotie, flair).**

**Titel:**
Chunking YouTube transcripts for RAG: what worked better than fixed token windows

**Tekst:**

I've been building retrieval over long YouTube content (lectures, podcasts, 1–3 hours each) and wanted to share what made the biggest difference, in case it helps someone.

**Raw captions are a bad starting point.** Auto-captions come as 2–5 second fragments with no punctuation and no speaker turns. Chunking those by token count cuts sentences in half and mixes speakers, so the retrieved chunk often doesn't answer anything on its own.

**What helped:**
1. **Rebuild sentences first.** Merge caption fragments into punctuated sentences (or use a speech-to-text model that outputs them) before any chunking.
2. **Chunk on time, aligned to sentence boundaries.** Pick a target window (I use about 60 seconds of speech; 30 for quote lookup, 90–120 for more context) and close the chunk at the nearest sentence end, not mid-sentence.
3. **Keep timestamps and a deep link in the metadata.** Every chunk carries `start`, `end` and a `url` with `&t=<seconds>`, so an answer can cite the exact moment, and you can check the model instead of trusting it.
4. **Keep speaker labels for multi-speaker content.** For interviews, "who said it" matters as much as what was said; put the speaker in the chunk text, not only in metadata.
5. **Add source-level metadata** (title, channel, duration, language) to every chunk so you can filter retrieval per source or per channel.

I wrote the longer version with the reasoning and sources here: https://indxr.ai/articles/chunk-youtube-transcripts-for-rag?utm_source=reddit_rag

Disclosure: I make INDXR, which exports transcripts in this chunked format (RAG JSON). The approach above doesn't depend on it, though. Curious what chunk sizes and overlap others settled on for spoken content.

---
Notities voor Khidr:
- De getallen (30/60/90/120 s) zijn de presets uit de code (RAG_CHUNK_PRESETS) en het artikel; geen verzonnen benchmarks. Claim geen nauwkeurigheidswinst zonder bron.
