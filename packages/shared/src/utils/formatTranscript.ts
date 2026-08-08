import sbd from 'sbd';

export interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
  /** Diarisatie-label ('A','B',…) — alleen aanwezig bij AI-transcripties met sprekerherkenning.
   *  Ontbreekt op captions en oude transcripties (die renderen/exporteren zonder sprekerlabel). */
  speaker?: string;
}

/** Map een ruw diarisatie-label ('A','B',…) naar de weer te geven naam. Een hernoemde naam uit de
 *  toewijzing wint; anders een leesbare 'Speaker A'-fallback. Geeft null als er geen spreker is
 *  (niet-gediariseerde transcripties) zodat callers geen leeg label tonen. */
export function resolveSpeakerName(
  label: string | undefined | null,
  names?: Record<string, string> | null,
): string | null {
  if (!label) return null;
  const custom = names?.[label];
  return custom && custom.trim() ? custom.trim() : `Speaker ${label}`;
}

// Decode HTML entities from YouTube caption API
export const decodeEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
};

// Helper: Format timestamp for SRT (HH:MM:SS,mmm)
const formatSrtTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

// Helper: Format timestamp for VTT (HH:MM:SS.mmm)
const formatVttTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// Helper: Format HH:MM:SS (no milliseconds, for display/Markdown)
const formatHHMMSS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper: Create paragraph mode (merge granular captions into natural paragraphs)
// Breaks on: gap > 2s between segments, accumulated duration > 90s, or sentence-ending punctuation
export const createParagraphMode = (
  transcript: TranscriptItem[],
  speakerNames?: Record<string, string>,
): string => {
  const paragraphs: string[] = [];
  let currentSegments: string[] = [];
  let currentDuration = 0;
  let currentSpeaker: string | undefined;
  let prevItem: TranscriptItem | null = null;

  const flush = () => {
    if (currentSegments.length === 0) return;
    const name = resolveSpeakerName(currentSpeaker, speakerNames);
    const body = currentSegments.join(' ');
    paragraphs.push(name ? `${name}: ${body}` : body);
    currentSegments = [];
    currentDuration = 0;
  };

  for (const item of transcript) {
    const text = decodeEntities(item.text).trim();
    if (!text) continue;

    const gap = prevItem ? item.offset - (prevItem.offset + prevItem.duration) : 0;
    const prevEndsWithSentence = prevItem ? /[.!?]$/.test(decodeEntities(prevItem.text).trim()) : false;
    // Een sprekerwissel breekt altijd af, zodat een alinea nooit twee sprekers bevat.
    const speakerChanged = currentSegments.length > 0 && item.speaker !== currentSpeaker;

    const shouldBreak =
      currentSegments.length > 0 &&
      (gap > 2 || currentDuration > 90 || prevEndsWithSentence || speakerChanged);

    if (shouldBreak) flush();

    if (currentSegments.length === 0) currentSpeaker = item.speaker;
    currentSegments.push(text);
    currentDuration += item.duration;
    prevItem = item;
  }

  flush();

  return paragraphs.join('\n\n');
};

// ── Reading paragraphs ────────────────────────────────────────────────────────
// Groups raw caption/AI segments into readable paragraphs while KEEPING each paragraph's
// start offset (so a timestamp can lead it). This is what the reader renders instead of
// one-line-per-segment.
//
// It reflows by SENTENCE, not by segment: a pause always breaks; within a run of speech the
// text is split into sentences (Unicode-aware — punctuation lands mid-segment for AI) and
// paragraphs break only BETWEEN sentences, so the char guardrail and duration cap never slice
// a sentence. Captions break at the first sentence past `minBreakSec`. An unpunctuated run with
// no sentence boundary in reach falls back to word/segment chunks bounded by char AND duration
// (never mid-word). Thresholds are data-driven, exported + tunable so a unit test pins them.
// Measured: caption median 51–83 words; punctuated AI median ~79, max ~103, ~99% of paragraphs
// end on a sentence boundary (vs 149-word walls before).

