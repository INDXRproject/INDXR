import sbd from 'sbd';

export interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
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
export const createParagraphMode = (transcript: TranscriptItem[]): string => {
  const paragraphs: string[] = [];
  let currentSegments: string[] = [];
  let currentDuration = 0;
  let prevItem: TranscriptItem | null = null;

  for (const item of transcript) {
    const text = decodeEntities(item.text).trim();
    if (!text) continue;

    const gap = prevItem ? item.offset - (prevItem.offset + prevItem.duration) : 0;
    const prevEndsWithSentence = prevItem ? /[.!?]$/.test(decodeEntities(prevItem.text).trim()) : false;

    const shouldBreak =
      currentSegments.length > 0 &&
      (gap > 2 || currentDuration > 90 || prevEndsWithSentence);

    if (shouldBreak) {
      paragraphs.push(currentSegments.join(' '));
      currentSegments = [];
      currentDuration = 0;
    }

    currentSegments.push(text);
    currentDuration += item.duration;
    prevItem = item;
  }

  if (currentSegments.length > 0) {
    paragraphs.push(currentSegments.join(' '));
  }

  return paragraphs.join('\n\n');
};

export const generateSrt = (transcript: TranscriptItem[]): string => {
  return transcript
    .map((item, index) => {
      const startTime = formatSrtTimestamp(item.offset);
      const endOffset = index < transcript.length - 1 ? transcript[index + 1].offset : item.offset + item.duration;
      const endTime = formatSrtTimestamp(endOffset);
      return `${index + 1}\n${startTime} --> ${endTime}\n${decodeEntities(item.text)}\n`;
    })
    .join("\n");
};

export const generateVtt = (transcript: TranscriptItem[]): string => {
  return "WEBVTT\n\n" + transcript
    .map((item, index) => {
      const startTime = formatVttTimestamp(item.offset);
      const endOffset = index < transcript.length - 1 ? transcript[index + 1].offset : item.offset + item.duration;
      const endTime = formatVttTimestamp(endOffset);
      return `${index + 1}\n${startTime} --> ${endTime}\n${decodeEntities(item.text)}\n`;
    })
    .join("\n");
};

export const generateCsv = (transcript: TranscriptItem[]): string => {
  const header = "Start,Duration,Text\n";
  const rows = transcript
    .map((t) => {
      const text = decodeEntities(t.text);
      return `${t.offset},${t.duration},"${text.replace(/"/g, '""')}"`;
    })
    .join("\n");
  return header + rows;
};

export const generateTxt = (transcript: TranscriptItem[], timestamps: boolean): string => {
  if (timestamps) {
    return transcript
      .map((t) => {
        const timestamp = new Date(t.offset * 1000).toISOString().substr(11, 8);
        return `${timestamp}  ${decodeEntities(t.text)}`;
      })
      .join("\n");
  }
  return createParagraphMode(transcript);
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
  };
}

type RawChunk = Omit<RagChunk, 'metadata'> & {
  metadata: Omit<RagChunk['metadata'], 'total_chunks'>;
};

export function buildRagChunks(
  transcript: TranscriptItem[],
  chunkSizeSeconds: number,
  context?: {
    videoId?: string;
    title?: string;
    channel?: string;
    language?: string;
    extractionMethod?: string;
  }
): RagChunk[] {
  const { videoId, title, channel, language, extractionMethod } = context ?? {};
  const overlapSeconds = Math.round(chunkSizeSeconds * 0.15);
  const useSentenceBoundary = extractionMethod === 'assemblyai';

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

export const generateMarkdown = (transcript: TranscriptItem[], title: string, withTimestamps: boolean): string => {
  if (withTimestamps) {
    const sections = transcript
      .map((t) => `## [${formatHHMMSS(t.offset)}]\n${decodeEntities(t.text)}`)
      .join('\n\n');
    return `# ${title}\n\n${sections}`;
  }

  // Merge segments into paragraphs; break on gaps > 5 seconds
  const paragraphs: string[] = [];
  let currentParagraph = '';
  for (let i = 0; i < transcript.length; i++) {
    const item = transcript[i];
    const prev = transcript[i - 1];
    const gap = prev ? item.offset - (prev.offset + prev.duration) : 0;
    const text = decodeEntities(item.text);
    if (gap > 5 && currentParagraph) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = text;
    } else {
      currentParagraph = currentParagraph ? `${currentParagraph} ${text}` : text;
    }
  }
  if (currentParagraph) paragraphs.push(currentParagraph.trim());
  return `# ${title}\n\n${paragraphs.join('\n\n')}`;
};
