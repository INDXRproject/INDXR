"use client";

import { useRef, useState, useOptimistic, startTransition } from "react";
import Link from "next/link";
import {
  Trash2,
  ExternalLink,
  Loader2,
  Download,
  AlertCircle,
  X,
  CheckCheck,
  MoreHorizontal,
  Check,
  Minus,
  FolderInput,
  Pencil,
  Play,
  Eye,
  Copy,
} from "lucide-react";
import { Button } from "@indxr/shared/components/ui/button";
import { Checkbox } from "@indxr/shared/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@indxr/shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@indxr/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@indxr/shared/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@indxr/shared/components/ui/sheet";
import { HexagonEmptyState } from "@indxr/shared/components/icons/HexagonEmptyState";
import { createClient } from "@indxr/shared/utils/supabase/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generateTxt, generateCsv, generateSrt, generateVtt, generateMarkdown, buildRagJson } from "@indxr/shared/utils/formatTranscript";
import { bulkDeductRagExportCreditsAction } from "@indxr/shared/actions/rag-export";
import { useAuth } from "@indxr/shared/hooks/useAuth";
import { cn } from "@indxr/shared/lib/utils";
import { Badge, CollectionBadge, transcriptBadges } from "./badges";
import { MoveToCollectionMenu } from "./MoveToCollectionMenu";
import type { Density, Collection } from "./LibraryControls";

// ── The list row shape — the `transcripts_list` view (light columns + has_* booleans).
export interface Transcript {
  id: string;
  title: string | null;
  video_id: string;
  created_at: string;
  duration: number | null;
  character_count: number | null;
  processing_method: string | null;
  collection_id: string | null;
  viewed_at: string | null;
  channel: string | null;
  has_summary: boolean;
  has_summary_edit: boolean;
  has_edit: boolean;
  has_rag: boolean;
}