export interface ReadingParagraph {
  startOffset: number;
  text: string;
  /** Diarisatie-label van deze alinea ('A','B',…) — alleen bij gediariseerde AI-transcripties.
   *  De renderer zet dit via resolveSpeakerName om naar een naam. */
  speaker?: string;
}

export interface ReadingParagraphConfig {
  /** A real pause longer than this (seconds) always starts a new paragraph. */
  pauseBreakSec: number;
  captions: { minBreakSec: number; maxParaSec: number };
  ai: { maxParaSec: number };
  /** Hard guardrail on paragraph length in characters — bounds word count regardless of
   *  speaking rate (a duration cap alone lets fast speakers produce 140+ word walls). */
  maxChars: number;
}

export const READING_PARAGRAPH_CONFIG: ReadingParagraphConfig = {
  pauseBreakSec: 2,
  captions: { minBreakSec: 22, maxParaSec: 45 },
  ai: { maxParaSec: 32 },
  maxChars: 500,
};

interface Seg { text: string; offset: number; duration: number; speaker?: string }

// Sentence-ending punctuation across the scripts we see (Latin, Arabic ؟ ۔, CJK 。！？, ellipsis),
// followed by optional closing quotes/brackets and whitespace-or-end.
const SENTENCE_END = /[.!?؟۔。！？…]+["')\]»”’]*(?=\s|$)/gu;

/** Split text into sentences tagged with their start char index. Unicode-aware (a spoken
 *  transcript rarely has abbreviation periods, so a terminator regex beats English-only sbd —
 *  it also handles Arabic ؟ and CJK, which sbd misses). Whole string when no boundary is found. */
function splitSentencesWithPos(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  const re = new RegExp(SENTENCE_END.source, "gu");
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    const raw = text.slice(last, end);
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) out.push({ text: trimmed, start: last + lead });
    last = end;
  }
  if (last < text.length) {
    const raw = text.slice(last);
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) out.push({ text: trimmed, start: last + lead });
  }
  return out.length ? out : text.trim() ? [{ text: text.trim(), start: text.length - text.trimStart().length }] : [];
}

