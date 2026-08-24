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

// ─── Subtitle generation (SRT/VTT) ───────────────────────────────────────────
// Line length, line count and cue duration follow the Netflix Timed Text Style Guide (the most-cited
// industry spec): max 42 characters per line, max 2 lines per cue, max 7 s per cue — all enforced
// HARD. Netflix's minimum cue duration is 5/6 s (~0.83 s); we are stricter at 1 s. A passage longer
// than one cue is split ACROSS cues (the old wrap capped at two lines and spilled the rest into an
// unbounded second line) — on a sentence boundary when one is in reach, otherwise a word boundary,
// never mid-word, with cue times running proportionally with the text.
//
// Reading speed (see ADR-094): Netflix caps adult English at 20 cps (17 cps is their value for
// children's content and French). We cannot always meet 20: professional subtitlers reach it by
// CONDENSING the spoken text (dropping filler, rewriting), whereas we transcribe verbatim — so on
// fast speech you cannot keep every word, stay under 20 cps AND stay in sync at the same time
// (forcing 20 was measured to desync a 2.6 h transcript by 247 s). The ceiling is therefore 21 cps,
// one above the Netflix limit; cues are lengthened toward the target only into silent gaps so this
// never drifts the timeline. NOTE: 21 is calibrated on one fast English transcript — slower or
// non-English recordings would tolerate a lower ceiling, but it is currently one constant for all.
//
// The speaker name shows only on the first cue of a turn, and its character budget differs by format:
// SRT carries it as an in-budget "Name: " prefix (SRT has no speaker markup and its file often lands
// in an editor or upload form), VTT carries it as an out-of-budget <v Name> voice tag (players render
// who is speaking, and the tag leaves the full 42 characters for spoken text).
export const SUBTITLE_MAX_LINE = 42;
export const SUBTITLE_MAX_LINES = 2;
export const SUBTITLE_MAX_CUE_SEC = 7;
const SUBTITLE_MIN_CUE_SEC = 1;   // Netflix minimum is 5/6 s (~0.83 s); we are stricter
const SUBTITLE_TARGET_CPS = 20;   // Netflix adult-English reading limit; cues fill gaps toward this
const SUBTITLE_CEIL_CPS = 21;     // hard ceiling: one above the limit (verbatim-transcription trade-off, ADR-094)

/** Word that ends a sentence (Unicode terminators + optional closing quote/bracket). */
const WORD_ENDS_SENTENCE = /[.!?؟۔。！？…]+["')\]»”’]*$/u;

interface SubtitleCue { start: number; end: number; lines: string[]; voice?: string }
interface TimedWord { text: string; start: number; end: number; speaker?: string; endsSentence: boolean }

/** Greedy word-wrap into at most SUBTITLE_MAX_LINES lines of at most SUBTITLE_MAX_LINE chars.
 *  Returns null when the text cannot fit without breaking a word or spilling to a third line —
 *  the caller reads that as the signal to push the overflow into a new cue. */
function wrapLines(text: string): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (w.length > SUBTITLE_MAX_LINE) return null; // would need a mid-word break
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length <= SUBTITLE_MAX_LINE) {
      cur = cand;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= SUBTITLE_MAX_LINES) return null; // would need a third line
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 && lines.length <= SUBTITLE_MAX_LINES ? lines : null;
}

/** Last-resort wrap that guarantees every line ≤ SUBTITLE_MAX_LINE even for a pathological token
 *  longer than a line (essentially never in speech). Keeps the "no line over 42" bound absolute. */
function hardWrap(text: string): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    let word = raw;
    while (word.length > SUBTITLE_MAX_LINE) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, SUBTITLE_MAX_LINE));
      word = word.slice(SUBTITLE_MAX_LINE);
    }
    const cand = cur ? `${cur} ${word}` : word;
    if (cand.length <= SUBTITLE_MAX_LINE) cur = cand;
    else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

/** Interpolate a per-word timeline from segment-level timings (char-proportional within each
 *  segment) so a cue that spans only part of a long segment gets a proportional slice of its time. */
function toTimedWords(transcript: TranscriptItem[]): TimedWord[] {
  const out: TimedWord[] = [];
  for (const item of transcript) {
    const text = decodeEntities(item.text).trim();
    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    const totalLen = words.reduce((n, w) => n + w.length + 1, 0);
    const span = Math.max(0, item.duration);
    let acc = 0;
    for (const w of words) {
      const wStart = item.offset + span * (acc / totalLen);
      acc += w.length + 1;
      const wEnd = item.offset + span * (acc / totalLen);
      out.push({ text: w, start: wStart, end: wEnd, speaker: item.speaker, endsSentence: WORD_ENDS_SENTENCE.test(w) });
    }
  }
  return out;
}

