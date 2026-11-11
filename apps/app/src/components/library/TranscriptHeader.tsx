"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { SpellingHintsBadge } from "@indxr/shared/components/transcribe/SpellingHintsField";
import { Badge, transcriptBadges } from "./badges";
import type { Transcript } from "./TranscriptList";

/** Detail-page date — Today / Yesterday / "28 Jul" (never "4h ago"; that's the list's style). */
export function formatDetailDate(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

interface TranscriptHeaderProps {
  id: string;
  title: string;
  collectionId: string | null;
  collectionName: string | null;
  processingMethod: string | null;
  hasEdit: boolean;
  hasSummary: boolean;
  hasSummaryEdit: boolean;
  hasRag: boolean;
  duration: number | null;
  characterCount: number | null;
  createdAt: string;
  /** Detected language code (ISO 639-1), or null when none is stored. */
  language: string | null;
  /** keyterms-ADR: how many spelling hints were used for this transcription, 0/undefined = none. */
  keytermsCount?: number;
}

/**
 * Page header for the transcript detail view: breadcrumb → title → badges (facts: SourceCard). Consistent
 * across every tab (it lives above the tabs). Title is editable inline; the badges, tokens and
 * date match the Library so the page reads as the same product.
 */
export function TranscriptHeader(props: TranscriptHeaderProps) {
  const supabase = createClient();
  const [title, setTitle] = useState(props.title);
  const [editing, setEditing] = useState(false);
  const saving = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setEditing(false);
    const name = title.trim();
    if (!name || name === props.title || saving.current) return;
    saving.current = true;
    await supabase.from("transcripts").update({ title: name }).eq("id", props.id);
    saving.current = false;
  };

  // Reuse the Library badge logic — pass a minimal row shape.
  const badgeRow = {
    processing_method: props.processingMethod,
    has_edit: props.hasEdit,
    has_summary: props.hasSummary,
    has_summary_edit: props.hasSummaryEdit,
    has_rag: props.hasRag,
  } as unknown as Transcript;
  const badges = transcriptBadges(badgeRow);

  return (
    <div className="mb-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-fg-muted mb-2">
        <Link
          href={props.collectionId ? `/dashboard/library?collection=${props.collectionId}` : "/dashboard/library"}
          className="inline-flex items-center gap-0.5 hover:text-fg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Library
        </Link>
        {props.collectionName && (
          <>
            <span className="text-fg-subtle">/</span>
            <span className="truncate max-w-[16rem]" dir="auto">{props.collectionName}</span>
          </>
        )}
      </div>

      {/* Title (editable) */}
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={title}
          dir="auto"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") { setTitle(props.title); setEditing(false); }
          }}
          className="w-full max-w-[34em] text-3xl sm:text-[2.5rem] font-bold tracking-[-0.03em] bg-transparent border-b-2 border-fg-strong outline-none text-fg-strong leading-[1.05]"
        />
      ) : (
        <h1
          onClick={() => setEditing(true)}
          title="Click to rename"
          dir="auto"
          className="max-w-[34em] text-3xl sm:text-[2.5rem] font-bold tracking-[-0.03em] text-fg-strong leading-[1.05] cursor-text hover:text-fg/80 transition-colors wrap-break-word"
        >
          {title}
        </h1>
      )}

      {/* Badges only — the facts (length, words, language, date, source) live in the SourceCard. */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {badges.map((b) => (
          <Badge key={b.key} label={b.label} variant={b.variant} pencil={b.pencil} title={b.title} />
        ))}
        <SpellingHintsBadge count={props.keytermsCount ?? 0} />
      </div>
    </div>
  );
}