export function buildReadingParagraphs(
  transcript: TranscriptItem[],
  opts: { isAi?: boolean; config?: ReadingParagraphConfig } = {},
): ReadingParagraph[] {
  const cfg = opts.config ?? READING_PARAGRAPH_CONFIG;
  const isAi = !!opts.isAi;
  const maxSec = isAi ? cfg.ai.maxParaSec : cfg.captions.maxParaSec;
  const minSec = isAi ? 0 : cfg.captions.minBreakSec;

  const segs: Seg[] = [];
  for (const it of transcript) {
    const t = decodeEntities(it.text).trim();
    if (t) segs.push({ text: t, offset: it.offset, duration: it.duration, speaker: it.speaker });
  }
  if (segs.length === 0) return [];

  // Split at real pauses first — a silence always starts a new paragraph. A speaker change also
  // starts a new paragraph, so each block (and thus each paragraph) belongs to a single speaker.
  const blocks: Seg[][] = [];
  let cur: Seg[] = [segs[0]];
  for (let i = 1; i < segs.length; i++) {
    const gap = segs[i].offset - (segs[i - 1].offset + segs[i - 1].duration);
    if (gap > cfg.pauseBreakSec || segs[i].speaker !== segs[i - 1].speaker) { blocks.push(cur); cur = []; }
    cur.push(segs[i]);
  }
  blocks.push(cur);

  // Word-aligned segment accumulation bounded by BOTH char and duration — the fallback for
  // unpunctuated speech where there are no sentence boundaries to align to.
  const segmentChunks = (subset: Seg[]): { text: string; offset: number }[] => {
    const out: { text: string; offset: number }[] = [];
    let texts: string[] = [], off = 0, chars = 0, dur = 0;
    const fl = () => { if (texts.length) { out.push({ text: texts.join(' '), offset: off }); texts = []; chars = 0; dur = 0; } };
    for (const s of subset) {
      if (texts.length && (chars + s.text.length + 1 > cfg.maxChars || dur + s.duration > maxSec)) fl();
      if (!texts.length) off = s.offset;
      texts.push(s.text); chars += s.text.length + 1; dur += s.duration;
    }
    fl();
    return out;
  };

  const paras: ReadingParagraph[] = [];
  for (const block of blocks) {
    const blockSpeaker = block[0]?.speaker;
    // Reconstruct the block's continuous text with a char-index → segment map.
    let full = "";
    const bounds: { charStart: number; charEnd: number; seg: Seg }[] = [];
    for (const s of block) {
      if (full.length) full += " ";
      const cs = full.length;
      full += s.text;
      bounds.push({ charStart: cs, charEnd: full.length, seg: s });
    }
    const offsetAt = (charPos: number) => {
      let off = bounds[0].seg.offset;
      for (const b of bounds) { if (b.charStart <= charPos) off = b.seg.offset; else break; }
      return off;
    };
    const overlapping = (a: number, b: number) => bounds.filter((bd) => bd.charStart < b && bd.charEnd > a).map((bd) => bd.seg);

    // Group whole sentences into paragraphs, breaking only BETWEEN sentences: captions break at
    // the first sentence past minBreakSec; everything is bounded by the char guardrail and the
    // duration cap — but never mid-sentence. An over-long sentence (unpunctuated run, no boundary
    // to align to) is emitted as its own already-bounded word/segment chunks.
    let texts: string[] = [], startOffset = 0, accChars = 0;
    const flush = () => { if (texts.length) { paras.push({ startOffset, text: texts.join(' '), speaker: blockSpeaker }); texts = []; accChars = 0; } };
    const addUnit = (u: { text: string; offset: number }) => {
      if (texts.length > 0) {
        const durSoFar = u.offset - startOffset;
        const overChars = accChars + 1 + u.text.length > cfg.maxChars;
        const captionBreak = !isAi && durSoFar >= minSec;
        if (overChars || durSoFar >= maxSec || captionBreak) flush();
      }
      if (texts.length === 0) startOffset = u.offset;
      texts.push(u.text);
      accChars += (accChars ? 1 : 0) + u.text.length;
    };
    for (const s of splitSentencesWithPos(full)) {
      if (s.text.length <= cfg.maxChars) {
        addUnit({ text: s.text, offset: offsetAt(s.start) });
      } else {
        flush(); // end the grouped sentences, then push the run's bounded chunks as paragraphs
        for (const c of segmentChunks(overlapping(s.start, s.start + s.text.length))) paras.push({ startOffset: c.offset, text: c.text, speaker: blockSpeaker });
      }
    }
    flush();
  }
  return paras;
}

export interface SubtitleBlock {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
}

