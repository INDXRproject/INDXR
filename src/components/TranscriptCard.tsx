"use client";

import { useState } from "react";
import { Copy, FileText, FileJson, FileType, Film, Video, FileCode, Download, ChevronDown, Check, LogIn, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { decodeEntities, createParagraphMode, buildRagChunks } from "@/utils/formatTranscript";
import { deductRagExportCreditsAction } from "@/app/actions/rag-export";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

interface TranscriptCardProps {
  transcript: TranscriptItem[];
  videoTitle?: string;
  videoUrl?: string;
  showSignupCard?: boolean;
  videoId?: string;
  durationSeconds?: number;
  extractionMethod?: string;
  channel?: string;
  language?: string;
  publishedAt?: string;
  languageDetected?: boolean;
}

const RAG_CHUNK_LABELS: Record<number, { label: string; sub: string }> = {
  30:  { label: "Quote",    sub: "30s"  },
  60:  { label: "Balanced", sub: "60s"  },
  90:  { label: "Precise",  sub: "90s"  },
  120: { label: "Context",  sub: "120s" },
};

export function TranscriptCard({
  transcript,
  videoTitle = "YouTube Video",
  videoUrl = "",
  showSignupCard = false,
  videoId,
  durationSeconds,
  extractionMethod,
  channel,
  language,
  publishedAt,
  languageDetected,
}: TranscriptCardProps) {
  const [copied, setCopied] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showRagModal, setShowRagModal] = useState(false);
  const [ragModalDontShowAgain, setRagModalDontShowAgain] = useState(false);
  const [ragExportLoading, setRagExportLoading] = useState(false);
  const [ragConfirmedThisSession, setRagConfirmedThisSession] = useState(false);
  const [showInsufficientCreditsForRag, setShowInsufficientCreditsForRag] = useState(false);
  const { user, profile, credits, refreshCredits } = useAuth();

  const derivedDuration =
    durationSeconds ??
    (transcript.length > 0
      ? transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration
      : 0);

  const ragCost = Math.max(1, Math.ceil(derivedDuration / 900));
  const ragDurationMin = Math.ceil(derivedDuration / 60);
  const chunkSize = (profile?.rag_chunk_size ?? 60) as 30 | 60 | 90 | 120;
  const chunkLabel = RAG_CHUNK_LABELS[chunkSize] ?? RAG_CHUNK_LABELS[60];

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

  // Helper: Format HH:MM:SS (for Markdown headings)
  const formatHHMMSS = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fullTextWithTimestamps = transcript
    .map((t) => {
      const timestamp = new Date(t.offset * 1000).toISOString().substr(11, 8);
      return `${timestamp}  ${decodeEntities(t.text)}`;
    })
    .join("\n");

  const copyToClipboard = () => {
    const textToCopy = showTimestamps ? fullTextWithTimestamps : createParagraphMode(transcript);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requireAuth = (): boolean => {
    if (!user) {
      setShowSignupPrompt(true);
      return false;
    }
    return true;
  };

  const downloadTxtPlain = () => {
    posthog.capture('export_clicked', { format: 'txt' });
    downloadFile(createParagraphMode(transcript), "transcript.txt", "text/plain");
  };

  const downloadTxtWithTimestamps = () => {
    posthog.capture('export_clicked', { format: 'txt-timestamps' });
    downloadFile(fullTextWithTimestamps, "transcript_timestamps.txt", "text/plain");
  };

  const buildYamlFrontmatter = (): string => {
    const lines: string[] = ['---'];
    lines.push(`title: "${(videoTitle || 'YouTube Video').replace(/"/g, '\\"')}"`);
    if (videoId)        lines.push(`url: "https://www.youtube.com/watch?v=${videoId}"`);
    if (channel)        lines.push(`channel: "${channel.replace(/"/g, '\\"')}"`);
    if (publishedAt)    lines.push(`published: "${publishedAt}"`);
    if (typeof durationSeconds === 'number') lines.push(`duration: ${durationSeconds}`);
    if (language)       lines.push(`language: "${language}"`);
    if (extractionMethod) {
      const src = (extractionMethod === 'assemblyai' || extractionMethod === 'whisper_ai')
        ? 'AI Transcription (AssemblyAI)'
        : 'Auto-captions (YouTube)';
      lines.push(`transcript_source: "${src}"`);
    }
    lines.push(`created: "${new Date().toISOString().slice(0, 10)}"`);
    lines.push('type: youtube');
    lines.push('tags: [youtube, transcript]');
    lines.push('---');
    return lines.join('\n');
  };

  const downloadMarkdown = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'md' });
    const title = videoTitle || "YouTube Video";
    const paragraphs: string[] = [];
    let current = '';
    for (let i = 0; i < transcript.length; i++) {
      const item = transcript[i];
      const prev = transcript[i - 1];
      const gap = prev ? item.offset - (prev.offset + prev.duration) : 0;
      if (gap > 5 && current) {
        paragraphs.push(current.trim());
        current = decodeEntities(item.text);
      } else {
        const text = decodeEntities(item.text);
        current = current ? `${current} ${text}` : text;
      }
    }
    if (current) paragraphs.push(current.trim());
    const content = `${buildYamlFrontmatter()}\n\n# ${title}\n\n${paragraphs.join('\n\n')}`;
    downloadFile(content, "transcript.md", "text/markdown");
  };

  const downloadMarkdownWithTimestamps = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'md-timestamps' });
    const title = videoTitle || "YouTube Video";
    const sections: string[] = [];
    let currentText = '';
    let currentOffset = 0;
    for (let i = 0; i < transcript.length; i++) {
      const item = transcript[i];
      const prev = transcript[i - 1];
      const gap = prev ? item.offset - (prev.offset + prev.duration) : 0;
      if (gap > 5 && currentText) {
        const ts = formatHHMMSS(currentOffset);
        const heading = videoId
          ? `## [${ts}](https://youtu.be/${videoId}?t=${Math.floor(currentOffset)})`
          : `## [${ts}]`;
        sections.push(`${heading}\n${currentText.trim()}`);
        currentText = decodeEntities(item.text);
        currentOffset = item.offset;
      } else {
        const text = decodeEntities(item.text);
        if (!currentText) currentOffset = item.offset;
        currentText = currentText ? `${currentText} ${text}` : text;
      }
    }
    if (currentText) {
      const ts = formatHHMMSS(currentOffset);
      const heading = videoId
        ? `## [${ts}](https://youtu.be/${videoId}?t=${Math.floor(currentOffset)})`
        : `## [${ts}]`;
      sections.push(`${heading}\n${currentText.trim()}`);
    }
    const content = `${buildYamlFrontmatter()}\n\n# ${title}\n\n${sections.join('\n\n')}`;
    downloadFile(content, "transcript_timestamps.md", "text/markdown");
  };

  const downloadJson = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'json' });

    const metadata: Record<string, unknown> = {
      video_id: videoId ?? null,
      title: videoTitle ?? null,
      duration_seconds: Math.round(derivedDuration),
      extracted_at: new Date().toISOString(),
    };
    if (channel) metadata.channel = channel;
    if (language) metadata.language = language;
    if (publishedAt) metadata.published_at = publishedAt;
    if (extractionMethod) metadata.extraction_method = extractionMethod;

    const segments = transcript.map((t, i) => ({
      text: decodeEntities(t.text),
      start_time: t.offset,
      end_time: i < transcript.length - 1
        ? transcript[i + 1].offset
        : t.offset + t.duration,
    }));

    downloadFile(
      JSON.stringify({ metadata, segments }, null, 2),
      "transcript.json",
      "application/json"
    );
  };

  const downloadCsv = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'csv' });
    const header = "Start,Duration,Text\n";
    const rows = transcript
      .map((t) => { const text = decodeEntities(t.text); return `${t.offset},${t.duration},"${text.replace(/"/g, '""')}"` })
      .join("\n");
    downloadFile(header + rows, "transcript.csv", "text/csv");
  };

  const downloadSrt = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'srt' });
    const srtContent = transcript
      .map((item, index) => {
        const startTime = formatSrtTimestamp(item.offset);
        const endOffset = index < transcript.length - 1
          ? transcript[index + 1].offset
          : item.offset + item.duration;
        const endTime = formatSrtTimestamp(endOffset);
        return `${index + 1}\n${startTime} --> ${endTime}\n${decodeEntities(item.text)}\n`;
      })
      .join("\n");
    downloadFile(srtContent, "transcript.srt", "text/plain");
  };

  const downloadVtt = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'vtt' });
    const vttContent = "WEBVTT\n\n" + transcript
      .map((item, index) => {
        const startTime = formatVttTimestamp(item.offset);
        const endOffset = index < transcript.length - 1
          ? transcript[index + 1].offset
          : item.offset + item.duration;
        const endTime = formatVttTimestamp(endOffset);
        return `${index + 1}\n${startTime} --> ${endTime}\n${decodeEntities(item.text)}\n`;
      })
      .join("\n");
    downloadFile(vttContent, "transcript.vtt", "text/vtt");
  };

  const triggerRagDownload = () => {
    const chunks = buildRagChunks(transcript, chunkSize, { videoId, title: videoTitle, channel, language, extractionMethod });
    const overlapStrategy = (extractionMethod === 'assemblyai' || extractionMethod === 'whisper_ai') ? 'sentence_boundary' : 'segment_boundary';
    const metadata: Record<string, unknown> = {
      video_id: videoId ?? null,
      title: videoTitle ?? null,
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

    downloadFile(
      JSON.stringify({ metadata, chunks }, null, 2),
      "transcript_rag.json",
      "application/json"
    );
  };

  const handleRagExportClick = () => {
    if (!requireAuth()) return;

    if ((credits ?? 0) < ragCost) {
      setShowInsufficientCreditsForRag(true);
      return;
    }
    setShowInsufficientCreditsForRag(false);

    const alreadyConfirmed = ragConfirmedThisSession || (profile?.rag_export_confirmed ?? false);
    if (alreadyConfirmed) {
      executeRagExport(false);
    } else {
      setShowRagModal(true);
    }
  };

  const executeRagExport = async (confirmExport: boolean) => {
    setRagExportLoading(true);
    const result = await deductRagExportCreditsAction(derivedDuration, confirmExport);
    setRagExportLoading(false);

    if (!result.success) {
      setShowInsufficientCreditsForRag(true);
      setShowRagModal(false);
      return;
    }

    if (confirmExport) setRagConfirmedThisSession(true);
    await refreshCredits();
    setShowRagModal(false);

    posthog.capture('export_clicked', { format: 'rag_json', chunk_size: chunkSize, language, language_detected: languageDetected });
    triggerRagDownload();
  };

  return (
    <>
    {showSignupCard && !user && (
      <div className="w-full max-w-4xl mx-auto mt-8 rounded-lg border border-green-500/25 bg-green-500/8 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">✓ Got your transcript.</p>
          <p className="text-sm font-semibold text-foreground">Sign up free to save it, extract playlists, and transcribe with AI.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/signup"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Sign Up Free
          </a>
          <a
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Log In
          </a>
        </div>
      </div>
    )}
    <Card className="w-full max-w-4xl mx-auto mt-3 border shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Transcript Results</CardTitle>
            <CardDescription className="mt-1">
              {transcript.length > 0
                ? `${Math.ceil(transcript[transcript.length - 1].offset / 60)} minutes • ${transcript.length} lines`
                : "No content"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  <Download className="size-3.5" />
                  Export
                  <ChevronDown className="size-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Text
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadTxtPlain}>
                  <FileText className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">TXT — plain text</div>
                    <div className="text-xs text-muted-foreground">No timestamps</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadTxtWithTimestamps}>
                  <FileText className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">TXT — with timestamps</div>
                    <div className="text-xs text-muted-foreground">[HH:MM:SS] per line</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadMarkdown}>
                  <FileCode className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">Markdown</div>
                    <div className="text-xs text-muted-foreground">Notion, Obsidian, blog</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadMarkdownWithTimestamps}>
                  <FileCode className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">Markdown — with timestamps</div>
                    <div className="text-xs text-muted-foreground">Sections per timestamp</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Subtitles
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadSrt}>
                  <Film className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">SRT</div>
                    <div className="text-xs text-muted-foreground">SubRip Subtitle</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadVtt}>
                  <Video className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">VTT</div>
                    <div className="text-xs text-muted-foreground">Web Video Text</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Data
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadCsv}>
                  <FileType className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">CSV</div>
                    <div className="text-xs text-muted-foreground">Spreadsheet compatible</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadJson}>
                  <FileJson className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">JSON</div>
                    <div className="text-xs text-muted-foreground">segments with start/end time</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Developer
                </DropdownMenuLabel>
                {user ? (
                  <DropdownMenuItem className="gap-3 cursor-pointer" onClick={handleRagExportClick}>
                    <FileJson className="size-4 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-1.5">
                        RAG JSON
                        <span className="text-[10px] text-primary font-bold">✦</span>
                      </div>
                      <div className="text-xs text-muted-foreground">LangChain, LlamaIndex, Pinecone</div>
                    </div>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="gap-3 cursor-pointer opacity-60" onClick={() => setShowSignupPrompt(true)}>
                    <Lock className="size-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-1.5">
                        RAG JSON
                        <span className="text-[10px] text-primary font-bold">✦</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Sign in to export</div>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Timestamp Toggle */}
        <div className="flex items-center space-x-2 mt-4 pt-2">
          <Switch
            id="reader-mode"
            checked={!showTimestamps}
            onCheckedChange={(checked) => setShowTimestamps(!checked)}
          />
          <Label htmlFor="reader-mode" className="cursor-pointer flex flex-col">
            <span className="font-medium text-sm">Reader Mode</span>
            <span className="text-[10px] text-muted-foreground font-normal">Hide timestamps for easier reading</span>
          </Label>
        </div>
      </CardHeader>

      {showSignupPrompt && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <LogIn className="size-4 text-primary shrink-0" />
            <span className="text-foreground"><strong>Sign up or log in</strong> to export as CSV, SRT, VTT, JSON, or Markdown.</span>
          </div>
          <a href="/login" className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Sign in
          </a>
        </div>
      )}

      {showInsufficientCreditsForRag && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-foreground">Not enough credits for RAG export — need {ragCost} credit{ragCost !== 1 ? 's' : ''}.</span>
          <a href="/dashboard/billing" className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap">
            Buy credits →
          </a>
        </div>
      )}

      <CardContent className="p-0">
        <ScrollArea className="h-[500px] w-full bg-muted/30">
          <div className="p-6">
             <div className="space-y-4 max-w-none">
                 {transcript.map((item, index) => (
                    <div key={index} className="group hover:bg-muted/50 p-2 -mx-2 rounded transition-colors duration-200">
                        <div className={showTimestamps ? "flex gap-4" : "block"}>
                            {showTimestamps && (
                                <span className="text-xs font-mono text-muted-foreground/70 shrink-0 pt-1 select-none">
                                    {new Date(item.offset * 1000).toISOString().substr(11, 8)}
                                </span>
                            )}
                            <p className={cn("text-foreground leading-relaxed", showTimestamps ? "text-sm" : "text-base")}>
                                {item.text}
                            </p>
                        </div>
                    </div>
                 ))}
             </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>

    {/* RAG Export Confirmation Modal */}
    <Dialog open={showRagModal} onOpenChange={(open) => { if (!ragExportLoading) setShowRagModal(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Export as RAG-Optimized JSON
            <span className="text-xs text-primary font-bold">✦</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirm credit deduction for RAG JSON export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Export cost</span>
              <span className="font-semibold text-foreground">{ragCost} credit{ragCost !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {ragDurationMin} min video · 1 credit per 15 min
            </p>
            <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Your balance</span>
              <span className="font-medium text-foreground">{credits ?? 0} credits</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chunk size</span>
              <span className="font-medium text-foreground">{chunkLabel.label} ({chunkLabel.sub})</span>
            </div>
            <a
              href="/dashboard/settings"
              className="text-xs text-primary hover:underline"
            >
              Change in settings →
            </a>
          </div>

          <a
            href="/blog/chunk-youtube-transcripts-for-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            What is RAG JSON? →
          </a>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ragModalDontShowAgain}
              onChange={(e) => setRagModalDontShowAgain(e.target.checked)}
              className="rounded border-border size-4 accent-primary"
            />
            <span className="text-sm text-muted-foreground">Don&apos;t show this again</span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRagModal(false)}
            disabled={ragExportLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => executeRagExport(ragModalDontShowAgain)}
            disabled={ragExportLoading}
            className="gap-2"
          >
            {ragExportLoading && <Loader2 className="size-4 animate-spin" />}
            {ragExportLoading ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