/** Build broadcast-safe cues: pack words into cues bounded by line/char/time, prefer sentence
 *  breaks, then lengthen each cue into the following gap up to the reading-speed target.
 *  `nameInBudget` decides how the first-cue-of-a-turn speaker label is handled: SRT counts a
 *  "Name: " prefix against the 42/84 budget (baked into `lines`); VTT keeps the name OUT of the
 *  budget (returned as `cue.voice` for a <v Name> tag), leaving the full width for spoken text —
 *  so the two formats segment differently and VTT fits more text per turn-opening cue. */
function buildSubtitleCues(
  transcript: TranscriptItem[],
  speakerNames: Record<string, string> | undefined,
  nameInBudget: boolean,
): SubtitleCue[] {
  const words = toTimedWords(transcript);
  const cues: SubtitleCue[] = [];
  let i = 0;

  while (i < words.length) {
    const speaker = words[i].speaker;
    const firstOfTurn = i === 0 || words[i - 1].speaker !== speaker;
    const name = firstOfTurn ? resolveSpeakerName(speaker ?? null, speakerNames) : null;
    // SRT: the label eats into the line budget. VTT: it is a zero-width <v> tag, so budget is unaffected.
    const prefix = nameInBudget && name ? `${name}: ` : '';

    // Always include at least the first word, then extend while it still fits line/char/time.
    let text = words[i].text;
    let end = words[i].end;
    let lastSentenceEnd = words[i].endsSentence ? i : -1;
    let j = i + 1;
    while (j < words.length && words[j].speaker === speaker) {
      const cand = `${text} ${words[j].text}`;
      if (!wrapLines(prefix + cand)) break;
      if (words[j].end - words[i].start > SUBTITLE_MAX_CUE_SEC) break;
      text = cand;
      end = words[j].end;
      if (words[j].endsSentence) lastSentenceEnd = j;
      j++;
    }

    // Prefer a sentence boundary: if we stopped mid-sentence but a sentence ended earlier inside
    // this cue (and more words of the same speaker follow), cut back to that boundary so sentences
    // are not split across cues unless a single sentence is itself too long for one cue.
    const moreSameSpeaker = j < words.length && words[j].speaker === speaker;
    const stoppedMidSentence = moreSameSpeaker && !words[j - 1].endsSentence;
    if (stoppedMidSentence && lastSentenceEnd >= i && lastSentenceEnd < j - 1) {
      j = lastSentenceEnd + 1;
      text = words.slice(i, j).map((w) => w.text).join(' ');
      end = words[j - 1].end;
    }

    const lines = wrapLines(prefix + text) ?? hardWrap(prefix + text);
    cues.push({ start: words[i].start, end, lines, voice: !nameInBudget && name ? name : undefined });
    i = j;
  }

  // Reading speed. Two forces per cue: keep it on-screen long enough to read (>= reading target and
  // >= a hard minimum), and don't let it start before the previous one ends. A cue is lengthened
  // into the following gap up to the reading target; when a very short source segment (a one-word
  // interjection AssemblyAI timestamped at ~0s) can't reach the minimum within the gap, the minimum
  // wins and the next cue's start is pushed — a forward drift that is reabsorbed at the next real
  // pause (the natural start is used again as soon as it is later than the running cursor), so it
  // never accumulates across the file. Everything stays capped at SUBTITLE_MAX_CUE_SEC and cues
  // never overlap.
  let prevEnd = -Infinity;
  for (let k = 0; k < cues.length; k++) {
    const cue = cues[k];
    const chars = cue.lines.join('').length;
    const start = Math.max(cue.start, prevEnd);
    const naturalNext = k + 1 < cues.length ? cues[k + 1].start : Infinity;
    // 1) Sync-preserving fill: extend toward the reading target (chars ÷ target CPS) but only into
    //    the silent gap before the next cue — this never pushes the timeline, so it cannot drift.
    const readEnd = start + Math.min(SUBTITLE_MAX_CUE_SEC, Math.max(SUBTITLE_MIN_CUE_SEC, chars / SUBTITLE_TARGET_CPS));
    let end = Math.max(cue.end, Math.min(readEnd, Math.max(cue.end, naturalNext)));
    // 2) Readability floor: never leave a cue above the ceiling CPS (or below the minimum). This may
    //    push the next cue slightly, but only for cues the audio itself crams in too fast; the push
    //    is reabsorbed at the next pause (start = max(natural, prevEnd)), so it does not accumulate.
    const floorEnd = start + Math.min(SUBTITLE_MAX_CUE_SEC, Math.max(SUBTITLE_MIN_CUE_SEC, chars / SUBTITLE_CEIL_CPS));
    end = Math.max(end, floorEnd);
    end = Math.min(end, start + SUBTITLE_MAX_CUE_SEC);
    cue.start = start;
    cue.end = end;
    prevEnd = end;
  }

  return cues;
}

