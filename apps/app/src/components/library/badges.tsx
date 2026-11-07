import { Pencil, Folder } from "lucide-react";
import { cn } from "@indxr/shared/lib/utils";
import type { Transcript } from "./TranscriptList";

/** Badge variant → stijl B classes (2026-11-07). The old hue families (sky/indigo/violet/teal)
 *  are replaced by four ink treatments that stay distinct without colour: captions = ink outline,
 *  AI = ink fill, summary = amber fill, RAG = dashed outline. The edited state keeps the pencil
 *  glyph (that is what makes it legible; the old tint difference was not). */
export const BADGE_CLASSES = {
  auto: "border border-fg-strong text-fg-strong",
  "auto-edit": "border border-fg-strong text-fg-strong",
  ai: "border border-fg-strong bg-fg-strong text-bg",
  "ai-edit": "border border-fg-strong bg-fg-strong text-bg",
  summary: "border border-fg-strong bg-accent text-fg-on-accent",
  "summary-edit": "border border-fg-strong bg-accent text-fg-on-accent",
  rag: "border border-dashed border-fg-strong text-fg-strong",
} as const;

export type BadgeVariant = keyof typeof BADGE_CLASSES;
export interface BadgeSpec {
  key: string;
  label: string;
  variant: BadgeVariant;
  pencil?: boolean;
  title: string;
}

/** Short mono pills — exactly one source (CC | AI), then optional SUM, then optional RAG. */
export function transcriptBadges(t: Transcript): BadgeSpec[] {
  const isAi = !!t.processing_method && t.processing_method !== "youtube_captions";
  const badges: BadgeSpec[] = [];

  if (isAi) {
    badges.push({
      key: "src",
      label: "AI",
      variant: t.has_edit ? "ai-edit" : "ai",
      pencil: t.has_edit,
      title: t.has_edit ? "AI transcription · edited" : "AI transcription",
    });
  } else {
    badges.push({
      key: "src",
      label: "CC",
      variant: t.has_edit ? "auto-edit" : "auto",
      pencil: t.has_edit,
      title: t.has_edit ? "YouTube captions · edited" : "YouTube captions",
    });
  }

  if (t.has_summary) {
    badges.push({
      key: "sum",
      label: "SUM",
      variant: t.has_summary_edit ? "summary-edit" : "summary",
      pencil: t.has_summary_edit,
      title: t.has_summary_edit ? "AI summary · edited" : "AI summary",
    });
  }

  if (t.has_rag) {
    badges.push({ key: "rag", label: "RAG", variant: "rag", title: "RAG export" });
  }

  return badges;
}

export function Badge({ label, variant, pencil, title }: BadgeSpec) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-px text-[10px] font-mono font-bold uppercase tracking-tight whitespace-nowrap",
        BADGE_CLASSES[variant],
      )}
    >
      {pencil && <Pencil className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

export function CollectionBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 border border-border-strong px-1.5 py-px text-[10px] font-medium text-fg whitespace-nowrap max-w-[10rem]">
      <Folder className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate" dir="auto">
        {name}
      </span>
    </span>
  );
}
