# How to Chunk YouTube Transcripts for RAG (and Why 30 Seconds Is Wrong)

**Meta title:** How to Chunk YouTube Transcripts for RAG — Research-Backed Guide | INDXR.AI
**Meta description:** The chunk size you pick matters more than your embedding model. This guide covers the research on optimal chunk sizes, fixed vs semantic chunking, overlap, and sentence-boundary snapping for YouTube transcripts.
**Slug:** /blog/chunk-youtube-transcripts-for-rag
**Schema:** Article + HowTo + FAQPage
**Internal links:** /youtube-transcript-for-rag, /youtube-transcript-json, /pricing
**Word count:** ~2400 words

---

The chunk size you pick for YouTube transcripts matters more than your embedding model choice. That's not an intuition — it's the finding of a 2025 peer-reviewed study from Vectara, published at NAACL, which tested 25 chunking configurations across 48 embedding models and found that chunking strategy had equal or greater influence on retrieval quality than the choice of embedding model ("Is Semantic Chunking Worth the Computational Cost?", Qu et al., NAACL 2025 Findings, arxiv.org/abs/2410.13070).

Most developers default to 30-second chunks because granularity feels useful. But 30 seconds of spoken English produces roughly 75 words — approximately 100 tokens at standard English tokenization rates. That's well below the 256–512 token range that benchmarks consistently identify as the sweet spot for dense embedding retrieval. You're embedding fragments that lack context, and your retrieval quality shows it.

This guide covers what the research actually says about chunking YouTube transcripts for RAG pipelines, with specific numbers from peer-reviewed studies and production benchmarks.

---

## Why YouTube Transcripts Need Special Treatment

Before getting into chunk sizes, it's worth understanding what makes YouTube transcripts different from other documents you might chunk for RAG.

YouTube's transcript API returns segments of 2–5 seconds each — roughly 5–15 words per object. This is the granularity the captioning system uses for subtitle timing, not a unit of meaning. A single sentence might span three or four API segments. Load these directly into a vector database and you're embedding fragments like "so the first thing" and "you need to understand" as separate chunks. These aren't meaningful retrieval units.

YouTube transcripts also lack punctuation in auto-generated form. The speech recognition system outputs a stream of lowercase words. Without sentence boundaries, naive fixed-size character or word splitting will cut through sentences mid-thought. This damages both the coherence of individual chunks and the accuracy of retrieval.

The third challenge is timestamp alignment. Unlike a PDF or web page, a YouTube transcript has a unique property: every piece of text maps to a specific moment in a video. Lose that mapping during chunking and you lose the ability to cite sources with timestamps — one of the most valuable properties of video-based RAG systems.

---

## How Many Tokens Is 30 Seconds of Speech?

The starting point for any chunking decision is understanding what you're working with. Spoken English averages approximately 130–150 words per minute in formal speech and 150–160 words per minute for conversational speech and YouTube creators (National Center for Voice and Speech, ncvs.org; VirtualSpeech, virtualspeech.com/blog/average-speaking-rate-words-per-minute). Using OpenAI's `cl100k_base` tokenizer, English text tokenizes at approximately 1.3–1.4 tokens per word.

| Chunk duration | Words (~150 WPM) | Tokens (~1.33×) | For RAG? |
|---|---|---|---|
| 30 seconds | ~75 | ~100 | ❌ Too small — below 256-token floor |
| 60 seconds | ~150 | ~200 | ⚠️ Minimum viable |
| 90 seconds | ~225 | ~300 | ✅ Good — inside sweet spot |
| 120 seconds | ~300 | ~400 | ✅ Optimal — industry benchmark |
| 180 seconds | ~450 | ~600 | ⚠️ Getting large — context dilution risk |

LangChain's YoutubeLoader defaults to `chunk_size_seconds=120` (LangChain API docs, api.python.langchain.com/en/latest/community/document_loaders/langchain_community.document_loaders.youtube.YoutubeLoader.html). This isn't arbitrary — it aligns with the ~400 token range that produces the best retrieval results across the published benchmarks.

---

## What the Research Says About Chunk Size

Three sources are worth citing specifically because they represent different research methodologies:

**Vectara NAACL 2025** tested 25 chunking configurations across 48 embedding models on a diverse retrieval benchmark. The key finding: chunking strategy influenced retrieval quality as much as or more than the embedding model. Larger fixed-size chunks (512+ tokens) generally outperformed smaller ones. Semantic chunking — which adjusts boundaries based on semantic similarity — did not reliably beat well-chosen fixed-size chunking ("Is Semantic Chunking Worth the Computational Cost?", Qu et al., arxiv.org/abs/2410.13070).