function resegmentTranscript(
  transcript: TranscriptItem[],
  extractionMethod?: string
): SubtitleBlock[] {
  if (transcript.length === 0) return [];

  const isAi = extractionMethod === 'assemblyai' || extractionMethod === 'whisper_ai';
  const blocks: SubtitleBlock[] = [];
  let segTexts: string[] = [];
  let blockStart = transcript[0].offset;
  let blockDuration = 0;
  let blockSpeaker: string | undefined;

  const flush = (endTime: number) => {
    if (segTexts.length === 0) return;
    blocks.push({ startTime: blockStart, endTime, text: segTexts.join(' '), speaker: blockSpeaker });
    segTexts = [];
    blockDuration = 0;
  };

  for (let i = 0; i < transcript.length; i++) {
    const item = transcript[i];
    const text = decodeEntities(item.text).trim();
    if (!text) continue;

    // Sprekerwissel sluit het lopende cue-blok af (één spreker per ondertitelblok).
    if (segTexts.length > 0 && item.speaker !== blockSpeaker) flush(item.offset);

    const isFirst = segTexts.length === 0;
    if (isFirst) { blockStart = item.offset; blockSpeaker = item.speaker; }

    segTexts.push(text);
    blockDuration += item.duration;

    const nextOffset = i < transcript.length - 1
      ? transcript[i + 1].offset
      : item.offset + item.duration;

    if (isAi) {
      const endsOnSentence = /[.?!]$/.test(text);
      if (blockDuration >= 7) {
        flush(nextOffset);
      } else if (blockDuration >= 4 && endsOnSentence) {
        flush(nextOffset);
      } else if (blockDuration >= 3 && endsOnSentence && i === transcript.length - 1) {
        flush(nextOffset);
      }
    } else {
      if (blockDuration >= 3) {
        flush(nextOffset);
      }
    }
  }

  // flush any remaining segments
  if (segTexts.length > 0) {
    const last = transcript[transcript.length - 1];
    flush(last.offset + last.duration);
  }

  return blocks;
}

function wrapSubtitleText(text: string, maxChars = 42): string {
  if (text.length <= maxChars) return text;
  const words = text.split(' ');
  let line1 = '';
  let i = 0;
  while (i < words.length) {
    const candidate = line1 ? `${line1} ${words[i]}` : words[i];
    if (candidate.length > maxChars) break;
    line1 = candidate;
    i++;
  }
  if (i === 0) return text; // single word longer than maxChars — don't break
  const line2 = words.slice(i).join(' ');
  return line2 ? `${line1}\n${line2}` : line1;
}

export const generateSrt = (
  transcript: TranscriptItem[],
  meta?: { extractionMethod?: string; speakerNames?: Record<string, string> }
): string => {
  const blocks = resegmentTranscript(transcript, meta?.extractionMethod);
  return blocks
    .map((block, index) => {
      const startTime = formatSrtTimestamp(block.startTime);
      const endTime = formatSrtTimestamp(block.endTime);
      // SRT kent geen sprekerveld — conventie is de naam als prefix in de cue-tekst.
      const name = resolveSpeakerName(block.speaker, meta?.speakerNames);
      const body = name ? `${name}: ${block.text}` : block.text;
      return `${index + 1}\n${startTime} --> ${endTime}\n${wrapSubtitleText(body)}\n`;
    })
    .join("\n");
};

export const generateVtt = (
  transcript: TranscriptItem[],
  meta?: { title?: string; language?: string; extractionMethod?: string; speakerNames?: Record<string, string> }
): string => {
  const noteLines: string[] = [];
  if (meta?.title) noteLines.push(`title: ${meta.title}`);
  if (meta?.language) noteLines.push(`language: ${meta.language}`);
  const noteBlock = noteLines.length > 0 ? `NOTE\n${noteLines.join('\n')}\n\n` : '';

  const blocks = resegmentTranscript(transcript, meta?.extractionMethod);
  const cues = blocks
    .map((block, index) => {
      const startTime = formatVttTimestamp(block.startTime);
      const endTime = formatVttTimestamp(block.endTime);
      // WebVTT heeft een native voice-tag <v Naam>…; dat is de correcte sprekerconventie hier.
      const name = resolveSpeakerName(block.speaker, meta?.speakerNames);
      const body = wrapSubtitleText(block.text);
      const cueText = name ? `<v ${name}>${body}` : body;
      return `${index + 1}\n${startTime} --> ${endTime}\n${cueText}\n`;
    })
    .join("\n");

  return `WEBVTT\n\n${noteBlock}${cues}`;
};

