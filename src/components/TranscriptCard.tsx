"use client";

import { useState } from "react";
import { Copy, FileText, FileJson, FileType, Film, Video, FileCode, Download, ChevronDown, Check, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
}

export function TranscriptCard({ transcript, videoTitle = "YouTube Video", videoUrl = "" }: TranscriptCardProps) {
  const [copied, setCopied] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const { user } = useAuth();

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

  // Helper: Merge captions into flowing paragraphs (400-500 chars each)
  const createParagraphMode = (): string => {
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

  const fullTextWithTimestamps = transcript
    .map((t) => {
      const timestamp = new Date(t.offset * 1000).toISOString().substr(11, 8);
      return `${timestamp}  ${t.text}`;
    })
    .join("\n");

  const copyToClipboard = () => {
    const textToCopy = showTimestamps ? fullTextWithTimestamps : createParagraphMode();
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
    downloadFile(createParagraphMode(), "transcript.txt", "text/plain");
  };

  const downloadTxtWithTimestamps = () => {
    posthog.capture('export_clicked', { format: 'txt-timestamps' });
    downloadFile(fullTextWithTimestamps, "transcript_timestamps.txt", "text/plain");
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
        current = item.text;
      } else {
        current = current ? `${current} ${item.text}` : item.text;
      }
    }
    if (current) paragraphs.push(current.trim());
    const content = `# ${title}\n\n${paragraphs.join('\n\n')}`;
    downloadFile(content, "transcript.md", "text/markdown");
  };

  const downloadMarkdownWithTimestamps = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'md-timestamps' });
    const title = videoTitle || "YouTube Video";
    const sections = transcript
      .map((t) => `## [${formatHHMMSS(t.offset)}]\n${t.text}`)
      .join('\n\n');
    const content = `# ${title}\n\n${sections}`;
    downloadFile(content, "transcript_timestamps.md", "text/markdown");
  };

  const downloadJson = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'json' });
    const jsonOutput = {
      metadata: {
        video_title: videoTitle,
        video_url: videoUrl,
        extracted_at: new Date().toISOString(),
      },
      transcript,
    };
    downloadFile(JSON.stringify(jsonOutput, null, 2), "transcript.json", "application/json");
  };

  const downloadCsv = () => {
    if (!requireAuth()) return;
    posthog.capture('export_clicked', { format: 'csv' });
    const header = "Start,Duration,Text\n";
    const rows = transcript
      .map((t) => `${t.offset},${t.duration},"${t.text.replace(/"/g, '""')}"`)
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
        return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n`;
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
        return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n`;
      })
      .join("\n");
    downloadFile(vttContent, "transcript.vtt", "text/vtt");
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8 border shadow-sm">
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
              <DropdownMenuContent align="end" className="w-60">
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
                    <div className="text-xs text-muted-foreground">Raw data</div>
                  </div>
                </DropdownMenuItem>
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
        <div className="mx-6 mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <LogIn className="size-4 text-primary shrink-0" />
            <span className="text-foreground"><strong>Sign in for free</strong> to export as Markdown, CSV, SRT, VTT, or JSON.</span>
          </div>
          <a href="/login" className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Sign in
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
  );
}
