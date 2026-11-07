"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, FileAudio } from "lucide-react";
import { formatDetailDate } from "./TranscriptHeader";

// The source of a transcript, as a citation card (stijl B, 2026-11-07). "Sources done right": every
// transcript shows where it came from — channel, length, language, when you added it — and gives a
// ready citation to paste into notes or a paper. Desktop: a sticky card in the right column.
// Mobile (compact): one row under the title. Read-only; no data is written here.

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function languageName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" }).of(code);
    return name && name.toLowerCase() !== code.toLowerCase() ? name : null;
  } catch {
    return null;
  }
}

/** APA-7 style reference. The upload date of a YouTube video is not stored, so the date is "n.d." —
 *  correct APA for an undated source, and honest. */
export function buildCitation(p: { title: string; channel?: string | null; videoId?: string | null }): string {
  if (p.videoId) {
    const author = p.channel?.trim() || "Unknown channel";
    return `${author}. (n.d.). ${p.title} [Video]. YouTube. https://youtu.be/${p.videoId}`;
  }
  return `${p.title} [Audio recording]. (n.d.).`;
}

export interface SourceCardProps {
  title: string;
  channel?: string | null;
  videoId?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  characterCount?: number | null;
  language?: string | null;
  createdAt: string;
  collectionName?: string | null;
  isAi: boolean;
  compact?: boolean;
}

export function SourceCard(p: SourceCardProps) {
  const [copied, setCopied] = useState(false);
  const citation = buildCitation(p);
  const words = p.characterCount ? Math.round(p.characterCount / 5).toLocaleString("en") : null;
  const lang = languageName(p.language);
  const thumb = p.thumbnailUrl || (p.videoId ? `https://i.ytimg.com/vi/${p.videoId}/hqdefault.jpg` : null);
  const href = p.videoId ? `https://youtu.be/${p.videoId}` : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the citation text stays visible to select by hand */
    }
  };

  const rows: Array<[string, string]> = [
    ["Source", p.videoId ? "YouTube" : "Uploaded file"],
    ...(p.duration != null ? ([["Length", fmtDuration(p.duration)]] as Array<[string, string]>) : []),
    ...(words ? ([["Words", words]] as Array<[string, string]>) : []),
    ...(lang ? ([["Language", lang]] as Array<[string, string]>) : []),
    ["Transcript", p.isAi ? "AI transcription" : "YouTube captions"],
    ...(p.collectionName ? ([["Collection", p.collectionName]] as Array<[string, string]>) : []),
    ["Added", formatDetailDate(p.createdAt)],
  ];

  const CopyBtn = (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 w-full items-center justify-center gap-1.5 border-2 border-fg-strong bg-bg px-3 text-sm font-bold text-fg-strong transition-colors hover:bg-accent hover:text-fg-on-accent"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Citation copied" : "Copy citation"}
    </button>
  );

  if (p.compact) {
    // One row: thumbnail · channel + facts · a small Cite button. Kept to one line of height so it
    // doesn't push the transcript down on a phone.
    return (
      <div className="mb-6 flex items-center gap-3 border-2 border-fg-strong p-2.5">
        {thumb ? (
          <a href={href ?? undefined} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label="Open on YouTube">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" className="h-12 w-20 border-2 border-fg-strong object-cover" />
          </a>
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-fg-strong">
            <FileAudio className="h-5 w-5 text-fg-strong" />
          </span>
        )}
        <div className="min-w-0 flex-1 font-mono text-[11px] text-fg">
          <p className="truncate font-sans text-sm font-bold text-fg-strong" dir="auto">{p.channel || (p.videoId ? "YouTube" : "Uploaded file")}</p>
          <p className="mt-0.5 truncate">
            {[p.duration != null ? fmtDuration(p.duration) : null, words ? `${words} words` : null, lang, p.collectionName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy citation"
          title={citation}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 border-2 border-fg-strong px-2.5 text-xs font-bold text-fg-strong hover:bg-accent hover:text-fg-on-accent"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Cite"}
        </button>
      </div>
    );
  }

  return (
    <div className="border-2 border-fg-strong bg-bg">
      <p className="border-b-2 border-fg-strong bg-fg-strong px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-bg">Source</p>
      {thumb ? (
        <a href={href ?? undefined} target="_blank" rel="noopener noreferrer" className="group relative block border-b-2 border-fg-strong" aria-label="Open on YouTube">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="aspect-video w-full object-cover" />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 border-2 border-fg-strong bg-bg px-2 py-0.5 font-mono text-[11px] font-bold text-fg-strong group-hover:bg-accent group-hover:text-fg-on-accent">
            YouTube <ExternalLink className="h-3 w-3" />
          </span>
        </a>
      ) : (
        <div className="flex aspect-video items-center justify-center border-b-2 border-fg-strong bg-bg-subtle">
          <FileAudio className="h-10 w-10 text-fg-strong" />
        </div>
      )}
      <div className="px-4 pt-3">
        <p className="font-bold text-fg-strong" dir="auto">{p.channel || (p.videoId ? "YouTube" : "Your recording")}</p>
      </div>
      <dl className="px-4 py-3 font-mono text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2 py-1">
            <dt className="text-fg-muted">{k}</dt>
            <span aria-hidden="true" className="min-w-3 flex-1 border-b border-dotted border-fg-muted" />
            <dd className="max-w-[11rem] truncate text-right font-bold text-fg-strong" dir="auto">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t-2 border-fg-strong p-4">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">Cite</p>
        <p className="mb-3 select-all break-words text-xs leading-relaxed text-fg" dir="auto">{citation}</p>
        {CopyBtn}
      </div>
    </div>
  );
}
