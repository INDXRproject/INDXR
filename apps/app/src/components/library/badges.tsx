import { Pencil, Folder } from "lucide-react";
import { cn } from "@indxr/shared/lib/utils";
import type { Transcript } from "./TranscriptList";

/** Badge variant → OKLCH family classes (see tokens.css "Badge families").
 *  Hue = family, "-soft" = edited variant (same hue, higher L). The edited state
 *  carries BOTH the -soft tint AND a pencil glyph (the tint alone is not perceptible
 *  on an 18px pill; the pencil makes the difference legible). */
export const BADGE_CLASSES = {
  auto: "bg-sky-subtle text-sky",
  "auto-edit": "bg-sky-soft-subtle text-sky-soft",
  ai: "bg-indigo-subtle text-indigo",
  "ai-edit": "bg-indigo-soft-subtle text-indigo-soft",
  summary: "bg-violet-subtle text-violet",
  "summary-edit": "bg-violet-soft-subtle text-violet-soft",
  rag: "bg-teal-subtle text-teal",
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
        "inline-flex items-center gap-0.5 rounded-[3px] px-2 py-0.5 text-[10px] font-mono font-medium tracking-tight whitespace-nowrap",
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
    <span className="inline-flex items-center gap-1 rounded-[3px] border border-border px-2 py-0.5 text-[10px] font-medium text-fg-subtle whitespace-nowrap max-w-[10rem]">
      <Folder className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate" dir="auto">
        {name}
      </span>
    </span>
  );
}
