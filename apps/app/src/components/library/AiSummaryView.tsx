"use client";

import React, { useRef, useState } from "react";
import { Sparkles, Copy, Check, Download, Play, ChevronUp, Clock, Pencil } from "lucide-react";
import { Button } from "@indxr/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@indxr/shared/components/ui/dropdown-menu";
import { generateSummaryMarkdown } from "@indxr/shared/utils/formatTranscript";
import { tiptapDocToText, tiptapDocToMarkdown, type TNode } from "@indxr/shared/utils/summaryDoc";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { useRouter } from "next/navigation";
import { NocookieYouTubePlayer, YouTubePlayerHandle } from "./NocookieYouTubePlayer";
import { SummaryMarkdown } from "./SummaryMarkdown";

// Samenvatting-schema (ADR-090): overkoepelende samenvatting + secties met kop, begin/eind-
// tijdstempel (seconden) en uitgewerkte notities. De bewerkte versie leeft APART in de kolom
// ai_summary_edited (zie EditableSummaryView) — niet meer inline in dit object.
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
  /** Er bestaat een bewerkte versie (ai_summary_edited) → toon de "Edited version"-exportgroep. */
  hasSummaryEdit?: boolean;
  /** Opnieuw genereren — opent de kostenkaart-bevestiging op de Summary-tab (SummaryTab bezit het pad). */
  onRegenerate?: () => void;
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
  hasSummaryEdit = false,
  onRegenerate,
}: AiSummaryViewProps) {
  const router = useRouter();
  const supabase = createClient();
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

  // Markdown-export van de GEGENEREERDE samenvatting: front matter in dezelfde stijl als de transcript-
  // export, dan overview + hoofdstukken met klikbare tijdstempels. Eén artefact = twee formaten (md/txt);
  // het transcript heeft zijn eigen exports.
  const handleExportMarkdown = () => {
    const md = generateSummaryMarkdown(
      { overview, sections },
      title || "YouTube Video",
      { videoId, channel, language, durationSeconds, extractionMethod, includeYamlFrontmatter: true },
    );
    download(md, `summary_${id}.md`, "text/markdown");
  };

  // "Edited version"-exports — spiegelt de transcript-regel: de bewerkte versie is een APARTE, gelabelde
  // exportgroep (de gegenereerde export blijft de gegenereerde versie). Haalt de laatst opgeslagen
  // ai_summary_edited (Tiptap-JSON) uit de DB en serialiseert 'm, net als handleDownloadEditedTxt/Md
  // van het transcript.
  const fetchEdited = async (): Promise<TNode | null> => {
    const { data, error } = await supabase.from("transcripts").select("ai_summary_edited").eq("id", id).single();
    if (error || !data?.ai_summary_edited) return null;
    return data.ai_summary_edited as unknown as TNode;
  };
  const handleExportEditedTxt = async () => {
    const doc = await fetchEdited();
    if (doc) download(tiptapDocToText(doc), `summary_${id}_edited.txt`, "text/plain");
  };
  const handleExportEditedMd = async () => {
    const doc = await fetchEdited();
    if (doc) download(`# ${title || "YouTube Video"}\n\n${tiptapDocToMarkdown(doc)}`, `summary_${id}_edited.md`, "text/markdown");
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
                {/* Edited version — a separate labelled group, only when an edit exists (same as the
                    transcript's export menu). The generated exports below are unaffected. */}
                {hasSummaryEdit && (
                  <>
                    <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Edited version</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleExportEditedTxt}>Edited — plain text (.txt)</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportEditedMd}>Edited — Markdown (.md)</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Generated</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportMarkdown}>Markdown (.md)</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportTxt}>Plain text (.txt)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Regenerate — opens the cost-card confirm owned by SummaryTab. Replaces the generated
                version; the edited version is kept and marked outdated. */}
            {onRegenerate && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onRegenerate} title="Regenerate summary">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Regenerate</span>
              </Button>
            )}

            {/* Edit routes to the Edited-summary tab (seeded from the generated version) — never edits
                the generated summary in place. Mirrors the transcript's Edit button. */}
            <Button size="sm" className="h-8 gap-1.5 px-3" onClick={() => router.push(`/dashboard/library/${id}?tab=summary_edited`)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </div>

        {/* Stale notice — de samenvatting dateert van vóór de laatste transcript-edit (ADR-085). */}
        {isStale && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
            <span className="flex-1">This summary was written before you last edited the transcript.</span>
            <button
              onClick={() => (onRegenerate ? onRegenerate() : router.replace(`/dashboard/library/${id}?tab=original`))}
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
