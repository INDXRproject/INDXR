"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Copy,
  Check,
  Trash2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Sparkles,
  Search,
  ChevronUp,
  ChevronDown,
  Loader2,
  X,
  Save,
  AlertCircle,
  MoreHorizontal,
  SlidersHorizontal,
  RotateCcw,
  Play,
  Pencil,
} from "lucide-react";
import posthog from "posthog-js";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { JSONContent } from "@tiptap/react";

import { Button } from "@indxr/shared/components/ui/button";
import { Switch } from "@indxr/shared/components/ui/switch";
import { Label } from "@indxr/shared/components/ui/label";
import { Input } from "@indxr/shared/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@indxr/shared/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@indxr/shared/components/ui/dialog";

import { marketingHref } from "@indxr/shared/lib/cross-host-links";
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard";
import { useRouter } from "next/navigation";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { useAuth } from "@indxr/shared/hooks/useAuth";
import { cn } from "@indxr/shared/lib/utils";
import { NocookieYouTubePlayer, type YouTubePlayerHandle } from "./NocookieYouTubePlayer";
import { RAG_CHUNK_PRESETS, RAG_CHUNK_DEFAULT, type RagChunkSize } from "@indxr/shared/lib/pricing";
import {
  generateTxt,
  generateSrt,
  generateVtt,
  generateCsv,
  generateMarkdown,
  decodeEntities,
  buildRagJson,
  buildReadingParagraphs,
  TranscriptItem,
} from "@indxr/shared/utils/formatTranscript";
import { deductRagExportCreditsAction } from "@indxr/shared/actions/rag-export";

// ─── Search Extension (Prosemirror Decorations) ──────────────────────────────

export interface SearchOptions {
  searchTerm: string;
  currentIndex: number;
  onSearchUpdate?: (count: number, index: number) => void;
}

const searchPluginKey = new PluginKey("search");

const SearchExtension = Extension.create<SearchOptions>({
  name: "search",
  addOptions() {
    return { searchTerm: "", currentIndex: 0 };
  },
  addCommands() {
    return {
      setSearchTerm:
        (searchTerm: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ tr }: { tr: any }) => {
          this.options.searchTerm = searchTerm;
          tr.setMeta(searchPluginKey, { searchTerm });
          return true;
        },
      setSearchIndex:
        (index: number) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ tr }: { tr: any }) => {
          this.options.currentIndex = index;
          tr.setMeta(searchPluginKey, { currentIndex: index });
          return true;
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply: (tr) => {
            const meta = tr.getMeta(searchPluginKey);
            if (meta) {
              if (meta.searchTerm !== undefined)
                this.options.searchTerm = meta.searchTerm;
              if (meta.currentIndex !== undefined)
                this.options.currentIndex = meta.currentIndex;
            }
            const { searchTerm } = this.options;
            if (!searchTerm) {
              if (this.options.onSearchUpdate)
                setTimeout(() => this.options.onSearchUpdate!(0, 0), 0);
              return DecorationSet.empty;
            }
            const doc = tr.doc;
            const lowerSearch = searchTerm.toLowerCase();
            const decorations: Decoration[] = [];
            let resultCount = 0;
            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const lowerText = node.text.toLowerCase();
                let idx = 0;
                while ((idx = lowerText.indexOf(lowerSearch, idx)) !== -1) {
                  const isCurrent = resultCount === this.options.currentIndex;
                  decorations.push(
                    Decoration.inline(
                      pos + idx,
                      pos + idx + lowerSearch.length,
                      {
                        class: "search-highlight",
                        style: `background-color:var(--warning);border-radius:2px;${
                          isCurrent ? "outline:2px solid var(--color-warning-border);" : ""
                        }`,
                      }
                    )
                  );
                  resultCount++;
                  idx += lowerSearch.length;
                }
              }
            });
            if (this.options.onSearchUpdate) {
              if (resultCount > 0 && this.options.currentIndex >= resultCount)
                this.options.currentIndex = 0;
              setTimeout(
                () =>
                  this.options.onSearchUpdate!(
                    resultCount,
                    this.options.currentIndex
                  ),
                0
              );
            }
            return DecorationSet.create(doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

const RAG_CHUNK_OPTIONS = RAG_CHUNK_PRESETS;

interface TranscriptViewerProps {
  id: string;
  transcript: TranscriptItem[];
  title: string;
  videoUrl: string;
  videoId: string;
  channelTitle?: string;
  language?: string | null;
  thumbnailUrl?: string;
  editedContent: JSONContent | null;
  aiSummary: JSONContent | null;
  viewedAt: string | null;
  mode: "original" | "edited";
  processingMethod?: string | null;
  ragExports?: Array<{ chunk_size: number; exported_at: string; credits_spent: number }> | null;
  userChunkSize?: number;
  duration?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUITimestamp(seconds: number): string {
  return new Date(seconds * 1000).toISOString().substr(11, 8);
}

/** Convert transcript segments → Tiptap document, merged into readable paragraphs
 *  (buildReadingParagraphs) with one leading timestamp per paragraph. This is the fix
 *  for the "one segment per line = poem with a ragged edge" reading problem. */
function transcriptToJSON(
  items: TranscriptItem[],
  videoId: string,
  isAi: boolean
): JSONContent {
  const paras = buildReadingParagraphs(items, { isAi });
  // Uploaded audio has no YouTube video_id: keep the timestamp styled + toggleable (same
  // `.ts-link` class) but make it an inert position marker (`.ts-static`, pointer-events:none)
  // instead of a link to a player that isn't there / a broken `watch?v=null` URL.
  const hasVideo = !!videoId;
  return {
    type: "doc",
    content: paras.map((para) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [
            {
              type: "link",
              attrs: hasVideo
                ? {
                    href: `https://youtube.com/watch?v=${videoId}&t=${Math.floor(para.startOffset)}s`,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "ts-link",
                  }
                : { href: "#", class: "ts-link ts-static" },
            },
          ],
          text: `[${formatUITimestamp(para.startOffset)}]`,
        },
        { type: "text", text: ` ${para.text}` },
      ],
    })),
  };
}



