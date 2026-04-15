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
export const createParagraphMode = (transcript: TranscriptItem[]): string => {
  const fullText = transcript.map((t) => decodeEntities(t.text)).join(' ');
  const paragraphs: string[] = [];
  let currentParagraph = '';
  const words = fullText.split(' ');

  for (const word of words) {
    const testParagraph = currentParagraph ? `${currentParagraph} ${word}` : word;
    if (testParagraph.length >= 400 && testParagraph.length <= 500) {
      paragraphs.push(testParagraph);
      currentParagraph = '';
    } else if (testParagraph.length > 500) {
      if (currentParagraph) paragraphs.push(currentParagraph);
      currentParagraph = word;
    } else {
      currentParagraph = testParagraph;
    }
  }
  if (currentParagraph) paragraphs.push(currentParagraph);
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
