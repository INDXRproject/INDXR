export interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

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

// Helper: Create paragraph mode (merge granular captions into natural paragraphs)
export const createParagraphMode = (transcript: TranscriptItem[]): string => {
  const fullText = transcript.map((t) => t.text).join(' ');
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

export const getBrandingHeader = (format: 'txt' | 'csv' | 'srt_vtt', title: string, url: string) => {
  if (format === 'txt') return `# INDXR.AI Free YouTube Transcript\n# ${title}\n# ${url}\n\n`;
  if (format === 'csv') return `# INDXR.AI - ${title}\n# ${url}\n`;
  if (format === 'srt_vtt') return `NOTE INDXR.AI - ${title}\nNOTE ${url}\n\n`;
  return "";
};

export const generateSrt = (transcript: TranscriptItem[], title: string, url: string): string => {
  const branding = getBrandingHeader('srt_vtt', title, url);
  const srtContent = transcript
    .map((item, index) => {
      const startTime = formatSrtTimestamp(item.offset);
      const endOffset = index < transcript.length - 1 ? transcript[index + 1].offset : item.offset + item.duration;
      const endTime = formatSrtTimestamp(endOffset);
      return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n`;
    })
    .join("\n");
  return branding + srtContent;
};

export const generateVtt = (transcript: TranscriptItem[], title: string, url: string): string => {
  const branding = getBrandingHeader('srt_vtt', title, url);
  const vttContent = "WEBVTT\n\n" + branding + transcript
    .map((item, index) => {
      const startTime = formatVttTimestamp(item.offset);
      const endOffset = index < transcript.length - 1 ? transcript[index + 1].offset : item.offset + item.duration;
      const endTime = formatVttTimestamp(endOffset);
      return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n`;
    })
    .join("\n");
  return vttContent;
};

export const generateCsv = (transcript: TranscriptItem[], title: string, url: string): string => {
  const branding = getBrandingHeader('csv', title, url);
  const header = "Start,Duration,Text\n";
  const rows = transcript
    .map((t) => `${t.offset},${t.duration},"${t.text.replace(/"/g, '""')}"`)
    .join("\n");
  return branding + header + rows;
};

export const generateTxt = (transcript: TranscriptItem[], title: string, url: string, timestamps: boolean): string => {
  const branding = getBrandingHeader('txt', title, url);
  let content = "";
  if (timestamps) {
    content = transcript
      .map((t) => {
        const timestamp = new Date(t.offset * 1000).toISOString().substr(11, 8);
        return `${timestamp}  ${t.text}`;
      })
      .join("\n");
  } else {
    content = createParagraphMode(transcript);
  }
  return branding + content;
};
