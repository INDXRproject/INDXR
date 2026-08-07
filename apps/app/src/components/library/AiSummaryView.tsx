"use client";

import React, { useRef, useState } from "react";
import { Sparkles, Copy, Check, Download, Play, ChevronUp, Clock } from "lucide-react";
import { Button } from "@indxr/shared/components/ui/button";
import { cn } from "@indxr/shared/lib/utils";
import { useRouter } from "next/navigation";
import { NocookieYouTubePlayer, YouTubePlayerHandle } from "./NocookieYouTubePlayer";

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
}

function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

export function AiSummaryView({ id, initialSummary, videoId, editedContentUpdatedAt = null }: AiSummaryViewProps) {
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

  const handleExportTxt = () => {
    const blob = new Blob([plainText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary_${id}.txt`;
    a.click();
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
            <Button variant="outline" size="sm" onClick={handleExportTxt} className="h-8 gap-2">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export .txt</span>
            </Button>
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

        {/* Overkoepelende samenvatting. */}
        {overview && (
          <div className="text-fg/90 leading-relaxed whitespace-pre-wrap">{overview}</div>
        )}

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
              <div className="text-fg/90 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
                {sec.content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
