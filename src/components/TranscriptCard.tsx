"use client";

import { useState } from "react";
import { Copy, FileText, FileJson, FileType, Film, Video, Download, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const createParagraphMode = (): string => {
    // Join all captions into continuous prose
    const fullText = transcript.map((t) => t.text).join(' ');
    
    // Split into paragraphs of 400-500 characters
    const paragraphs: string[] = [];
    let currentParagraph = '';
    const words = fullText.split(' ');
    
    for (const word of words) {
      const testParagraph = currentParagraph ? `${currentParagraph} ${word}` : word;
      
      // Create new paragraph if we've reached 400-500 characters
      if (testParagraph.length >= 400 && testParagraph.length <= 500) {
        paragraphs.push(testParagraph);
        currentParagraph = '';
      } else if (testParagraph.length > 500) {
        // If we exceeded 500, save current and start new with this word
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
        }
        currentParagraph = word;
      } else {
        currentParagraph = testParagraph;
      }
    }
    
    // Add remaining text as final paragraph
    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }
    
    return paragraphs.join('\n\n');
  };

  const fullTextWithTimestamps = transcript
    .map((t) => {
      const timestamp = new Date(t.offset * 1000).toISOString().substr(11, 8);
      return `${timestamp}  ${t.text}`;
    })
    .join("\n");

  const getBrandingHeader = (format: 'txt' | 'csv' | 'srt_vtt') => {
    const title = videoTitle || "YouTube Video";
    const url = videoUrl || "";
    
    if (format === 'txt') {
      return `# INDXR.AI Free YouTube Transcript\n# ${title}\n# ${url}\n\n`;
    }
    if (format === 'csv') {
      return `# INDXR.AI - ${title}\n# ${url}\n`;
    }
    if (format === 'srt_vtt') {
      return `NOTE INDXR.AI - ${title}\nNOTE ${url}\n\n`;
    }
    return "";
  };

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

  const downloadTxt = () => {
    const content = showTimestamps ? fullTextWithTimestamps : createParagraphMode();
    const finalContent = getBrandingHeader('txt') + content;
    downloadFile(finalContent, "transcript.txt", "text/plain");
  };

  const downloadJson = () => {
    const jsonOutput = {
      metadata: {
        source: "INDXR.AI",
        video_title: videoTitle,
        video_url: videoUrl,
        extracted_at: new Date().toISOString(),
      },
      transcript: transcript
    };
    downloadFile(
      JSON.stringify(jsonOutput, null, 2),
      "transcript.json",
      "application/json"
    );
  };

  const downloadCsv = () => {
    const branding = getBrandingHeader('csv');
    const header = "Start,Duration,Text\n";
    const rows = transcript
      .map((t) => `${t.offset},${t.duration},"${t.text.replace(/"/g, '""')}"`)
      .join("\n");
    downloadFile(branding + header + rows, "transcript.csv", "text/csv");
  };

  const downloadSrt = () => {
    const branding = getBrandingHeader('srt_vtt');
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
    downloadFile(branding + srtContent, "transcript.srt", "text/plain");
  };

  const downloadVtt = () => {
    const branding = getBrandingHeader('srt_vtt');
    const vttContent = "WEBVTT\n\n" + branding + transcript
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Text Formats
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadTxt}>
                  <FileText className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">Plain Text</div>
                    <div className="text-xs text-muted-foreground">Simple .txt file</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 cursor-pointer" onClick={downloadCsv}>
                  <FileType className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">CSV</div>
                    <div className="text-xs text-muted-foreground">Spreadsheet compatible</div>
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