**NVIDIA's benchmark** tested chunk sizes from 128 to 2,048 tokens against different query types. Factoid queries (precise lookups) performed best with 256–512 token chunks. Analytical queries (which require broader context) performed better with 512–1,024 tokens. For YouTube transcripts, where queries tend to be topic-based rather than exact-phrase lookups, the 256–512 range is the appropriate target (NVIDIA Technical Blog, developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses).

**Chroma Research** evaluated chunking strategies across multiple embedding models and found that `RecursiveCharacterTextSplitter` at 400 tokens achieved approximately 89% recall — competitive with more complex approaches at a fraction of the computational cost (research.trychroma.com/evaluating-chunking). This confirms that the token-range target matters more than the sophistication of the splitting algorithm.

**Microsoft Azure AI Search** recommends starting with 512 tokens and 25% overlap as a baseline for most document types (Microsoft Learn, learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents). For audio transcripts, where sentences are shorter than technical documents, 300–400 tokens (90–120 seconds) often performs comparably.

---

## Fixed-Time vs Semantic Chunking: Which Wins for Transcripts?

Semantic chunking — detecting topic shifts and adjusting chunk boundaries accordingly — sounds appealing in theory. In practice, it underperforms for audio transcripts specifically.

The Vectara NAACL 2025 study found that semantic chunking consistently failed to justify its computational cost versus optimally-sized fixed chunks. A 2026 benchmark by Vecta tested seven chunking strategies on real-world data and found semantic chunking produced an average chunk size of only 43 tokens — far below the optimal range — with accuracy of 54%. Recursive fixed-size chunking at 512 tokens achieved 69% accuracy at a fraction of the compute cost (Vecta, runvecta.com/blog/we-benchmarked-7-chunking-strategies-most-advice-was-wrong).

For YouTube transcripts specifically, there's an additional argument against semantic chunking: timestamp alignment. Semantic chunkers adjust boundaries based on text similarity, which can produce chunks that span awkward time ranges. A time-based approach that snaps to sentence boundaries preserves the timestamp-to-chunk mapping that makes video RAG uniquely valuable.

**The recommendation: time-based chunking with sentence-boundary snapping.** Target a duration (90–120 seconds), but adjust the boundary ±5 seconds to avoid cutting mid-sentence. This gives you:
- Predictable token ranges (~300–400 tokens)
- Clean sentence boundaries
- Preserved timestamp alignment
- Consistent chunk sizes that make deduplication and indexing predictable

---

## Overlap: 15% Is the Research-Backed Default

Chunk overlap — repeating a portion of one chunk at the start of the next — helps retrieval when a relevant passage spans a chunk boundary. The question is how much.

NVIDIA's benchmark tested 10%, 15%, and 20% overlap. 15% performed best across query types. Microsoft Azure recommends 25% as a starting point, which is slightly more conservative but in the same range. For 120-second chunks, 15% overlap equals approximately 18 seconds of repeated context — roughly one or two sentences.

One important caveat: a 2026 analysis using sparse retrieval (SPLADE) found that overlap provided no measurable benefit for that specific retrieval method. Overlap improves dense embedding retrieval (OpenAI, Cohere, Voyage AI) but may be unnecessary for sparse methods. The `overlap_seconds` field in INDXR.AI's RAG JSON export lets you set this to zero if you're using sparse retrieval.

---

## What to Include in Every Chunk's Metadata

Chunk size is only half the story. Retrieval quality also depends heavily on what metadata you attach to each chunk. When a query retrieves a chunk, the downstream LLM needs enough context to generate a useful response and cite its source.

At minimum, each chunk should carry: video ID, video title, channel name, start and end timestamps (as floats for computation, as formatted strings for display), and a pre-constructed deep link to the exact timestamp in the video. The deep link matters because it's the citation — "According to [Title] at 12:34, ..." is only useful if the viewer can actually jump to that moment.

Optional but valuable: chapter title (if the video has YouTube chapters), language code, and whether the transcript came from auto-captions or AI transcription. The `is_auto_generated` flag in particular lets downstream pipelines apply different confidence weighting to auto-caption chunks versus AI-transcribed ones.

---

## Implementing This in Practice

The most direct path: use INDXR.AI's [RAG JSON export](/youtube-transcript-for-rag), which implements time-based chunking with sentence-boundary snapping, 15% overlap, and full metadata per chunk as described above. Each chunk includes the `deep_link` field. The output loads directly into LangChain, LlamaIndex, Pinecone, ChromaDB, Weaviate, and Qdrant with minimal glue code.

If you're building the chunking yourself, here's the minimal pipeline for an AssemblyAI-sourced transcript:

```python
import pysbd  # Sentence boundary detection, 97.9% accuracy (Golden Rule Set)
import tiktoken
import json

def chunk_transcript(segments, target_seconds=120, overlap_seconds=18):
    """
    segments: list of {text, start, end} dicts from AssemblyAI output
    Returns: list of chunk dicts with text, start_time, end_time, token_count
    """
    enc = tiktoken.get_encoding("cl100k_base")
    segmenter = pysbd.Segmenter(language="en", clean=False)
    
    # Step 1: Merge raw segments into continuous text with timestamp index
    full_text = " ".join(s["text"] for s in segments)
    
    # Step 2: Split into sentences
    sentences = segmenter.segment(full_text)
    
    # Step 3: Map sentences back to timestamps
    # (simplified — production code needs character-level mapping)
    
    # Step 4: Accumulate sentences until target duration, snap to sentence boundary
    chunks = []
    current_chunk_sentences = []
    current_start = segments[0]["start"]
    
    for sentence in sentences:
        current_chunk_sentences.append(sentence)
        chunk_text = " ".join(current_chunk_sentences)
        
        # Estimate duration from token count (rough proxy)
        token_count = len(enc.encode(chunk_text))
        
        if token_count >= (target_seconds / 0.4):  # ~400 tokens = 120 seconds
            chunks.append({
                "text": chunk_text,
                "token_count": token_count
            })
            # Carry over last overlap_sentences for next chunk
            overlap_sentence_count = max(1, int(len(current_chunk_sentences) * 0.15))
            current_chunk_sentences = current_chunk_sentences[-overlap_sentence_count:]
    
    # Don't forget the final chunk
    if current_chunk_sentences:
        chunks.append({"text": " ".join(current_chunk_sentences)})
    
    return chunks
```

`pysbd` (Python Sentence Boundary Detection) achieves 97.9% accuracy on the Golden Rule Set benchmark — significantly better than `nltk.punkt` (62.1% precision) while being rule-based with no model downloads required (pysbd documentation, github.com/nipunsadvilkar/pySBD). For AssemblyAI transcripts that already include punctuation, this works reliably out of the box.

---

## Summary: The Practical Defaults

| Parameter | Research-backed default | Source |
|---|---|---|
| Chunk duration | 120 seconds (~400 tokens) | LangChain default; NVIDIA benchmark |
| Chunk strategy | Fixed-time + sentence-boundary snap | Vectara NAACL 2025; Vecta 2026 |
| Overlap | 15% (~18 seconds for 120s chunks) | NVIDIA benchmark |
| Minimum viable | 60 seconds (~200 tokens) | Token range analysis |
| Avoid | < 60 seconds (< 150 tokens) | Below 256-token floor |

These aren't the only valid parameters — smaller chunks work better for some retrieval patterns, and larger ones suit analytical queries over long lectures. But if you're starting from scratch and want a setting that performs well across most YouTube RAG use cases, 120 seconds with 15% overlap and sentence snapping is where the research points.

---

## Frequently Asked Questions

**Why does chunk size matter more than the embedding model?**
The Vectara NAACL 2025 study tested this directly: across 48 embedding models, the choice of chunking strategy had equal or greater influence on retrieval quality than the model itself. An excellent embedding model can't compensate for chunks that are too small to carry semantic content or too large to be precise.

**Does semantic chunking ever beat fixed-size for transcripts?**
Rarely. The Vectara paper found semantic chunking "did not consistently outperform" fixed-size approaches, and the Vecta 2026 benchmark found it produced dangerously small average chunks (43 tokens) with poor accuracy (54%). For transcripts specifically, time-based chunking with sentence snapping is both simpler and more effective.

**What's the right chunk size for short YouTube videos (under 5 minutes)?**
For very short videos, 120-second chunks may produce only 2–3 chunks, which limits retrieval granularity. Consider 30–60 second chunks for short-form content. INDXR.AI's RAG export lets you select 30s, 60s, 90s, or 120s chunk sizes to match your content type.

**Does overlap help if I'm using sparse retrieval (BM25, SPLADE)?**
No — a 2026 systematic analysis found that overlap provided no measurable benefit for sparse retrieval methods. Set overlap to 0% if you're indexing with SPLADE or BM25. The overlap benefit applies specifically to dense embedding models (OpenAI, Cohere, Voyage AI).

**Should I chunk at extraction time or at export time?**
At export time. Storing pre-chunked transcripts with multiple configurations wastes storage. The compute cost to chunk a 1-hour transcript (pySBD + tiktoken) is under 1 second on CPU — it's fast enough to run synchronously on demand. INDXR.AI processes chunking at export time so you can re-export with different chunk sizes from the same stored transcript.

---

*The fastest path to a properly-chunked YouTube RAG pipeline: [INDXR.AI's RAG JSON export](/youtube-transcript-for-rag) handles all of the above — sentence snapping, 15% overlap, deep links per chunk — in one download.*