export const generateCsv = (
  transcript: TranscriptItem[],
  meta?: {
    title?: string;
    videoId?: string;
    channel?: string;
    publishedAt?: string;
    durationSeconds?: number;
    language?: string;
    extractionMethod?: string;
    speakerNames?: Record<string, string>;
  }
): string => {
  const BOM = '﻿';

  const metaLines: string[] = [];
  if (meta?.title)   metaLines.push(`# title: ${meta.title}`);
  if (meta?.videoId) metaLines.push(`# url: https://www.youtube.com/watch?v=${meta.videoId}`);
  if (meta?.channel) metaLines.push(`# channel: ${meta.channel}`);
  if (meta?.publishedAt) metaLines.push(`# published: ${meta.publishedAt}`);
  if (typeof meta?.durationSeconds === 'number') metaLines.push(`# duration_seconds: ${meta.durationSeconds}`);
  if (meta?.language) metaLines.push(`# language: ${meta.language}`);
  if (meta?.extractionMethod) {
    const src = (meta.extractionMethod === 'assemblyai' || meta.extractionMethod === 'whisper_ai')
      ? 'AI Transcription (AssemblyAI)'
      : 'YouTube captions';
    metaLines.push(`# transcript_source: ${src}`);
  }
  metaLines.push(`# extracted: ${new Date().toISOString().slice(0, 10)}`);
  const metadataRows = metaLines.join('\n') + '\n';

  // Sprekerkolom alleen toevoegen als er daadwerkelijk sprekers zijn — anders blijft het CSV-schema
  // voor niet-gediariseerde transcripties exact gelijk (geen lege kolom).
  const hasSpeakers = transcript.some((t) => t.speaker);
  const header = hasSpeakers
    ? 'segment_index,start_time,end_time,duration,word_count,speaker,text\n'
    : 'segment_index,start_time,end_time,duration,word_count,text\n';

  const rows = transcript.map((t, i) => {
    const text = decodeEntities(t.text);
    const endTime = i < transcript.length - 1
      ? transcript[i + 1].offset
      : t.offset + t.duration;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const escapedText = `"${text.replace(/"/g, '""')}"`;
    if (!hasSpeakers) {
      return `${i},${t.offset},${endTime},${t.duration},${wordCount},${escapedText}`;
    }
    const name = resolveSpeakerName(t.speaker, meta?.speakerNames) ?? '';
    const escapedSpeaker = `"${name.replace(/"/g, '""')}"`;
    return `${i},${t.offset},${endTime},${t.duration},${wordCount},${escapedSpeaker},${escapedText}`;
  }).join('\n');

  return BOM + metadataRows + header + rows;
};

export const generateTxt = (
  transcript: TranscriptItem[],
  timestamps: boolean,
  speakerNames?: Record<string, string>,
): string => {
  if (timestamps) {
    return transcript
      .map((t) => {
        const timestamp = new Date(t.offset * 1000).toISOString().substr(11, 8);
        const name = resolveSpeakerName(t.speaker, speakerNames);
        const text = decodeEntities(t.text);
        return name ? `${timestamp}  ${name}: ${text}` : `${timestamp}  ${text}`;
      })
      .join("\n");
  }
  return createParagraphMode(transcript, speakerNames);
};

export interface RagChunk {
  chunk_index: number;
  chunk_id: string;
  text: string;
  start_time: number;
  end_time: number;
  deep_link?: string;
  token_count_estimate: number;
  metadata: {
    video_id: string | null;
    title: string | null;
    channel: string | null;
    chunk_index: number;
    total_chunks: number;
    start_time: number;
    end_time: number;
    language: string | null;
    /** Sprekers in dit chunk (weergegeven namen), in volgorde van eerste voorkomen. Alleen aanwezig
     *  bij gediariseerde transcripties — een chunk kan meerdere sprekers omspannen. */
    speakers?: string[];
  };
}

type RawChunk = Omit<RagChunk, 'metadata'> & {
  metadata: Omit<RagChunk['metadata'], 'total_chunks'>;
};

