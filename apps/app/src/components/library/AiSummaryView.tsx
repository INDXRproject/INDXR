"use client";

import React, { useRef, useState } from "react";
import { Sparkles, Copy, Check, Download, Play, ChevronUp, Clock } from "lucide-react";
import { Button } from "@indxr/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@indxr/shared/components/ui/dropdown-menu";
import { generateSummaryMarkdown, type TranscriptItem } from "@indxr/shared/utils/formatTranscript";
import { useRouter } from "next/navigation";
import { NocookieYouTubePlayer, YouTubePlayerHandle } from "./NocookieYouTubePlayer";
import { SummaryMarkdown } from "./SummaryMarkdown";

// Nieuw samenvatting-schema (ADR-090): overkoepelende samenvatting + secties met kop, begin/eind-
// tijdstempel (seconden) en uitgewerkte notities. Vervangt het oude {text, action_points, edited_html}.
interface SummarySection {
  heading: string;
  start_time: number;
  end_time: number;
  content: string;
}
interface AiSummaryViewProps {
  id: string;
  initialSummary: {
    schema_version?: number;
    overview: string;
    sections: SummarySection[];
    generated_at: string;
    edited?: boolean;
  };
  /** YouTube video-id — nodig voor de in-app speler + klikbare tijdstempels (seek). */
  videoId?: string;
  /** Wanneer edited_content voor het laatst geschreven werd — summary is stale als hij ouder is (ADR-085). */
  editedContentUpdatedAt?: string | null;
  /** Metadata voor de Markdown-export-front-matter (zelfde stijl als de transcript-export). */
  title?: string;
  channel?: string;
  language?: string;
  durationSeconds?: number;
  /** processing_method van het transcript → transcript_source in de front matter. */
  extractionMethod?: string;
  /** Het volledige transcript — voor de optie "Markdown + transcript" (transcript onder de samenvatting). */
  transcript?: TranscriptItem[];
  speakerNames?: Record<string, string> | null;
}

function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

export function AiSummaryView({
  id,
  initialSummary,
  videoId,
  editedContentUpdatedAt = null,
  title,
  channel,
  language,
  durationSeconds,
  extractionMethod,
  transcript,
  speakerNames,
}: AiSummaryViewProps) {
  const router = useRouter();
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [copied, setCopied] = useState(false);

  const overview = (initialSummary.overview || "").trim();
  const sections = Array.isArray(initialSummary.sections) ? initialSummary.sections : [];

  const plainText = () => {
    const parts: string[] = [];
    if (overview) parts.push(overview);
    for (const sec of sections) {
      parts.push(`\n[${formatTimestamp(sec.start_time)}] ${sec.heading}\n${sec.content || ""}`);
    }
    return parts.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(plainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
    download(plainText(), `summary_${id}.txt`, "text/plain");
  };

  // Markdown-export van de samenvatting: front matter in dezelfde stijl als de transcript-export, dan
  // overview + hoofdstukken met klikbare tijdstempels. `withTranscript` voegt het volledige transcript
  // onder de samenvatting toe in hetzelfde bestand (niet standaard).
  const handleExportMarkdown = (withTranscript: boolean) => {
    const md = generateSummaryMarkdown(
      { overview, sections },
      title || "YouTube Video",
      {
        videoId,
        channel,
        language,
        durationSeconds,
        extractionMethod,
        includeYamlFrontmatter: true,
        includeTranscript: withTranscript,
        transcript: transcript ?? undefined,
        speakerNames: speakerNames ?? undefined,
      },
    );
    download(md, `summary_${id}.md`, "text/markdown");
  };

  // Klik op een sectie-tijdstempel → speler openen (privacy: geen cookie tot playback) + seeken.
  // Hergebruikt exact de bestaande seek-functie van de transcript-tijdstempels (NocookieYouTubePlayer).
  const seekTo = (seconds: number) => {
    if (!videoId) return;
    setShowVideo(true);
    playerRef.current?.seekTo(seconds);
  };

  const isStale =
    initialSummary.generated_at &&
    editedContentUpdatedAt &&
    new Date(initialSummary.generated_at) < new Date(editedContentUpdatedAt);

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12 w-full" id="ai-summary">
      <div className="rounded-xl border border-border bg-surface p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-xl font-bold text-fg">
            <Sparkles className="h-6 w-6 text-amber-500" />
            AI Summary
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
              {copied ? <Check className="mr-2 h-3.5 w-3.5 text-success" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleExportMarkdown(false)}>
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportMarkdown(true)}
                  disabled={!transcript || transcript.length === 0}
                >
                  Markdown + transcript (.md)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportTxt}>Plain text (.txt)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stale notice — de samenvatting dateert van vóór de laatste transcript-edit (ADR-085). */}
        {isStale && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
            <span className="flex-1">This summary was written before you last edited the transcript.</span>
            <button
              onClick={() => router.replace(`/dashboard/library/${id}?tab=original`)}
              className="font-medium underline hover:no-underline shrink-0 cursor-pointer"
            >
              Regenerate
            </button>
          </div>
        )}

        {/* In-app video — verschijnt bij de eerste tijdstempel-klik, sticky onder de tabs. */}
        {videoId && showVideo && (
          <div className="sticky top-12 z-[9] space-y-1.5">
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-elevated">
              <NocookieYouTubePlayer ref={playerRef} videoId={videoId} className="h-full w-full" />
            </div>
            <button onClick={() => setShowVideo(false)} className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
              <ChevronUp className="h-3.5 w-3.5" /> Hide video
            </button>
          </div>
        )}

        {/* Overkoepelende samenvatting (markdown, veilig gerenderd). */}
        {overview && <SummaryMarkdown>{overview}</SummaryMarkdown>}

        {/* Secties op volgorde: kop + klikbaar tijdstempel + uitgewerkte notities. */}
        <div className="space-y-8">
          {sections.map((sec, i) => (
            <section key={i} className="space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-fg">{sec.heading}</h3>
                {videoId ? (
                  <button
                    onClick={() => seekTo(sec.start_time)}
                    className="inline-flex items-center gap-1 font-mono text-xs text-amber-600 hover:text-amber-500 hover:underline tabular-nums cursor-pointer"
                    title="Jump to this point in the video"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    {formatTimestamp(sec.start_time)}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-fg-subtle tabular-nums">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(sec.start_time)}
                  </span>
                )}
              </div>
              <SummaryMarkdown>{sec.content}</SummaryMarkdown>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