export const generateSrt = (
  transcript: TranscriptItem[],
  meta?: { extractionMethod?: string; speakerNames?: Record<string, string> }
): string => {
  // SRT has no speaker field, so the name is an in-budget "Name: " prefix baked into the cue lines.
  const cues = buildSubtitleCues(transcript, meta?.speakerNames, true);
  return cues
    .map((cue, index) => {
      const startTime = formatSrtTimestamp(cue.start);
      const endTime = formatSrtTimestamp(cue.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${cue.lines.join('\n')}\n`;
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

  // WebVTT's native <v Name> voice tag on the first cue of a turn: it is zero-width on screen (so the
  // full 42 characters stay available for spoken text) and a player that ignores it simply shows no
  // name, which is no loss on video where the viewer can see who is speaking. Name is OUT of budget.
  const cues = buildSubtitleCues(transcript, meta?.speakerNames, false);
  const body = cues
    .map((cue, index) => {
      const startTime = formatVttTimestamp(cue.start);
      const endTime = formatVttTimestamp(cue.end);
      const lines = cue.voice
        ? [`<v ${cue.voice}>${cue.lines[0]}`, ...cue.lines.slice(1)]
        : cue.lines;
      return `${index + 1}\n${startTime} --> ${endTime}\n${lines.join('\n')}\n`;
    })
    .join("\n");

  return `WEBVTT\n\n${noteBlock}${body}`;
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
  },
  // Enige variabele t.o.v. de transcript-front-matter: de tags-regel. De summary-export geeft hier
  // 'tags: [youtube, summary]' mee zodat een notitie-app een samenvatting van een transcript kan
  // onderscheiden. Default = de transcript-tags, zodat generateMarkdown BYTE-IDENTIEK blijft.
  tagsLine: string = 'tags: [youtube, transcript]',
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
  lines.push(tagsLine);
  lines.push('---');
  return lines.join('\n') + '\n\n';
};

// ─── AI-samenvatting → Markdown ───────────────────────────────────────────────
// De AI-samenvatting is intern al gestructureerd (overview + hoofdstukken met kop, begin/eind-
// tijdstempel en uitgewerkte notities). Deze exporter geeft dat als een .md-notitie:
//   • Front matter in EXACT dezelfde stijl/veldvolgorde/weglaat-conventie als de transcript-export
//     (buildYamlFrontmatter), alleen met `tags: [youtube, summary]` als aanduiding.
//   • `# titel` (H1), dan `## Overview` (H2), dan per hoofdstuk een H2 met hetzelfde klikbare
//     tijdstempel-formaat als generateMarkdown (`## [HH:MM:SS](youtu.be/<id>?t=N) <kop>`), gevolgd
//     door de uitgewerkte notities. H2 = het invouw-niveau, gelijk aan de transcript-secties.
// Eén artefact = twee formaten (md/txt): het transcript heeft zijn eigen exports; geen mengvorm.

export interface SummarySection {
  heading: string;
  start_time: number;
  end_time: number;
  content: string;
}

export interface SummaryMarkdownContext {
  videoId?: string;
  channel?: string;
  language?: string;
  publishedAt?: string;
  durationSeconds?: number;
  extractionMethod?: string;
  includeYamlFrontmatter?: boolean;
}

export const generateSummaryMarkdown = (
  summary: { overview?: string; sections?: SummarySection[] },
  title: string,
  context?: SummaryMarkdownContext,
): string => {
  const frontmatter = context?.includeYamlFrontmatter
    ? buildYamlFrontmatter(title, context, 'tags: [youtube, summary]')
    : '';
  const overview = (summary?.overview || '').trim();
  const sections = Array.isArray(summary?.sections) ? summary.sections : [];

  const parts: string[] = [`${frontmatter}# ${title}`];
  if (overview) parts.push(`## Overview\n\n${overview}`);

  for (const sec of sections) {
    const ts = formatHHMMSS(sec.start_time);
    const heading = context?.videoId
      ? `## [${ts}](https://youtu.be/${context.videoId}?t=${Math.floor(sec.start_time)}) ${sec.heading}`
      : `## [${ts}] ${sec.heading}`;
    parts.push(`${heading}\n\n${(sec.content || '').trim()}`);
  }

  return parts.join('\n\n');
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