function buildRagChunks(
  transcript: TranscriptItem[],
  chunkSizeSeconds: number,
  context?: {
    videoId?: string;
    title?: string;
    channel?: string;
    language?: string;
    extractionMethod?: string;
    speakerNames?: Record<string, string>;
  }
): RagChunk[] {
  const { videoId, title, channel, language, extractionMethod, speakerNames } = context ?? {};
  const overlapSeconds = Math.round(chunkSizeSeconds * 0.15);
  const useSentenceBoundary = extractionMethod === 'assemblyai' || extractionMethod === 'whisper_ai';

  const makeChunkId = (idx: number) =>
    videoId
      ? `${videoId}_chunk_${idx.toString().padStart(3, '0')}`
      : `chunk_${idx.toString().padStart(3, '0')}`;

  const makeDeepLink = (startTime: number) =>
    videoId ? `https://youtu.be/${videoId}?t=${Math.floor(startTime)}` : undefined;

  const rawChunks: RawChunk[] = [];

  let texts: string[] = [];
  let chunkSegments: TranscriptItem[] = [];
  let chunkStart = 0;
  let sentenceOverlapPrefix = '';
  let sentenceOverlapStartTime: number | null = null;

  const pushChunk = (chunkEnd: number) => {
    const newText = texts.join(' ');
    const fullText = sentenceOverlapPrefix ? `${sentenceOverlapPrefix} ${newText}` : newText;
    if (!fullText.trim()) return;

    const startTime = useSentenceBoundary ? (sentenceOverlapStartTime ?? chunkStart) : chunkStart;
    const idx = rawChunks.length;
    const deepLink = makeDeepLink(startTime);
    const tokenCount = Math.round(fullText.split(/\s+/).filter(Boolean).length * 1.33);

    // Distinct sprekers in dit chunk (in volgorde van eerste voorkomen), omgezet naar namen.
    const speakers: string[] = [];
    for (const seg of chunkSegments) {
      const name = resolveSpeakerName(seg.speaker, speakerNames);
      if (name && !speakers.includes(name)) speakers.push(name);
    }

    rawChunks.push({
      chunk_index: idx,
      chunk_id: makeChunkId(idx),
      text: fullText,
      start_time: startTime,
      end_time: chunkEnd,
      ...(deepLink ? { deep_link: deepLink } : {}),
      token_count_estimate: tokenCount,
      metadata: {
        video_id: videoId ?? null,
        title: title ?? null,
        channel: channel ?? null,
        chunk_index: idx,
        start_time: startTime,
        end_time: chunkEnd,
        language: language ?? null,
        ...(speakers.length ? { speakers } : {}),
      },
    });

    if (useSentenceBoundary) {
      const sentences = sbd.sentences(fullText, { newline_boundaries: false });
      if (sentences.length > 0) {
        const overlapCount = Math.max(1, Math.ceil(sentences.length * 0.15));
        sentenceOverlapPrefix = sentences.slice(-overlapCount).join(' ');
        // Walk backwards through segments to find the offset where overlap text begins
        let accumulated = 0;
        sentenceOverlapStartTime = chunkEnd - overlapSeconds; // fallback
        for (let j = chunkSegments.length - 1; j >= 0; j--) {
          accumulated += decodeEntities(chunkSegments[j].text).length + 1;
          if (accumulated >= sentenceOverlapPrefix.length) {
            sentenceOverlapStartTime = chunkSegments[j].offset;
            break;
          }
        }
      } else {
        sentenceOverlapPrefix = '';
        sentenceOverlapStartTime = null;
      }
      texts = [];
      chunkSegments = [];
    } else {
      // Seed next chunk with overlap segments from the tail of this chunk
      const overlapSegs: TranscriptItem[] = [];
      for (let j = chunkSegments.length - 1; j >= 0; j--) {
        if (chunkSegments[j].offset >= chunkEnd - overlapSeconds) {
          overlapSegs.unshift(chunkSegments[j]);
        } else {
          break;
        }
      }
      texts = overlapSegs.map(s => decodeEntities(s.text));
      chunkSegments = [...overlapSegs];
      chunkStart = overlapSegs.length > 0 ? overlapSegs[0].offset : chunkEnd;
    }
  };

  for (let i = 0; i < transcript.length; i++) {
    const item = transcript[i];
    const itemEnd = i < transcript.length - 1
      ? transcript[i + 1].offset
      : item.offset + item.duration;

    if (texts.length === 0) chunkStart = item.offset;
    texts.push(decodeEntities(item.text));
    chunkSegments.push(item);

    if (itemEnd - chunkStart >= chunkSizeSeconds) {
      pushChunk(itemEnd);
    }
  }

  if (texts.length > 0) {
    const last = transcript[transcript.length - 1];
    pushChunk(last.offset + last.duration);
  }

  const total = rawChunks.length;
  return rawChunks.map(c => ({
    ...c,
    metadata: { ...c.metadata, total_chunks: total },
  }));
}

