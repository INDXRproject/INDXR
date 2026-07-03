"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  ExternalLink,
  Eye,
  Loader2,
  Download,
  Pencil,
  Folder,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@indxr/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@indxr/shared/components/ui/tooltip";
import { Checkbox } from "@indxr/shared/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern";
import { HexagonEmptyState } from "@indxr/shared/components/icons/HexagonEmptyState";
import { createClient } from "@indxr/shared/utils/supabase/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generateTxt, generateCsv, generateSrt, generateVtt, generateMarkdown, buildRagJson } from "@indxr/shared/utils/formatTranscript";
import { bulkDeductRagExportCreditsAction } from "@indxr/shared/actions/rag-export";
import { useAuth } from "@indxr/shared/hooks/useAuth";
import { cn } from "@indxr/shared/lib/utils";

// Helper for relative time
function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatDuration(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatWordCount(characterCount?: number) {
  if (!characterCount) return null;
  const words = Math.round(characterCount / 5);
  return `${words.toLocaleString()} words`;
}

export interface Transcript {
  id: string;
  title: string;
  video_id: string;
  video_url?: string;
  created_at: string;
  updated_at?: string;
  thumbnail_url?: string;
  duration?: number;
  character_count?: number;
  processing_method?: string | null;
  // New fields
  edited_content?: object | null;
  ai_summary?: { edited_html?: string } | null;
  rag_exports?: object[] | null;
  collection_id?: string | null;
  playlist_id?: string | null;
  viewed_at?: string | null;
}

const slugify = (s: string) =>
  (s || 'video').toLowerCase().replace(/['''"""`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Source badge — one per transcript, cool/blue family */
function sourceBadgeLabel(t: Transcript): string {
  const method = t.processing_method;
  if (!method || method === 'youtube_captions') return 'Auto-captions';
  return 'AI Transcription';
}

/** Output badges — one per available derived artifact, violet family */
function outputBadgeLabels(t: Transcript): string[] {
  const labels: string[] = [];
  if (t.edited_content) labels.push('Edited');
  if (t.ai_summary) labels.push('AI Summary');
  if (t.ai_summary?.edited_html) labels.push('Edited Summary');
  if (t.rag_exports && t.rag_exports.length > 0) labels.push('RAG ✦');
  return labels;
}

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-info-subtle px-2 py-0.5 text-[10px] font-medium text-info whitespace-nowrap">
      {label}
    </span>
  );
}

function OutputBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-subtle px-2 py-0.5 text-[10px] font-medium text-violet whitespace-nowrap">
      {label}
    </span>
  );
}

function CollectionBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-fg-subtle whitespace-nowrap">
      <Folder className="h-2.5 w-2.5" />
      {name}
    </span>
  );
}

function NewBadge({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            onClick={onClick}
            className="inline-flex items-center rounded-full bg-success-subtle px-1.5 py-0.5 text-[10px] font-bold text-success cursor-pointer hover:bg-success-subtle/80 transition-colors whitespace-nowrap"
          >
            NEW
          </span>
        </TooltipTrigger>
        <TooltipContent>Click to mark as read</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface TranscriptListProps {
  transcripts: Transcript[];
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  viewMode: 'grid' | 'list';
  showThumbnails?: boolean;
  collections?: { id: string; name: string }[];
}

export function TranscriptList({ transcripts, onDelete, onRename, viewMode, showThumbnails = false, collections = [] }: TranscriptListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  // Track locally-marked-as-read IDs so badge hides instantly
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());
  const editTitleRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { credits, refreshCredits } = useAuth();

  const collectionName = (id: string | null | undefined) =>
    id ? collections.find(c => c.id === id)?.name : undefined;

  // ── Bulk RAG export state ────────────────────────────────────────────────
  type RagBulkItem = { id: string; title: string; duration: number; alreadyExported: boolean; cost: number };
  const [ragBulkItems, setRagBulkItems]         = useState<RagBulkItem[] | null>(null);
  const [showRagBulkModal, setShowRagBulkModal] = useState(false);
  const [ragBulkLoading, setRagBulkLoading]     = useState(false);
  const [ragBulkExecuting, setRagBulkExecuting] = useState(false);
  const [ragBulkError, setRagBulkError]         = useState<string | null>(null);
  const [ragBulkSuccess, setRagBulkSuccess]     = useState(false);
  const [ragChunkSize, setRagChunkSize]         = useState<number>(60);
  const [downloadError, setDownloadError]       = useState<string | null>(null);
  const [downloadWarning, setDownloadWarning]   = useState<string | null>(null);

  /** Mark a single transcript as viewed without navigating to it */
  const handleMarkAsRead = async (transcriptId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocallyReadIds(prev => new Set(prev).add(transcriptId));
    const { error } = await supabase
      .from('transcripts')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', transcriptId);
    if (error) {
      console.error('Mark as read failed:', error);
      // Rollback optimistic update
      setLocallyReadIds(prev => { const s = new Set(prev); s.delete(transcriptId); return s; });
    } else {
      window.dispatchEvent(new CustomEvent('transcripts-updated'));
    }
  };

  const isNew = (t: Transcript) => !t.viewed_at && !locallyReadIds.has(t.id);

  // Drag start — pass transcript id via dataTransfer
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("transcriptId", id);
    // Add plain text fallback for broader browser support
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    // Cancel any active rename on drag start
    if (editingId) setEditingId(null);
  };

  // Inline rename
  const handleRenameStart = (t: Transcript) => {
    setEditingId(t.id);
    setEditingTitle(t.title || `Video ${t.video_id}`);
    setTimeout(() => editTitleRef.current?.focus(), 0);
  };

  const handleRenameSave = (id: string) => {
    const name = editingTitle.trim();
    setEditingId(null);
    if (!name) return;
    const original = transcripts.find(t => t.id === id)?.title ?? "";
    if (name === original) return;
    onRename?.(id, name);
  };

  // Selection Handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transcripts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transcripts.map(t => t.id)));
    }
  };

  const handleBatchDelete = () => {
    if (!confirm(`Delete ${selectedIds.size} transcripts?`)) return;
    selectedIds.forEach(id => onDelete(id));
    setSelectedIds(new Set());
  };

  // ── Bulk RAG: fetch preview data then show confirmation modal ────────────
  const handleBulkRagPreview = async () => {
    setRagBulkLoading(true);
    setRagBulkError(null);
    setRagBulkSuccess(false);
    try {
      // Fetch user's chunk size preference
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('rag_chunk_size')
          .eq('id', authUser.id)
          .single();
        setRagChunkSize(profile?.rag_chunk_size ?? 60);
      }

      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, duration, rag_exports')
        .in('id', Array.from(selectedIds));

      if (error || !data) throw new Error('Failed to load transcript data');

      const items: RagBulkItem[] = data.map((t: Record<string, unknown>) => {
        const ragExports = (t.rag_exports as object[] | null) ?? [];
        const alreadyExported = ragExports.length > 0;
        const duration = (t.duration as number) ?? 0;
        const cost = alreadyExported ? 0 : Math.max(1, Math.ceil(duration / 900));
        return { id: t.id as string, title: (t.title as string) || `Video ${t.id}`, duration, alreadyExported, cost };
      });

      setRagBulkItems(items);
      setShowRagBulkModal(true);
    } catch (e) {
      console.error(e);
      // Open the modal to show the error persistently (no auto-dismissing toast)
      setRagBulkError('Failed to load transcript data. Please try again.');
      setShowRagBulkModal(true);
    } finally {
      setRagBulkLoading(false);
    }
  };

  // ── Bulk RAG: deduct (atomic total) then generate ZIP ───────────────────
  const handleBulkRagExecute = async () => {
    if (!ragBulkItems) return;
    setRagBulkExecuting(true);
    setRagBulkError(null);
    try {
      const newExports = ragBulkItems.filter(item => !item.alreadyExported);

      // Deduct total in one atomic RPC — all or nothing
      if (newExports.length > 0) {
        const result = await bulkDeductRagExportCreditsAction(
          newExports.map(item => ({ transcriptId: item.id, durationSeconds: item.duration, chunkSize: ragChunkSize }))
        );
        if (!result.success) {
          setRagBulkError(result.error ?? 'Insufficient credits');
          return;
        }
        await refreshCredits();
      }

      // Fetch full transcript content for ZIP generation
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, video_id, transcript')
        .in('id', Array.from(selectedIds));

      if (error || !data) throw new Error('Failed to fetch transcript data');


      const zip = new JSZip();
      const usedNames = new Set<string>();
      data.forEach((item: Record<string, unknown>) => {
        const slug = slugify(item.title as string);
        const videoId = (item.video_id as string) || 'unknown';
        const base = `${slug}_rag_${ragChunkSize}s`;
        let filename = `${base}.json`;
        let counter = 2;
        while (usedNames.has(filename)) { filename = `${base}_${counter++}.json`; }
        usedNames.add(filename);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = buildRagJson(item.transcript as any, { videoId, title: item.title as string, chunkSize: ragChunkSize });
        zip.file(filename, json);
      });

      // Integrity check: archive must contain as many files as selected
      const fileCount = Object.keys(zip.files).length;
      if (fileCount !== selectedIds.size) {
        setRagBulkError(`Warning: exported ${fileCount} of ${selectedIds.size} files — some may have been skipped.`);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const now = new Date();
      const zipDate = now.toISOString().slice(0, 10);
      const zipTime = now.toISOString().slice(11, 16).replace(':', '');
      saveAs(content, `indxr-${selectedIds.size}-transcripts-rag-${zipDate}-${zipTime}.zip`);

      setRagBulkSuccess(true);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      setRagBulkError('Export failed. Please try again.');
    } finally {
      setRagBulkExecuting(false);
    }
  };

  type BatchFormat = 'txt' | 'txt-ts' | 'md' | 'md-ts' | 'json' | 'csv' | 'srt' | 'vtt';

  const handleBatchDownload = async (format: BatchFormat) => {
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadWarning(null);
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, video_id, processing_method, transcript')
        .in('id', Array.from(selectedIds));

      if (error || !data) throw new Error("Failed to fetch transcript data");


      const zip = new JSZip();
      const usedNames = new Set<string>();
      const tsSuffix = format === 'txt-ts' || format === 'md-ts' ? '_timestamps' : '';
      const formatType = format === 'txt-ts' ? 'txt' : format === 'md-ts' ? 'md' : format;

      data.forEach((item: Record<string, unknown>) => {
        const slug = slugify(item.title as string);
        const videoId = (item.video_id as string) || 'unknown';
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const tx = item.transcript as Parameters<typeof generateTxt>[0];

        let fileContent = "";
        let extension = "";

        if (format === 'txt' || format === 'txt-ts') {
          fileContent = generateTxt(tx, format === 'txt-ts'); extension = "txt";
        } else if (format === 'md' || format === 'md-ts') {
          fileContent = generateMarkdown(tx, item.title as string, format === 'md-ts'); extension = "md";
        } else if (format === 'json') {
          fileContent = JSON.stringify({ metadata: { title: item.title, videoUrl }, transcript: tx }, null, 2); extension = "json";
        } else if (format === 'csv') {
          fileContent = generateCsv(tx); extension = "csv";
        } else if (format === 'srt') {
          fileContent = generateSrt(tx, { extractionMethod: (item.processing_method as string) ?? undefined }); extension = "srt";
        } else if (format === 'vtt') {
          fileContent = generateVtt(tx, { title: item.title as string, extractionMethod: (item.processing_method as string) ?? undefined }); extension = "vtt";
        }

        const base = `${slug}_${formatType}${tsSuffix}`;
        let filename = `${base}.${extension}`;
        let counter = 2;
        while (usedNames.has(filename)) { filename = `${base}_${counter++}.${extension}`; }
        usedNames.add(filename);

        zip.file(filename, fileContent);
      });

      // Integrity check: warn when archive file count doesn't match selection
      const fileCount = Object.keys(zip.files).length;
      if (fileCount !== selectedIds.size) {
        setDownloadWarning(`Exported ${fileCount} of ${selectedIds.size} files — some transcripts may have been skipped.`);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const now = new Date();
      const zipDate = now.toISOString().slice(0, 10);
      const zipTime = now.toISOString().slice(11, 16).replace(':', '');
      saveAs(content, `indxr-${selectedIds.size}-transcripts-${format}-${zipDate}-${zipTime}.zip`);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      setDownloadError("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (transcripts.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed border-border py-20 text-center">
        <HexagonPattern className="opacity-[0.035] dark:opacity-[0.05]" />
        <div className="relative flex flex-col items-center">
          <HexagonEmptyState className="mb-4" />
          <h3 className="text-lg font-medium text-fg">Library is empty</h3>
          <p className="text-sm text-fg-muted mt-2 max-w-xs">
            Transcripts you extract will appear here.
          </p>
          <Link href="/dashboard/transcribe">
            <Button className="mt-6">Transcribe a video</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in">
           <div className="bg-surface border border-border shadow-xl rounded-full px-6 py-3 flex items-center gap-4">
              <span className="text-sm font-medium text-fg">{selectedIds.size} selected</span>

              <div className="h-6 w-px bg-border/50" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-52">
                  <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Text</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleBatchDownload('txt')}>TXT — plain text (.zip)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchDownload('txt-ts')}>TXT — with timestamps (.zip)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchDownload('md')}>Markdown (.zip)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchDownload('md-ts')}>Markdown — with timestamps (.zip)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Data</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleBatchDownload('json')}>JSON (.zip)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchDownload('csv')}>CSV (.zip)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Subtitles</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleBatchDownload('srt')}>SRT (.zip)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchDownload('vtt')}>VTT (.zip)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Developer</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleBulkRagPreview} disabled={ragBulkLoading}>
                    {ragBulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                    RAG JSON <span className="text-accent text-[10px] font-bold align-super ml-0.5">✦</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" variant="ghost" className="text-error hover:text-error hover:bg-error/10" onClick={handleBatchDelete}>
                 <Trash2 className="h-4 w-4" />
              </Button>

              <Button size="sm" variant="ghost" className="rounded-full h-6 w-6 p-0" onClick={() => setSelectedIds(new Set())}>
                ×
              </Button>
           </div>
        </div>
      )}

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

      {viewMode === 'list' ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          <HexagonPattern className="opacity-[0.035] dark:opacity-[0.05]" />

          {/* Header row */}
          <div className="relative flex items-center gap-3 border-b border-border-subtle bg-surface-elevated/50 px-4 py-2.5 text-xs font-medium text-fg-muted">
            <Checkbox
              checked={selectedIds.size === transcripts.length && transcripts.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="flex-1">Title</span>
          </div>

          <div className="relative divide-y divide-border-subtle">
            {transcripts.map((t) => {
              const outputs = outputBadgeLabels(t);
              const colName = collectionName(t.collection_id);
              const words = formatWordCount(t.character_count);
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  className={cn(
                    "group flex items-start gap-3 px-4 py-3 transition-colors cursor-grab active:cursor-grabbing hover:bg-surface-elevated/40",
                    selectedIds.has(t.id) && "bg-surface-elevated/50"
                  )}
                >
                  {/* Checkbox — visible on hover / when selected */}
                  <div className={cn("pt-0.5 transition-opacity", selectedIds.has(t.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={() => toggleSelect(t.id)}
                    />
                  </div>

                  {/* Thumbnail — opt-in only */}
                  {showThumbnails && t.thumbnail_url && (
                    <div className="hidden sm:block h-[36px] w-16 shrink-0 overflow-hidden rounded-md bg-bg-subtle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}

                  {/* Title-driven content block */}
                  <div className="min-w-0 flex-1">
                    <div className="group/title flex items-start gap-1.5">
                      {editingId === t.id ? (
                        <input
                          ref={editTitleRef}
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onBlur={() => handleRenameSave(t.id)}
                          onKeyDown={e => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") { setEditingId(null); }
                          }}
                          className="w-full bg-transparent border-b border-border font-medium text-fg text-[15px] leading-snug outline-none py-0.5"
                        />
                      ) : (
                        <>
                          <Link
                            href={`/dashboard/library/${t.id}`}
                            className="font-medium text-fg text-[15px] leading-snug line-clamp-2 hover:text-accent transition-colors"
                            onDoubleClick={e => { e.preventDefault(); handleRenameStart(t); }}
                          >
                            {t.title || `Video ${t.video_id}`}
                          </Link>
                          <button
                            onClick={() => handleRenameStart(t)}
                            className="opacity-0 group-hover/title:opacity-100 transition-opacity text-fg-muted hover:text-fg h-4 w-4 flex items-center justify-center shrink-0 mt-1"
                            title="Rename"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Badges + metadata */}
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isNew(t) && <NewBadge onClick={(e) => handleMarkAsRead(t.id, e)} />}
                        <SourceBadge label={sourceBadgeLabel(t)} />
                        {outputs.map(label => <OutputBadge key={label} label={label} />)}
                        {colName && <CollectionBadge name={colName} />}
                      </div>
                      <div className="text-xs text-fg-muted whitespace-nowrap">
                        {t.duration ? formatDuration(t.duration) : '—'}
                        {words && <> · {words}</>}
                        {' · '}
                        {getRelativeTime(
                          t.updated_at && new Date(t.updated_at) > new Date(t.created_at)
                            ? t.updated_at
                            : t.created_at
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row actions — visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Link href={`/dashboard/library/${t.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:bg-accent hover:text-fg-on-accent">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:bg-accent hover:text-fg-on-accent" asChild>
                      <a href={`https://youtu.be/${t.video_id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-fg-muted hover:text-error hover:bg-error/10"
                      onClick={() => onDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-0 -m-4 overflow-hidden rounded-xl">
            <HexagonPattern className="opacity-[0.035] dark:opacity-[0.05]" />
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {transcripts.map((t) => {
              const outputs = outputBadgeLabels(t);
              const colName = collectionName(t.collection_id);
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  className={cn(
                    "group relative rounded-xl border border-border bg-surface transition-colors cursor-grab active:cursor-grabbing hover:border-border-strong",
                    selectedIds.has(t.id) && "ring-2 ring-accent border-transparent"
                  )}
                >
                  <div
                    className={cn("absolute top-3 left-3 z-20 transition-opacity", selectedIds.has(t.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                  >
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={() => toggleSelect(t.id)}
                      className="bg-bg/80"
                    />
                  </div>

                  {showThumbnails && t.thumbnail_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-bg-subtle relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute bottom-2 right-2 bg-bg/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-fg">
                        {t.duration ? formatDuration(t.duration) : '00:00'}
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start gap-1.5">
                      <Link
                        href={`/dashboard/library/${t.id}`}
                        className="font-medium text-fg text-sm leading-snug line-clamp-2 flex-1 hover:text-accent transition-colors"
                      >
                        {t.title || `Video ${t.video_id}`}
                      </Link>
                      {isNew(t) && <NewBadge onClick={(e) => handleMarkAsRead(t.id, e)} />}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <SourceBadge label={sourceBadgeLabel(t)} />
                      {outputs.map(label => <OutputBadge key={label} label={label} />)}
                      {colName && <CollectionBadge name={colName} />}
                    </div>

                    {!showThumbnails && (
                      <p className="mt-2 text-xs text-fg-muted">
                        {t.duration ? formatDuration(t.duration) : '—'} · {getRelativeTime(t.created_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 px-3 pb-3">
                    <Link href={`/dashboard/library/${t.id}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="h-8 text-xs w-full text-fg hover:bg-accent hover:text-fg-on-accent">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:bg-accent hover:text-fg-on-accent" asChild>
                      <a href={`https://youtu.be/${t.video_id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-fg-muted hover:text-error hover:bg-error/10"
                      onClick={() => onDelete(t.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bulk RAG confirmation dialog ────────────────────────────────────── */}
      {(() => {
        const totalCost    = ragBulkItems?.reduce((s, i) => s + i.cost, 0) ?? 0;
        const paidCount    = ragBulkItems?.filter(i => !i.alreadyExported).length ?? 0;
        const freeCount    = ragBulkItems?.filter(i => i.alreadyExported).length ?? 0;
        // Guard: suppress insufficient banner while export is running or after success to prevent
        // post-deduct re-render artefact (credits refreshed to post-aftrek saldo < totalCost).
        const insufficient = !ragBulkExecuting && !ragBulkSuccess && credits !== null && totalCost > 0 && credits < totalCost;
        return (
          <Dialog open={showRagBulkModal} onOpenChange={(open) => {
            setShowRagBulkModal(open);
            if (!open) { setRagBulkItems(null); setRagBulkError(null); setRagBulkSuccess(false); }
          }}>
            <DialogContent className="max-w-[min(32rem,calc(100%-2rem))]">
              <DialogHeader>
                <DialogTitle>Bulk RAG JSON Export</DialogTitle>
                <DialogDescription>
                  Chunk size: {ragChunkSize}s (from your Settings preset). Re-downloads are always free.
                </DialogDescription>
              </DialogHeader>

              {ragBulkItems && (
                <div className="space-y-4">
                  {/* Per-transcript breakdown */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto overflow-x-hidden">
                    {ragBulkItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-fg truncate flex-1 min-w-0">{item.title}</span>
                        {item.alreadyExported
                          ? <span className="text-fg-muted text-xs shrink-0">Free (re-download)</span>
                          : <span className="text-fg-muted text-xs shrink-0">{item.cost} credit{item.cost !== 1 ? 's' : ''}</span>
                        }
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="rounded-lg border border-border bg-surface-elevated/30 p-3 text-sm space-y-0.5">
                    {freeCount > 0 && (
                      <p className="text-fg-muted">{freeCount} already exported — free</p>
                    )}
                    {paidCount > 0 && (
                      <p className="text-fg">
                        <span className="font-semibold">{paidCount} new</span>
                        {' · '}{totalCost} credit{totalCost !== 1 ? 's' : ''}
                        {credits !== null && <span className="text-fg-muted ml-1">({credits} available)</span>}
                      </p>
                    )}
                    {totalCost === 0 && (
                      <p className="text-success font-medium">All transcripts already exported — free!</p>
                    )}
                  </div>

                  {/* Pre-confirm: insufficient credits */}
                  {insufficient && (
                    <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Not enough credits. You have {credits} but need {totalCost}.
                    </div>
                  )}
                </div>
              )}

              {/* Persistent inline error (replaces toast) */}
              {ragBulkError && (
                <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {ragBulkError}
                </div>
              )}

              {/* Inline success confirmation — persistent until user dismisses */}
              {ragBulkSuccess && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-sm text-success">
                  <span className="font-medium">Export complete — ZIP download started.</span>
                  <button
                    onClick={() => setShowRagBulkModal(false)}
                    className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <DialogFooter>
                <button
                  className="text-sm text-fg-muted hover:text-fg transition-colors px-3 py-1.5"
                  onClick={() => setShowRagBulkModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-fg-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleBulkRagExecute}
                  disabled={ragBulkExecuting || insufficient || !ragBulkItems || ragBulkSuccess}
                >
                  {ragBulkExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Download className="h-4 w-4" />
                  {totalCost > 0 ? `Export · ${totalCost} credits` : 'Export — Free'}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </>
  );
}