// ── Formatting helpers ───────────────────────────────────────────────────────
function formatDateHybrid(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "1d ago";
  const sameYear = date.getFullYear() === now.getFullYear();
  const datePart = date.toLocaleDateString("en-US", sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
  return datePart;
}

// >1h → H:MM:SS (unambiguous); otherwise M:SS.
function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatWordCount(characterCount?: number | null) {
  if (!characterCount) return null;
  return `${Math.round(characterCount / 5).toLocaleString()} words`;
}

const slugify = (s: string) =>
  (s || "video").toLowerCase().replace(/['’‘"“”`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ── Export formats (the real 9: 8 file formats + RAG handled separately) ──────
type BatchFormat = "txt" | "txt-ts" | "md" | "md-ts" | "json" | "csv" | "srt" | "vtt";
const FORMAT_GROUPS: { group: string; items: { id: BatchFormat; label: string }[] }[] = [
  { group: "Text", items: [
    { id: "txt", label: "Plain text (.txt)" },
    { id: "txt-ts", label: "Text + timestamps (.txt)" },
    { id: "md", label: "Markdown (.md)" },
    { id: "md-ts", label: "Markdown + timestamps (.md)" },
  ] },
  { group: "Data", items: [
    { id: "json", label: "JSON (.json)" },
    { id: "csv", label: "CSV (.csv)" },
  ] },
  { group: "Subtitles", items: [
    { id: "srt", label: "SRT (.srt)" },
    { id: "vtt", label: "VTT (.vtt)" },
  ] },
];

interface TranscriptListProps {
  transcripts: Transcript[];
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onMove: (ids: string[], collectionId: string | null) => void;
  density: Density;
  collections: Collection[];
  narrowed: boolean;
  onClearFilters: () => void;
}

export function TranscriptList({
  transcripts,
  onDelete,
  onRename,
  onMove,
  density,
  collections,
  narrowed,
  onClearFilters,
}: TranscriptListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false); // mobile
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [optimisticReadIds, addOptimisticRead] = useOptimistic(readIds, (prev, id: string) => new Set(prev).add(id));
  const editTitleRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { credits, refreshCredits } = useAuth();

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadWarning, setDownloadWarning] = useState<string | null>(null);

  // Mobile per-row action sheet.
  const [rowSheet, setRowSheet] = useState<Transcript | null>(null);
  const [showBulkSheet, setShowBulkSheet] = useState(false);

  // ── RAG export (single or bulk) ────────────────────────────────────────────
  type RagBulkItem = { id: string; title: string; duration: number; alreadyExported: boolean; cost: number };
  const [ragTargetIds, setRagTargetIds] = useState<string[]>([]);
  const [ragBulkItems, setRagBulkItems] = useState<RagBulkItem[] | null>(null);
  const [showRagModal, setShowRagModal] = useState(false);
  const [ragBulkLoading, setRagBulkLoading] = useState(false);
  const [ragBulkExecuting, setRagBulkExecuting] = useState(false);
  const [ragBulkError, setRagBulkError] = useState<string | null>(null);
  const [ragBulkSuccess, setRagBulkSuccess] = useState(false);
  const [ragChunkSize, setRagChunkSize] = useState<number>(60);

  // ── Delete confirmation ────────────────────────────────────────────────────
  type DeleteTarget = { type: "single"; id: string; title: string } | { type: "bulk"; count: number };
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const collectionName = (id: string | null | undefined) =>
    id ? collections.find((c) => c.id === id)?.name : undefined;

  const isNew = (t: Transcript) => !t.viewed_at && !optimisticReadIds.has(t.id);
  const titleOf = (t: Transcript) => t.title || `Video ${t.video_id}`;

  const selectedTargets = transcripts
    .filter((t) => selectedIds.has(t.id))
    .map((t) => ({ id: t.id, collection_id: t.collection_id }));
  const selectedUnreadIds = transcripts.filter((t) => selectedIds.has(t.id) && isNew(t)).map((t) => t.id);

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allSelected = transcripts.length > 0 && selectedIds.size === transcripts.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(transcripts.map((t) => t.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // ── Mark as read (optimistic; single + bulk) ───────────────────────────────
  const markRead = (ids: string[]) => {
    if (ids.length === 0) return;
    startTransition(async () => {
      ids.forEach((id) => addOptimisticRead(id));
      const { error } = await supabase.from("transcripts").update({ viewed_at: new Date().toISOString() }).in("id", ids);
      if (error) {
        console.error("Mark as read failed:", error);
        return;
      }
      setReadIds((prev) => {
        const s = new Set(prev);
        ids.forEach((id) => s.add(id));
        return s;
      });
    });
  };

  // ── Inline rename ──────────────────────────────────────────────────────────
  const startRename = (t: Transcript) => {
    setEditingId(t.id);
    setEditingTitle(titleOf(t));
    setTimeout(() => editTitleRef.current?.focus(), 0);
  };
  const saveRename = (id: string) => {
    const name = editingTitle.trim();
    setEditingId(null);
    if (!name) return;
    const original = transcripts.find((t) => t.id === id)?.title ?? "";
    if (name === original) return;
    onRename?.(id, name);
  };

  // ── Drag to sidebar collections ────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("transcriptId", id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    if (editingId) setEditingId(null);
  };

  // ── Create collection (for the move menu) ──────────────────────────────────
  const createCollection = async (name: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from("collections").insert({ name, user_id: user.id }).select("id").single();
    if (error || !data) return null;
    window.dispatchEvent(new CustomEvent("transcripts-updated"));
    return data.id as string;
  };

  // ── Download (single file when one id, ZIP when many) ──────────────────────
  const handleDownload = async (ids: string[], format: BatchFormat) => {
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadWarning(null);
    try {
      const { data, error } = await supabase
        .from("transcripts")
        .select("id, title, video_id, processing_method, transcript")
        .in("id", ids);
      if (error || !data) throw new Error("Failed to fetch transcript data");

      const tsSuffix = format === "txt-ts" || format === "md-ts" ? "_timestamps" : "";
      const formatType = format === "txt-ts" ? "txt" : format === "md-ts" ? "md" : format;

      const build = (item: Record<string, unknown>): { content: string; ext: string } => {
        const tx = item.transcript as Parameters<typeof generateTxt>[0];
        const videoId = (item.video_id as string) || "unknown";
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        if (format === "txt" || format === "txt-ts") return { content: generateTxt(tx, format === "txt-ts"), ext: "txt" };
        if (format === "md" || format === "md-ts") return { content: generateMarkdown(tx, item.title as string, format === "md-ts"), ext: "md" };
        if (format === "json") return { content: JSON.stringify({ metadata: { title: item.title, videoUrl }, transcript: tx }, null, 2), ext: "json" };
        if (format === "csv") return { content: generateCsv(tx), ext: "csv" };
        if (format === "srt") return { content: generateSrt(tx, { extractionMethod: (item.processing_method as string) ?? undefined }), ext: "srt" };
        return { content: generateVtt(tx, { title: item.title as string, extractionMethod: (item.processing_method as string) ?? undefined }), ext: "vtt" };
      };

      if (data.length === 1) {
        const item = data[0] as Record<string, unknown>;
        const { content, ext } = build(item);
        const slug = slugify(item.title as string);
        saveAs(new Blob([content], { type: "text/plain;charset=utf-8" }), `${slug}_${formatType}${tsSuffix}.${ext}`);
      } else {
        const zip = new JSZip();
        const usedNames = new Set<string>();
        data.forEach((item: Record<string, unknown>) => {
          const { content, ext } = build(item);
          const slug = slugify(item.title as string);
          const base = `${slug}_${formatType}${tsSuffix}`;
          let filename = `${base}.${ext}`;
          let counter = 2;
          while (usedNames.has(filename)) filename = `${base}_${counter++}.${ext}`;
          usedNames.add(filename);
          zip.file(filename, content);
        });
        if (Object.keys(zip.files).length !== ids.length) {
          setDownloadWarning(`Exported ${Object.keys(zip.files).length} of ${ids.length} files — some may have been skipped.`);
        }
        const content = await zip.generateAsync({ type: "blob" });
        const now = new Date();
        saveAs(content, `indxr-${ids.length}-transcripts-${format}-${now.toISOString().slice(0, 10)}.zip`);
      }
      if (ids.length > 1) clearSelection();
    } catch (e) {
      console.error(e);
      setDownloadError("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const copyPlainText = async (id: string) => {
    try {
      const { data } = await supabase.from("transcripts").select("transcript").eq("id", id).single();
      if (!data) return;
      const text = generateTxt(data.transcript as Parameters<typeof generateTxt>[0], false);
      await navigator.clipboard.writeText(text);
    } catch {
      setDownloadError("Copy failed. Please try again.");
    }
  };

  // ── RAG export ─────────────────────────────────────────────────────────────
  const openRag = async (ids: string[]) => {
    setRagTargetIds(ids);
    setRagBulkLoading(true);
    setRagBulkError(null);
    setRagBulkSuccess(false);
    setShowRagModal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("rag_chunk_size").eq("id", user.id).single();
        setRagChunkSize((profile as { rag_chunk_size?: number } | null)?.rag_chunk_size ?? 60);
      }
      const { data, error } = await supabase.from("transcripts").select("id, title, duration, rag_exports").in("id", ids);
      if (error || !data) throw new Error("load failed");
      setRagBulkItems(
        data.map((t: Record<string, unknown>) => {
          const already = (((t.rag_exports as unknown[]) ?? []).length) > 0;
          const duration = (t.duration as number) ?? 0;
          return {
            id: t.id as string,
            title: (t.title as string) || `Video ${t.id}`,
            duration,
            alreadyExported: already,
            cost: already ? 0 : Math.max(1, Math.ceil(duration / 600)),
          };
        }),
      );
    } catch {
      setRagBulkError("Failed to load transcript data. Please try again.");
    } finally {
      setRagBulkLoading(false);
    }
  };

  const executeRag = async () => {
    if (!ragBulkItems) return;
    setRagBulkExecuting(true);
    setRagBulkError(null);
    try {
      const newExports = ragBulkItems.filter((i) => !i.alreadyExported);
      if (newExports.length > 0) {
        const result = await bulkDeductRagExportCreditsAction(
          newExports.map((i) => ({ transcriptId: i.id, durationSeconds: i.duration, chunkSize: ragChunkSize })),
        );
        if (!result.success) {
          setRagBulkError(result.error ?? "Insufficient credits");
          return;
        }
        await refreshCredits();
      }

      const { data, error } = await supabase.from("transcripts").select("id, title, video_id, transcript").in("id", ragTargetIds);
      if (error || !data) throw new Error("fetch failed");

      if (data.length === 1) {
        const item = data[0] as Record<string, unknown>;
        const json = buildRagJson(item.transcript as Parameters<typeof buildRagJson>[0], {
          videoId: (item.video_id as string) || "unknown",
          title: item.title as string,
          chunkSize: ragChunkSize,
        });
        saveAs(new Blob([json], { type: "application/json" }), `${slugify(item.title as string)}_rag_${ragChunkSize}s.json`);
      } else {
        const zip = new JSZip();
        const usedNames = new Set<string>();
        data.forEach((item: Record<string, unknown>) => {
          const base = `${slugify(item.title as string)}_rag_${ragChunkSize}s`;
          let filename = `${base}.json`;
          let counter = 2;
          while (usedNames.has(filename)) filename = `${base}_${counter++}.json`;
          usedNames.add(filename);
          zip.file(filename, buildRagJson(item.transcript as Parameters<typeof buildRagJson>[0], {
            videoId: (item.video_id as string) || "unknown",
            title: item.title as string,
            chunkSize: ragChunkSize,
          }));
        });
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `indxr-${ragTargetIds.length}-transcripts-rag-${new Date().toISOString().slice(0, 10)}.zip`);
        clearSelection();
      }
      setRagBulkSuccess(true);
    } catch {
      setRagBulkError("Export failed. Please try again.");
    } finally {
      setRagBulkExecuting(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "single") onDelete(deleteTarget.id);
    else {
      selectedIds.forEach((id) => onDelete(id));
      clearSelection();
    }
    setDeleteTarget(null);
  };

  // ── Empty states ───────────────────────────────────────────────────────────
  if (transcripts.length === 0) {
    if (narrowed) {
      return (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <div className="flex flex-col items-center">
            <HexagonEmptyState className="mb-4" />
            <h3 className="text-lg font-medium text-fg">No transcripts match</h3>
            <p className="text-sm text-fg-muted mt-2 max-w-xs">Try a different search, or clear your filters.</p>
            <Button variant="outline" className="mt-6" onClick={onClearFilters}>
              Clear all filters
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-dashed border-border py-20 text-center">
        <div className="flex flex-col items-center">
          <HexagonEmptyState className="mb-4" />
          <h3 className="text-lg font-medium text-fg">Library is empty</h3>
          <p className="text-sm text-fg-muted mt-2 max-w-xs">Transcripts you extract will appear here.</p>
          <Link href="/dashboard/transcribe">
            <Button className="mt-6">Transcribe a video</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Reusable export dropdown content (row = single id, bulk = many ids).
  const exportMenuContent = (ids: string[], rowRag?: boolean) => (
    <DropdownMenuSubContent className="w-56">
      {FORMAT_GROUPS.map((g) => (
        <div key={g.group}>
          <DropdownMenuLabel className="text-xs text-fg-muted font-normal">{g.group}</DropdownMenuLabel>
          {g.items.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => handleDownload(ids, f.id)}>
              {f.label}
            </DropdownMenuItem>
          ))}
        </div>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Developer</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => openRag(ids)}>
        RAG JSON
        {rowRag ? (
          <span className="ml-auto text-[9px] font-bold rounded-full bg-teal-subtle text-teal px-1.5 py-0.5">PURCHASED</span>
        ) : (
          <span className="ml-auto text-[9px] font-bold rounded-full bg-warning-subtle text-warning px-1.5 py-0.5">PAID</span>
        )}
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  );

  const rowMenu = (t: Transcript) => (
    <DropdownMenuContent align="end" className="w-52">
      <DropdownMenuItem asChild>
        <Link href={`/dashboard/library/${t.id}`}>
          <Eye className="mr-2 h-4 w-4" /> Open transcript
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href={`https://youtu.be/${t.video_id}`} target="_blank" rel="noopener noreferrer">
          <Play className="mr-2 h-4 w-4" /> Watch on YouTube
        </a>
      </DropdownMenuItem>
      {isNew(t) && (
        <DropdownMenuItem onClick={() => markRead([t.id])}>
          <CheckCheck className="mr-2 h-4 w-4" /> Mark as read
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Download className="mr-2 h-4 w-4" /> Export
        </DropdownMenuSubTrigger>
        {exportMenuContent([t.id], t.has_rag)}
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <FolderInput className="mr-2 h-4 w-4" /> Move to collection
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="p-2">
          <MoveToCollectionMenu
            targets={[{ id: t.id, collection_id: t.collection_id }]}
            collections={collections}
            onMove={onMove}
            onCreateCollection={createCollection}
            onDone={() => {}}
          />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem onClick={() => startRename(t)}>
        <Pencil className="mr-2 h-4 w-4" /> Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => copyPlainText(t.id)}>
        <Copy className="mr-2 h-4 w-4" /> Copy plain text
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-error focus:text-error focus:bg-error/10"
        onClick={() => setDeleteTarget({ type: "single", id: t.id, title: titleOf(t) })}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const compact = density === "compact";

  return (
    <>
      {/* Download feedback */}
      {downloadError && (
        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error mb-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">{downloadError}</span>
          <button onClick={() => setDownloadError(null)} className="opacity-60 hover:opacity-100 shrink-0 cursor-pointer">✕</button>
        </div>
      )}
      {downloadWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning mb-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">{downloadWarning}</span>
          <button onClick={() => setDownloadWarning(null)} className="opacity-60 hover:opacity-100 shrink-0 cursor-pointer">✕</button>
        </div>
      )}

      {/* Mobile select bar */}
      <div className="sm:hidden mb-2 flex items-center justify-between">
        {selectionMode ? (
          <>
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-fg">
              <TriBox checked={allSelected} indeterminate={someSelected} />
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </button>
            <button
              onClick={() => { setSelectionMode(false); clearSelection(); }}
              className="text-sm text-fg-muted hover:text-fg"
            >
              Done
            </button>
          </>
        ) : (
          <button onClick={() => setSelectionMode(true)} className="ml-auto text-sm text-fg-muted hover:text-fg">
            Select
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {/* Header row (desktop) */}
        <div className="hidden sm:flex items-center gap-3 border-b border-border-subtle bg-surface-elevated/50 px-4 py-2.5 text-xs font-medium text-fg-muted">
          <button onClick={toggleSelectAll} aria-label="Select all on page">
            <TriBox checked={allSelected} indeterminate={someSelected} />
          </button>
          <span className="flex-1">Title</span>
          <div className="flex items-center gap-4 shrink-0">
            <span className="w-16 text-right">Duration</span>
            <span className="w-24 text-right">Words</span>
            <span className="w-24 text-right">Added</span>
          </div>
          <span className="w-16 shrink-0" aria-hidden />
        </div>

        <div className="divide-y divide-border-subtle">
          {transcripts.map((t) => {
            const badges = transcriptBadges(t);
            const colName = collectionName(t.collection_id);
            const words = formatWordCount(t.character_count);
            const unread = isNew(t);
            const showMobileCheckbox = selectionMode;
            return (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => handleDragStart(e, t.id)}
                className={cn(
                  "group flex items-center gap-3 px-4 transition-colors cursor-grab active:cursor-grabbing hover:bg-surface-elevated/40",
                  compact ? "py-2" : "py-3",
                  selectedIds.has(t.id) && "bg-surface-elevated/50",
                )}
              >
                {/* Checkbox — desktop hover/selected; mobile only in selection mode */}
                <div
                  className={cn(
                    "shrink-0 transition-opacity",
                    showMobileCheckbox ? "block" : "hidden sm:block",
                    selectedIds.has(t.id) ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                  )}
                >
                  <Checkbox
                    className="data-[state=unchecked]:border-border-strong data-[state=unchecked]:bg-surface-sunken"
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => toggleSelect(t.id)}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className={cn("flex items-center gap-1.5", compact && "flex-wrap")}>
                    {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-label="Unread" />}
                    {editingId === t.id ? (
                      <input
                        ref={editTitleRef}
                        value={editingTitle}
                        dir="auto"
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveRename(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full bg-transparent border-b border-border font-medium text-fg text-[15px] leading-snug outline-none py-0.5"
                      />
                    ) : (
                      <Link
                        href={`/dashboard/library/${t.id}`}
                        dir="auto"
                        title={titleOf(t)}
                        className={cn(
                          "text-fg text-[15px] leading-snug truncate hover:text-accent transition-colors",
                          unread ? "font-medium" : "font-normal",
                          compact ? "max-w-full" : "",
                        )}
                      >
                        {titleOf(t)}
                      </Link>
                    )}
                    {/* Compact: badges inline after title */}
                    {compact && (
                      <span className="flex items-center gap-1 shrink-0">
                        {badges.map((b) => <Badge key={b.key} label={b.label} variant={b.variant} pencil={b.pencil} title={b.title} />)}
                      </span>
                    )}
                  </div>

                  {/* Default: badges + collection on line 2 */}
                  {!compact && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {badges.map((b) => <Badge key={b.key} label={b.label} variant={b.variant} pencil={b.pencil} title={b.title} />)}
                      {colName && <CollectionBadge name={colName} />}
                    </div>
                  )}

                  {/* Mobile metadata */}
                  <div className="mt-1.5 sm:hidden text-[11px] text-fg-muted tabular-nums">
                    {t.duration ? formatDuration(t.duration) : "—"}
                    {words && <> · {words}</>}
                    {" · "}
                    {formatDateHybrid(t.created_at)}
                  </div>
                </div>

                {/* Desktop metadata columns */}
                <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-fg-muted tabular-nums">
                  <span className="w-16 text-right">{t.duration ? formatDuration(t.duration) : "—"}</span>
                  <span className="w-24 text-right">{words ?? "—"}</span>
                  <span className="w-24 text-right whitespace-nowrap">{formatDateHybrid(t.created_at)}</span>
                </div>

                {/* Desktop actions: export + ⋯ */}
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-16 justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:bg-accent hover:text-fg-on-accent" aria-label="Export">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {FORMAT_GROUPS.map((g) => (
                        <div key={g.group}>
                          <DropdownMenuLabel className="text-xs text-fg-muted font-normal">{g.group}</DropdownMenuLabel>
                          {g.items.map((f) => (
                            <DropdownMenuItem key={f.id} onClick={() => handleDownload([t.id], f.id)}>{f.label}</DropdownMenuItem>
                          ))}
                        </div>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Developer</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openRag([t.id])}>
                        RAG JSON
                        {t.has_rag ? (
                          <span className="ml-auto text-[9px] font-bold rounded-full bg-teal-subtle text-teal px-1.5 py-0.5">PURCHASED</span>
                        ) : (
                          <span className="ml-auto text-[9px] font-bold rounded-full bg-warning-subtle text-warning px-1.5 py-0.5">PAID</span>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:bg-accent hover:text-fg-on-accent" aria-label="More actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    {rowMenu(t)}
                  </DropdownMenu>
                </div>

                {/* Mobile ⋯ */}
                <button
                  className="sm:hidden shrink-0 h-8 w-8 flex items-center justify-center text-fg-muted"
                  onClick={() => setRowSheet(t)}
                  aria-label="Row actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating bulk bar (desktop + mobile-selection) */}
      {selectedIds.size > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 bottom-[calc(3.5rem+1rem+env(safe-area-inset-bottom,0px))] md:bottom-6 animate-in slide-in-from-bottom-5 fade-in">
          <div className="bg-surface border border-border shadow-xl rounded-full px-4 md:px-6 py-3 flex items-center gap-2 md:gap-4 max-w-[calc(100vw-1.5rem)]">
            <span className="text-sm font-medium text-fg whitespace-nowrap shrink-0">{selectedIds.size} selected</span>
            <div className="h-6 w-px bg-border/50 shrink-0" />

            {/* Move (desktop dropdown; mobile opens sheet via More) */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" className="shrink-0">
                    <FolderInput className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Move</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="p-2">
                  <MoveToCollectionMenu
                    targets={selectedTargets}
                    collections={collections}
                    onMove={onMove}
                    onCreateCollection={createCollection}
                    onDone={() => {}}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" disabled={isDownloading} aria-label="Export" className="shrink-0">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <Download className="h-4 w-4 md:mr-2" />}
                  <span className="hidden md:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {FORMAT_GROUPS.map((g) => (
                  <div key={g.group}>
                    <DropdownMenuLabel className="text-xs text-fg-muted font-normal">{g.group}</DropdownMenuLabel>
                    {g.items.map((f) => (
                      <DropdownMenuItem key={f.id} onClick={() => handleDownload(Array.from(selectedIds), f.id)}>{f.label} (.zip)</DropdownMenuItem>
                    ))}
                  </div>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Developer</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openRag(Array.from(selectedIds))}>
                  RAG JSON
                  <span className="ml-auto text-[9px] font-bold rounded-full bg-warning-subtle text-warning px-1.5 py-0.5">PAID</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedUnreadIds.length > 0 && (
              <Button size="sm" variant="ghost" aria-label="Mark as read" className="text-fg-muted hover:text-fg shrink-0" onClick={() => markRead(selectedUnreadIds)}>
                <CheckCheck className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Mark as read</span>
              </Button>
            )}

            {/* Mobile: More (move) */}
            <Button size="sm" variant="ghost" className="md:hidden shrink-0 text-fg-muted" aria-label="More" onClick={() => setShowBulkSheet(true)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            <Button size="sm" variant="ghost" aria-label="Delete selected" className="text-error hover:text-error hover:bg-error/10 shrink-0" onClick={() => setDeleteTarget({ type: "bulk", count: selectedIds.size })}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" aria-label="Clear selection" className="rounded-full h-6 w-6 p-0 shrink-0" onClick={clearSelection}>×</Button>
          </div>
        </div>
      )}

      {/* Mobile bulk "more" sheet (Move) */}
      <Sheet open={showBulkSheet} onOpenChange={setShowBulkSheet}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Move {selectedIds.size} to collection</SheetTitle>
          </SheetHeader>
          <div className="pb-6 pt-2">
            <MoveToCollectionMenu
              targets={selectedTargets}
              collections={collections}
              onMove={onMove}
              onCreateCollection={createCollection}
              onDone={() => setShowBulkSheet(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile row action sheet */}
      <Sheet open={rowSheet !== null} onOpenChange={(o) => { if (!o) setRowSheet(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {rowSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="truncate" dir="auto">{titleOf(rowSheet)}</SheetTitle>
              </SheetHeader>
              <div className="pb-6 pt-2 space-y-1">
                <SheetRow href={`/dashboard/library/${rowSheet.id}`} icon={<Eye className="h-4 w-4" />} label="Open transcript" onNavigate={() => setRowSheet(null)} />
                <SheetAnchor href={`https://youtu.be/${rowSheet.video_id}`} icon={<Play className="h-4 w-4" />} label="Watch on YouTube" />
                {isNew(rowSheet) && <SheetButton icon={<CheckCheck className="h-4 w-4" />} label="Mark as read" onClick={() => { markRead([rowSheet.id]); setRowSheet(null); }} />}
                <SheetButton icon={<Pencil className="h-4 w-4" />} label="Rename" onClick={() => { const r = rowSheet; setRowSheet(null); startRename(r); }} />
                <div className="border-t border-border-subtle pt-2">
                  <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Move to collection</p>
                  <MoveToCollectionMenu
                    targets={[{ id: rowSheet.id, collection_id: rowSheet.collection_id }]}
                    collections={collections}
                    onMove={onMove}
                    onCreateCollection={createCollection}
                    onDone={() => setRowSheet(null)}
                  />
                </div>
                <div className="border-t border-border-subtle pt-2">
                  <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Export</p>
                  {FORMAT_GROUPS.flatMap((g) => g.items).map((f) => (
                    <SheetButton key={f.id} icon={<Download className="h-4 w-4" />} label={f.label} onClick={() => { handleDownload([rowSheet.id], f.id); setRowSheet(null); }} />
                  ))}
                  <SheetButton
                    icon={<Download className="h-4 w-4" />}
                    label="RAG JSON"
                    trailing={rowSheet.has_rag
                      ? <span className="text-[9px] font-bold rounded-full bg-teal-subtle text-teal px-1.5 py-0.5">PURCHASED</span>
                      : <span className="text-[9px] font-bold rounded-full bg-warning-subtle text-warning px-1.5 py-0.5">PAID</span>}
                    onClick={() => { const id = rowSheet.id; setRowSheet(null); openRag([id]); }}
                  />
                </div>
                <div className="border-t border-border-subtle pt-2">
                  <SheetButton
                    icon={<Trash2 className="h-4 w-4" />}
                    label="Delete"
                    destructive
                    onClick={() => { const r = rowSheet; setRowSheet(null); setDeleteTarget({ type: "single", id: r.id, title: titleOf(r) }); }}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* RAG confirmation dialog */}
      {(() => {
        const totalCost = ragBulkItems?.reduce((s, i) => s + i.cost, 0) ?? 0;
        const paidCount = ragBulkItems?.filter((i) => !i.alreadyExported).length ?? 0;
        const freeCount = ragBulkItems?.filter((i) => i.alreadyExported).length ?? 0;
        const insufficient = !ragBulkExecuting && !ragBulkSuccess && credits !== null && totalCost > 0 && credits < totalCost;
        const remaining = credits !== null ? credits - totalCost : null;
        return (
          <Dialog
            open={showRagModal}
            onOpenChange={(open) => {
              setShowRagModal(open);
              if (!open) { setRagBulkItems(null); setRagBulkError(null); setRagBulkSuccess(false); setRagTargetIds([]); }
            }}
          >
            <DialogContent className="max-w-[min(32rem,calc(100%-2rem))]">
              <DialogHeader>
                <DialogTitle>{ragTargetIds.length > 1 ? "Export RAG JSON" : "Export RAG JSON"}</DialogTitle>
                <DialogDescription>
                  Chunk size {ragChunkSize}s (from your Settings). Re-downloads are always free.
                </DialogDescription>
              </DialogHeader>

              {ragBulkLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-fg-muted" /></div>
              ) : ragBulkItems && (
                <div className="space-y-4">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto overflow-x-hidden">
                    {ragBulkItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-fg truncate flex-1 min-w-0" dir="auto">{item.title}</span>
                        <span className="text-fg-muted text-xs shrink-0">
                          {item.alreadyExported ? "Free (re-download)" : `${item.cost} credit${item.cost !== 1 ? "s" : ""}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Cost summary */}
                  <div className="rounded-lg border border-border bg-surface-elevated/30 p-3 text-sm space-y-1">
                    {freeCount > 0 && <p className="text-fg-muted">{freeCount} already exported — free</p>}
                    {totalCost === 0 ? (
                      <p className="text-success font-medium">All already exported — free re-download.</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-fg-muted">{paidCount} new export{paidCount !== 1 ? "s" : ""}</span>
                          <span className="font-semibold text-fg tabular-nums">{totalCost} credit{totalCost !== 1 ? "s" : ""}</span>
                        </div>
                        {credits !== null && (
                          <div className="flex items-center justify-between text-xs text-fg-muted">
                            <span>Balance {credits} → {Math.max(0, remaining ?? 0)} after</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {insufficient && (
                    <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Not enough credits. You have {credits} but need {totalCost}.
                    </div>
                  )}
                </div>
              )}

              {ragBulkError && (
                <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {ragBulkError}
                </div>
              )}
              {ragBulkSuccess && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-sm text-success">
                  <span className="font-medium">Export complete — download started.</span>
                  <button onClick={() => setShowRagModal(false)} className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer" aria-label="Close">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <DialogFooter>
                <button className="text-sm text-fg-muted hover:text-fg transition-colors px-3 py-1.5" onClick={() => setShowRagModal(false)}>Cancel</button>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-fg-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={executeRag}
                  disabled={ragBulkExecuting || insufficient || !ragBulkItems || ragBulkSuccess || ragBulkLoading}
                >
                  {ragBulkExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Download className="h-4 w-4" />
                  {totalCost > 0 ? `Export · ${totalCost} credit${totalCost !== 1 ? "s" : ""}` : "Export — Free"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "bulk"
                ? `Delete ${deleteTarget.count} transcript${deleteTarget.count !== 1 ? "s" : ""}?`
                : `Delete “${deleteTarget?.type === "single" ? deleteTarget.title : ""}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-error text-white hover:bg-error/90" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Small local primitives ───────────────────────────────────────────────────
function TriBox({ checked, indeterminate }: { checked: boolean; indeterminate: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors",
        checked || indeterminate ? "border-accent bg-accent text-fg-on-accent" : "border-border-strong bg-surface-sunken",
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : indeterminate ? <Minus className="h-3 w-3" /> : null}
    </span>
  );
}

function SheetButton({ icon, label, onClick, destructive, trailing }: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean; trailing?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-md px-2 py-2.5 text-sm transition-colors",
        destructive ? "text-error hover:bg-error/10" : "text-fg hover:bg-surface-elevated/60",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  );
}

function SheetRow({ href, icon, label, onNavigate }: { href: string; icon: React.ReactNode; label: string; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className="w-full flex items-center gap-3 rounded-md px-2 py-2.5 text-sm text-fg hover:bg-surface-elevated/60 transition-colors">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

function SheetAnchor({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 rounded-md px-2 py-2.5 text-sm text-fg hover:bg-surface-elevated/60 transition-colors">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
    </a>
  );
}