export const generateMarkdown = (
  transcript: TranscriptItem[],
  title: string,
  withTimestamps: boolean,
  context?: {
    videoId?: string;
    channel?: string;
    language?: string;
    publishedAt?: string;
    durationSeconds?: number;
    extractionMethod?: string;
    includeYamlFrontmatter?: boolean;
    speakerNames?: Record<string, string>;
  }
): string => {
  const frontmatter = context?.includeYamlFrontmatter ? buildYamlFrontmatter(title, context) : '';
  const names = context?.speakerNames;
  // Markdown-conventie voor sprekers: naam vet vooraan de alinea (**Naam:** …). Alleen als er een
  // spreker is; anders ongewijzigd.
  const withSpeaker = (speaker: string | undefined, body: string): string => {
    const name = resolveSpeakerName(speaker, names);
    return name ? `**${name}:** ${body}` : body;
  };

  if (withTimestamps) {
    const sections: string[] = [];
    let currentText = '';
    let currentOffset = 0;
    let currentSpeaker: string | undefined;
    const pushSection = () => {
      const ts = formatHHMMSS(currentOffset);
      const heading = context?.videoId
        ? `## [${ts}](https://youtu.be/${context.videoId}?t=${Math.floor(currentOffset)})`
        : `## [${ts}]`;
      sections.push(`${heading}\n${withSpeaker(currentSpeaker, currentText.trim())}`);
    };
    for (let i = 0; i < transcript.length; i++) {
      const item = transcript[i];
      const prev = transcript[i - 1];
      const gap = prev ? item.offset - (prev.offset + prev.duration) : 0;
      const speakerChanged = !!currentText && item.speaker !== currentSpeaker;
      if ((gap > 5 || speakerChanged) && currentText) {
        pushSection();
        currentText = decodeEntities(item.text);
        currentOffset = item.offset;
        currentSpeaker = item.speaker;
      } else {
        const text = decodeEntities(item.text);
        if (!currentText) { currentOffset = item.offset; currentSpeaker = item.speaker; }
        currentText = currentText ? `${currentText} ${text}` : text;
      }
    }
    if (currentText) pushSection();
    return `${frontmatter}# ${title}\n\n${sections.join('\n\n')}`;
  }

  // Merge segments into paragraphs; break on gaps > 5 seconds or a speaker change.
  const paragraphs: string[] = [];
  let currentParagraph = '';
  let currentSpeaker: string | undefined;
  for (let i = 0; i < transcript.length; i++) {
    const item = transcript[i];
    const prev = transcript[i - 1];
    const gap = prev ? item.offset - (prev.offset + prev.duration) : 0;
    const text = decodeEntities(item.text);
    const speakerChanged = !!currentParagraph && item.speaker !== currentSpeaker;
    if ((gap > 5 || speakerChanged) && currentParagraph) {
      paragraphs.push(withSpeaker(currentSpeaker, currentParagraph.trim()));
      currentParagraph = text;
      currentSpeaker = item.speaker;
    } else {
      if (!currentParagraph) currentSpeaker = item.speaker;
      currentParagraph = currentParagraph ? `${currentParagraph} ${text}` : text;
    }
  }
  if (currentParagraph) paragraphs.push(withSpeaker(currentSpeaker, currentParagraph.trim()));
  return `${frontmatter}# ${title}\n\n${paragraphs.join('\n\n')}`;
};