// ─── Main Component ───────────────────────────────────────────────────────────

export function TranscriptViewer({
  id,
  transcript,
  title: initialTitle,
  videoUrl,
  videoId,
  channelTitle,
  language,
  editedContent,
  aiSummary,
  viewedAt,
  mode,
  processingMethod,
  ragExports,
  userChunkSize,
  duration,
}: TranscriptViewerProps) {
  const router = useRouter();
  const supabase = createClient();
  const { user, credits, refreshCredits } = useAuth();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarySuccess, setSummarySuccess] = useState(false);

  // UI state
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  // Timestamp click → seek the in-app nocookie player (opening it if needed) instead of
  // navigating to YouTube. The links keep their href as a no-JS fallback.
  const handleTranscriptClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a.ts-link") as HTMLAnchorElement | null;
    if (!anchor) return;
    const m = anchor.href.match(/[?&]t=(\d+)s/);
    if (!m) return;
    e.preventDefault();
    setShowVideo(true);
    playerRef.current?.seekTo(parseInt(m[1], 10));
  };
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSearch, setShowSearch] = useState(false); // Find is a button, not a permanent field
  const [textSize, setTextSize] = useState<"s" | "m" | "l">("m"); // Display menu → reading size

  // Title is display/edit-owned by the page header (TranscriptHeader); here it's read-only
  // (used for exports/copy/video panel).
  const title = initialTitle;

  // Uploaded audio has no YouTube video_id → no "Watch video"/"Watch on YouTube" affordance
  // (a nocookie player with no id renders a black square, which reads as broken).
  const hasVideo = !!videoId;

  // Editor mode state
  const isOriginalMode = mode === "original";
  const isEditedMode = mode === "edited";

  // Editor dirty state
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // True when an edited version has been persisted in Supabase
  const [hasSavedEdits, setHasSavedEdits] = useState(editedContent !== null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchesCount, setSearchMatchesCount] = useState(0);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Inline feedback state
  const [copied, setCopied] = useState(false);
  const [contentSaveFeedback, setContentSaveFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  // RAG export modal state
  const [localRagExports, setLocalRagExports] = useState<Array<{ chunk_size: number; exported_at: string; credits_spent: number }>>(ragExports ?? []);
  const [showRagModal, setShowRagModal] = useState(false);
  const [ragSelectedChunkSize, setRagSelectedChunkSize] = useState<RagChunkSize>(RAG_CHUNK_DEFAULT);
  const [ragExportLoading, setRagExportLoading] = useState(false);
  const [ragInsufficientCredits, setRagInsufficientCredits] = useState(false);

  const derivedDuration =
    duration ??
    (transcript.length > 0
      ? transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration
      : 0);
  const ragCost = Math.max(1, Math.ceil(derivedDuration / 600));

  // Mark as viewed on mount if not already viewed
  useEffect(() => {
    const markAsViewed = async () => {
      if (id && !viewedAt) {
        const { data, error } = await supabase
          .from("transcripts")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", id)
          .select();
        
        if (error) {
          console.error("View status update failed:", error);
        } else {
          // Notify library page so the NEW badge disappears immediately on back-navigation
          window.dispatchEvent(new CustomEvent('transcripts-updated'));
        }
      }
    };
    markAsViewed();
  }, [id, viewedAt, supabase]);

  // ── Tiptap editor ──────────────────────────────────────────────────────────

  // Initial content: original JSON or edited JSON based on mode. AI transcripts (AssemblyAI)
  // and captions merge differently — see buildReadingParagraphs.
  const isAiTranscript = !!processingMethod && processingMethod !== "youtube_captions";
  const originalJSON = transcriptToJSON(transcript, videoId, isAiTranscript);
  const initialContent: JSONContent = isEditedMode && editedContent ? editedContent : originalJSON;

  const editor = useEditor({
    editable: isEditedMode,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      SearchExtension.configure({
        onSearchUpdate: (count, index) => {
          setSearchMatchesCount(count);
          setCurrentMatchIdx(index);
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] text-fg/90 leading-relaxed",
          !isEditedMode && "read-only-mode"
        )
      },
    },
    onUpdate: () => {
      setIsDirty(true);
    },
  }, [mode, isEditedMode]); // Reinitialize if mode changes

  // Synchronize editor editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditedMode);
    }
  }, [editor, isEditedMode]);

  // ── Explicit Save ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editor) return;

    const json = editor.getJSON();
    // Guard against empty doc (no content or all empty paragraphs)
    const plainText = editor.getText().trim();
    if (!plainText) {
      setContentSaveFeedback({ type: 'error', message: 'Cannot save empty transcript. Use Reset to restore the original.' });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("transcripts")
      // Stamp when edited_content changed so the stale-summary notice can compare against
      // ai_summary.generated_at (must move with every edited_content write — ADR-085).
      .update({ edited_content: json, edited_content_updated_at: new Date().toISOString() })
      .eq("id", id);
    setIsSaving(false);

    if (error) {
      setContentSaveFeedback({ type: 'error', message: 'Failed to save changes' });
    } else {
      setIsDirty(false);
      setHasSavedEdits(true);
      setContentSaveFeedback({ type: 'success', message: 'Saved!' });
    }
  }, [editor, id, supabase]);

  // ── Search ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (editor) {
      // @ts-expect-error - custom commands
      editor.commands.setSearchTerm(searchQuery);
    }
  }, [searchQuery, editor]);

  const navigateMatch = useCallback(
    (direction: "next" | "prev") => {
      if (!searchMatchesCount || !editor) return;
      const next =
        direction === "next"
          ? (currentMatchIdx + 1) % searchMatchesCount
          : (currentMatchIdx - 1 + searchMatchesCount) % searchMatchesCount;
      // @ts-expect-error - custom commands
      editor.commands.setSearchIndex(next);
      setTimeout(() => {
        const active = document.querySelector<HTMLElement>(
          ".search-highlight[style*='outline']"
        );
        active?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    },
    [currentMatchIdx, searchMatchesCount, editor]
  );

  // ── Download / Copy ────────────────────────────────────────────────────────

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = (format: "txt" | "txt-ts" | "md" | "md-ts" | "json" | "srt" | "vtt" | "csv") => {
    const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 30);
    try {
      if (format === "txt")
        downloadFile(generateTxt(transcript, false), `${safe}.txt`, "text/plain");
      else if (format === "txt-ts")
        downloadFile(generateTxt(transcript, true), `${safe}_timestamps.txt`, "text/plain");
      else if (format === "md")
        downloadFile(generateMarkdown(transcript, title, false), `${safe}.md`, "text/markdown");
      else if (format === "md-ts")
        downloadFile(generateMarkdown(transcript, title, true), `${safe}_timestamps.md`, "text/markdown");
      else if (format === "json")
        downloadFile(
          JSON.stringify(
            {
              metadata: { title, ...(videoUrl && { videoUrl }), extractedAt: new Date().toISOString() },
              transcript: transcript.map((t) => ({ ...t, text: decodeEntities(t.text) })),
            },
            null,
            2
          ),
          `${safe}.json`,
          "application/json"
        );
      else if (format === "csv")
        downloadFile(generateCsv(transcript, { title, videoId, channel: channelTitle }), `${safe}.csv`, "text/csv;charset=utf-8");
      else if (format === "srt")
        downloadFile(generateSrt(transcript, { extractionMethod: processingMethod ?? undefined }), `${safe}.srt`, "text/plain");
      else if (format === "vtt")
        downloadFile(generateVtt(transcript, { title, extractionMethod: processingMethod ?? undefined }), `${safe}.vtt`, "text/vtt");
    } catch (e) {
      console.error(e);
      setDownloadError(`Failed to download ${format.toUpperCase()}`);
    }
  };

  const triggerRagFileDownload = (chunkSize: number) => {
    const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 30);
    const json = buildRagJson(transcript, {
      videoId,
      title,
      channel: channelTitle ?? undefined,
      language: language ?? undefined,
      extractionMethod: processingMethod ?? undefined,
      chunkSize,
    });
    downloadFile(json, `${safe}_rag_${chunkSize}s.json`, "application/json");
  };

  const handleRagMenuClick = () => {
    const defaultChunk = localRagExports.length > 0
      ? (localRagExports[localRagExports.length - 1].chunk_size as RagChunkSize)
      : ((userChunkSize ?? RAG_CHUNK_DEFAULT) as RagChunkSize);
    setRagSelectedChunkSize(defaultChunk);
    setRagInsufficientCredits(false);
    setShowRagModal(true);
  };

  const handleRagFirstExport = async () => {
    setRagExportLoading(true);
    setRagInsufficientCredits(false);
    const result = await deductRagExportCreditsAction(
      derivedDuration,
      id,
      ragSelectedChunkSize,
    );
    setRagExportLoading(false);
    if (!result.success) {
      setRagInsufficientCredits(true);
      return;
    }
    triggerRagFileDownload(ragSelectedChunkSize);
    setShowRagModal(false);
    setLocalRagExports(prev => [
      ...prev,
      { chunk_size: ragSelectedChunkSize, exported_at: new Date().toISOString(), credits_spent: result.cost },
    ]);
    refreshCredits();
  };

  const handleRagReexport = () => {
    triggerRagFileDownload(ragSelectedChunkSize);
    setShowRagModal(false);
  };

  /** Convert a Tiptap JSONContent node tree → plain text */
  function tiptapNodeToText(node: JSONContent): string {
    if (node.type === "text") return node.text ?? "";
    if (node.content) return node.content.map(tiptapNodeToText).join("");
    return "";
  }

  /** Convert a Tiptap JSONContent node tree → Markdown */
  function tiptapNodeToMarkdown(node: JSONContent): string {
    if (node.type === "text") {
      let text = node.text ?? "";
      const marks = node.marks ?? [];
      // Apply mark wrappers in correct order
      if (marks.some((m) => m.type === "highlight")) text = `==${text}==`;
      if (marks.some((m) => m.type === "bold")) text = `**${text}**`;
      if (marks.some((m) => m.type === "italic")) text = `*${text}*`;
      // Strip link marks — timestamps become plain text
      return text;
    }
    if (node.type === "paragraph") {
      const inner = (node.content ?? []).map(tiptapNodeToMarkdown).join("");
      return inner + "\n";
    }
    if (node.content) return node.content.map(tiptapNodeToMarkdown).join("");
    return "";
  }

  /** Download the *last saved* edited content as plain TXT (fetched from Supabase). */
  const handleDownloadEditedTxt = async () => {
    const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    try {
      const { data, error } = await supabase
        .from("transcripts")
        .select("edited_content")
        .eq("id", id)
        .single();
      if (error || !data?.edited_content) {
        setDownloadError("No saved edits found");
        return;
      }
      const json = data.edited_content as JSONContent;
      const text = (json.content ?? []).map(tiptapNodeToText).join("\n");
      downloadFile(text, `${safe}_edited.txt`, "text/plain");
    } catch (e) {
      console.error(e);
      setDownloadError("Failed to download Edited TXT");
    }
  };

  /** Download the *last saved* edited content as Markdown (fetched from Supabase). */
  const handleDownloadEditedMd = async () => {
    const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    try {
      const { data, error } = await supabase
        .from("transcripts")
        .select("edited_content")
        .eq("id", id)
        .single();
      if (error || !data?.edited_content) {
        setDownloadError("No saved edits found");
        return;
      }
      const json = data.edited_content as JSONContent;
      const md = `# ${title}\n\n` + (json.content ?? []).map(tiptapNodeToMarkdown).join("");
      downloadFile(md, `${safe}_edited.md`, "text/markdown");
    } catch (e) {
      console.error(e);
      setDownloadError("Failed to download Edited MD");
    }
  };

  const handleCopy = () => {
    const text = editor ? editor.getText() : "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    const { error } = await supabase
      .from("transcripts")
      .delete()
      .eq("id", id);
    if (error) {
      setDeleteError("Failed to delete transcript");
      setIsDeleting(false);
    } else {
      router.push("/dashboard/library");
    }
  };

  const handleSummarizeConfirm = async () => {
    setShowSummaryDialog(false);
    setIsSummarizing(true);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_id: id, user_id: user?.id })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error("Failed to parse response:", e);
        setSummarizeError("Server error: received invalid response.");
        setIsSummarizing(false);
        return;
      }

      if (!response.ok || !data.success) {
        setSummarizeError(data?.error || "Failed to generate summary");
        setIsSummarizing(false);
        return;
      }
      await refreshCredits();
      setSummarySuccess(true);
    } catch (error) {
      console.error("Summarize error:", error);
      setSummarizeError("Failed to summarize transcript");
    } finally {
      setIsSummarizing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-bg">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 pb-20 pt-2 space-y-4">
          {/* Toolbar — read tools, right-aligned; wraps on mobile so nothing falls off screen */}
          <div className="sticky top-0 z-10 -mx-6 lg:-mx-12 px-6 lg:px-12 bg-bg flex items-center justify-end gap-1 flex-wrap py-2 border-b border-border-subtle">
            {/* Find */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:text-fg" onClick={() => setShowSearch((s) => !s)} aria-label="Find" title="Find (Ctrl/Cmd+F)">
              <Search className="h-4 w-4" />
            </Button>

            {/* Display options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:text-fg" aria-label="Display options">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <Label htmlFor="ts-mode" className="text-sm">Timestamps</Label>
                  <Switch id="ts-mode" checked={showTimestamps} onCheckedChange={setShowTimestamps} />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Text size</DropdownMenuLabel>
                <div className="flex items-center gap-1 px-2 pb-1.5">
                  {(["s", "m", "l"] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setTextSize(sz)}
                      className={cn("flex-1 rounded-md border py-1 text-xs", textSize === sz ? "border-accent text-accent" : "border-border text-fg-muted hover:text-fg")}
                    >
                      {sz === "s" ? "Small" : sz === "m" ? "Default" : "Large"}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Copy — a core task, its own button */}
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-fg-muted hover:text-fg">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {hasSavedEdits && (
                  <>
                    <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Edited version</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleDownloadEditedTxt}>Edited — plain text (.txt)</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadEditedMd}>Edited — Markdown (.md)</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Text</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleDownload("txt")}>Plain text (.txt)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("txt-ts")}>Text + timestamps (.txt)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("md")}>Markdown (.md)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("md-ts")}>Markdown + timestamps (.md)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Data</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleDownload("json")}>JSON (.json)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("csv")}>CSV (.csv)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Subtitles</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleDownload("srt")}>SRT (.srt)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("vtt")}>VTT (.vtt)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Developer</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleRagMenuClick}>
                  RAG JSON
                  {(localRagExports?.length ?? 0) > 0 ? (
                    <span className="ml-auto text-[9px] font-bold rounded-full bg-teal-subtle text-teal px-1.5 py-0.5">PURCHASED</span>
                  ) : (
                    <span className="ml-auto text-[9px] font-bold rounded-full bg-warning-subtle text-warning px-1.5 py-0.5">PAID</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit routes to the Edited tab (in edit mode) — never edits the original in place. */}
            {isOriginalMode && (
              <Button size="sm" className="h-8 gap-1.5 px-3" onClick={() => router.push(`/dashboard/library/${id}?tab=edited`)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {isEditedMode && (
              <Button size="sm" className="h-8 gap-1.5 px-3" onClick={handleSave} disabled={isSaving || !editor || !isDirty}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </Button>
            )}

            {/* Overflow — rare & paid actions, so they never crowd the row on mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted hover:text-fg" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {hasVideo && (
                  <DropdownMenuItem asChild>
                    <a href={`https://youtu.be/${videoId}`} target="_blank" rel="noopener noreferrer">
                      <Play className="mr-2 h-4 w-4" /> Watch on YouTube
                    </a>
                  </DropdownMenuItem>
                )}
                {isOriginalMode && (
                  <DropdownMenuItem
                    disabled={isSummarizing || !user}
                    onClick={() => {
                      if (!user) { setSummarizeError("Please sign in to summarize."); return; }
                      if (credits !== null && credits < 3) { setSummarizeError("Not enough credits — you need 3 credits to generate a summary."); return; }
                      posthog.capture('summary_requested', { transcript_id: id });
                      setShowSummaryDialog(true);
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {aiSummary ? "Regenerate summary" : "Summarise"}
                    <span className="ml-auto text-xs text-fg-muted">3 credits</span>
                  </DropdownMenuItem>
                )}
                {hasSavedEdits && isEditedMode && (
                  <DropdownMenuItem onClick={() => editor?.commands.setContent(originalJSON)}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Revert to original
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-error focus:text-error focus:bg-error/10" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete transcript
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Video — zero pixels when closed; nocookie player, sticky under the tabs, when open.
              Only for YouTube sources; uploaded audio has no video to show. */}
          {hasVideo && (!showVideo ? (
            <button onClick={() => setShowVideo(true)} className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors" aria-label="Watch video">
              <Play className="h-4 w-4 fill-current" />
              Watch video
              {derivedDuration > 0 && <span className="text-fg-subtle tabular-nums font-mono text-xs">· {formatUITimestamp(derivedDuration).replace(/^00:/, "")}</span>}
              <span className="text-[10px] text-fg-subtle">(loads YouTube)</span>
            </button>
          ) : (
            <div className="sticky top-12 z-[9] space-y-1.5">
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-elevated">
                <NocookieYouTubePlayer ref={playerRef} videoId={videoId} className="h-full w-full" />
              </div>
              <button onClick={() => setShowVideo(false)} className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
                <ChevronUp className="h-3.5 w-3.5" /> Hide video
              </button>
            </div>
          ))}

                {/* Title lives in the page header (TranscriptHeader) — not repeated here. */}
                {contentSaveFeedback && (
                  <FeedbackCard
                    variant={contentSaveFeedback.type}
                    message={contentSaveFeedback.message}
                    onDismiss={() => setContentSaveFeedback(null)}
                  />
                )}
                {downloadError && (
                  <FeedbackCard
                    variant="error"
                    message={downloadError}
                    onDismiss={() => setDownloadError(null)}
                  />
                )}
                {deleteError && (
                  <FeedbackCard
                    variant="error"
                    message={deleteError}
                    onDismiss={() => setDeleteError(null)}
                  />
                )}
                {summarizeError && (
                  <FeedbackCard
                    variant="error"
                    message={
                      <>
                        {summarizeError}
                        {summarizeError.includes("credits") && (
                          <a href={marketingHref('/pricing')} className="ml-2 underline">Buy Credits →</a>
                        )}
                      </>
                    }
                    onDismiss={() => setSummarizeError(null)}
                  />
                )}

                {/* Search bar — toggled by the Find button */}
                {showSearch && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-fg-muted" />
                    <Input
                      autoFocus
                      placeholder="Search in transcript…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-bg border-border text-fg"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2 text-fg-muted hover:text-fg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {searchMatchesCount > 0 && (
                    <>
                      <span className="text-xs text-fg-muted whitespace-nowrap">
                        {currentMatchIdx + 1} / {searchMatchesCount}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMatch("prev")}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMatch("next")}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {searchQuery && searchMatchesCount === 0 && (
                    <span className="text-xs text-fg-muted whitespace-nowrap">No results</span>
                  )}
                </div>
                )}

                {/* Formatting toolbar (edit mode) */}
                {isEditedMode && (
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-border flex-wrap mb-4 bg-surface-elevated/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("bold") && "bg-accent text-fg-on-accent")}
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("italic") && "bg-accent text-fg-on-accent")}
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("underline") && "bg-accent text-fg-on-accent")}
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                      title="Underline"
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </Button>

                    <div className="h-5 w-px bg-border/80 mx-1" />

                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("bulletList") && "bg-accent text-fg-on-accent")}
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      title="Bullet List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("orderedList") && "bg-accent text-fg-on-accent")}
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      title="Numbered List"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Editor — max-w reading measure; timestamp clicks seek the in-app player */}
                <div
                  onClick={handleTranscriptClick}
                  className={cn(
                    "rounded-xl border border-border bg-surface p-5 min-h-[400px] [&_.ProseMirror]:max-w-[68ch]",
                    textSize === "s" && "[&_.ProseMirror]:text-sm",
                    textSize === "l" && "[&_.ProseMirror]:text-lg",
                    !showTimestamps && "hide-timestamps"
                  )}
                >
                  <EditorContent editor={editor} />
                </div>
        </div>
      </div>

      {/* ── ALERTS & DIALOGS ── */}
      <AlertDialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate AI Summary</AlertDialogTitle>
            <AlertDialogDescription>
              {aiSummary 
                ? "You already have a summary for this video. Regenerating will cost 3 credits and overwrite the current version. Continue?"
                : "Generating an AI Summary costs 3 credits. Would you like to proceed?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSummarizeConfirm}
              className="bg-warning hover:bg-warning/90 text-fg gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate Summary
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transcript</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transcript
              and all associated edits and summaries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-error text-error-foreground hover:bg-error/90 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── RAG EXPORT MODAL ── */}
      <Dialog open={showRagModal} onOpenChange={setShowRagModal}>
        <DialogContent className="max-w-md">
          {localRagExports.length > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle>Download RAG JSON</DialogTitle>
                <DialogDescription>
                  Choose a chunk size. Re-downloads are always free.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-2">
                {RAG_CHUNK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRagSelectedChunkSize(opt.value)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors",
                      ragSelectedChunkSize === opt.value
                        ? "border-primary/50 bg-accent/5 text-fg"
                        : "border-border hover:bg-surface-elevated/40 text-fg-muted"
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.sub}</span>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowRagModal(false)}>Cancel</Button>
                <Button onClick={handleRagReexport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Export RAG JSON</DialogTitle>
                <DialogDescription>
                  Exported as chunked JSON, ready for Pinecone, ChromaDB, and Weaviate. After this first export, all four chunk presets are free to re-download.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-2">
                {RAG_CHUNK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRagSelectedChunkSize(opt.value)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors",
                      ragSelectedChunkSize === opt.value
                        ? "border-primary/50 bg-accent/5 text-fg"
                        : "border-border hover:bg-surface-elevated/40 text-fg-muted"
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.sub}</span>
                  </button>
                ))}
              </div>
              {/* Cost breakdown — what it costs, your balance, what remains */}
              <div className="rounded-lg border border-border bg-surface-elevated/30 p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-fg-muted">This export</span>
                  <span className="font-semibold text-fg tabular-nums">{ragCost} credit{ragCost !== 1 ? "s" : ""}</span>
                </div>
                {credits !== null && (
                  <div className="flex items-center justify-between text-xs text-fg-muted">
                    <span>Balance</span>
                    <span className="tabular-nums">{credits} → {Math.max(0, credits - ragCost)} after</span>
                  </div>
                )}
                <p className="text-xs text-fg-muted pt-1 border-t border-border-subtle mt-1">
                  One-time — re-downloading any preset is free afterwards.
                </p>
              </div>
              {ragInsufficientCredits && (
                <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Not enough credits.</span>
                  <a href="/dashboard/credits" className="ml-auto font-medium underline hover:no-underline">Buy credits →</a>
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowRagModal(false)}>Cancel</Button>
                <Button onClick={handleRagFirstExport} disabled={ragExportLoading} className="gap-2">
                  {ragExportLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                  Export for {ragCost} credit{ragCost !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