function buildYamlFrontmatter(
  title: string,
  context?: {
    videoId?: string;
    channel?: string;
    language?: string;
    publishedAt?: string;
    durationSeconds?: number;
    extractionMethod?: string;
  }
): string {
  const lines: string[] = ['---'];
  lines.push(`title: "${(title || 'YouTube Video').replace(/"/g, '\\"')}"`);
  if (context?.videoId)   lines.push(`url: "https://www.youtube.com/watch?v=${context.videoId}"`);
  if (context?.channel)   lines.push(`channel: "${context.channel.replace(/"/g, '\\"')}"`);
  if (context?.publishedAt) lines.push(`published: "${context.publishedAt}"`);
  if (typeof context?.durationSeconds === 'number') lines.push(`duration: ${context.durationSeconds}`);
  if (context?.language)  lines.push(`language: "${context.language}"`);
  if (context?.extractionMethod) {
    const src = (context.extractionMethod === 'assemblyai' || context.extractionMethod === 'whisper_ai')
      ? 'AI Transcription (AssemblyAI)'
      : 'YouTube captions';
    lines.push(`transcript_source: "${src}"`);
  }
  lines.push(`created: "${new Date().toISOString().slice(0, 10)}"`);
  lines.push('type: youtube');
  lines.push('tags: [youtube, transcript]');
  lines.push('---');
  return lines.join('\n') + '\n\n';
};

export interface RagJsonContext {
  videoId?: string | null;
  title?: string | null;
  channel?: string | null;
  language?: string | null;
  publishedAt?: string | null;
  durationSeconds?: number | null;
  extractionMethod?: string | null;
  chunkSize?: number;
  speakerNames?: Record<string, string> | null;
}

export function buildRagJson(transcript: TranscriptItem[], context: RagJsonContext = {}): string {
  const {
    videoId, title, channel, language, publishedAt,
    durationSeconds, extractionMethod, chunkSize = 60, speakerNames,
  } = context;

  const isAi = extractionMethod === 'assemblyai' || extractionMethod === 'whisper_ai';
  const overlapStrategy = isAi ? 'sentence_boundary' : 'segment_boundary';
  const chunks = buildRagChunks(transcript, chunkSize, {
    videoId: videoId ?? undefined,
    title: title ?? undefined,
    channel: channel ?? undefined,
    language: language ?? undefined,
    extractionMethod: extractionMethod ?? undefined,
    speakerNames: speakerNames ?? undefined,
  });

  const derivedDuration = durationSeconds != null ? durationSeconds : (
    transcript.length > 0
      ? transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration
      : 0
  );

  const metadata: Record<string, unknown> = {
    video_id: videoId ?? null,
    title: title ?? null,
    duration_seconds: Math.round(derivedDuration),
    extracted_at: new Date().toISOString(),
    chunking_config: {
      chunk_size_seconds: chunkSize,
      overlap_seconds: Math.round(chunkSize * 0.15),
      overlap_strategy: overlapStrategy,
      total_chunks: chunks.length,
    },
  };
  if (channel) metadata.channel = channel;
  if (language) metadata.language = language;
  if (publishedAt) metadata.published_at = publishedAt;
  if (extractionMethod) metadata.extraction_method = extractionMethod;

  return JSON.stringify({ metadata, chunks }, null, 2);
}
