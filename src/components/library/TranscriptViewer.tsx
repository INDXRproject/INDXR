"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Copy,
  Trash2,
  ArrowLeft,
  Video,
  VideoOff,
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
  Save
} from "lucide-react";
import posthog from "posthog-js";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { JSONContent } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  generateTxt,
  generateSrt,
  generateVtt,
  generateCsv,
  generateMarkdown,
  decodeEntities,
  TranscriptItem,
} from "@/utils/formatTranscript";

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
                        style: `background-color:var(--color-warning);border-radius:2px;${
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

interface TranscriptViewerProps {
  id: string;
  transcript: TranscriptItem[];
  title: string;
  videoUrl: string;
  videoId: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  editedContent: JSONContent | null;
  aiSummary: JSONContent | null;
  viewedAt: string | null;
  mode: "original" | "edited";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUITimestamp(seconds: number): string {
  return new Date(seconds * 1000).toISOString().substr(11, 8);
}

function getEmbedUrl(url: string): string {
  try {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const id = url.includes("v=")
        ? url.split("v=")[1].split("&")[0]
        : url.split("/").pop();
      return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

/** Convert transcript array → Tiptap JSONContent document */
function transcriptToJSON(
  items: TranscriptItem[],
  videoId: string
): JSONContent {
  return {
    type: "doc",
    content: items.map((item) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [
            {
              type: "link",
              attrs: {
                href: `https://youtube.com/watch?v=${videoId}&t=${Math.floor(item.offset)}s`,
                target: "_blank",
                rel: "noopener noreferrer",
                class: "ts-link",
              },
            },
          ],
          text: `[${formatUITimestamp(item.offset)}]`,
        },
        { type: "text", text: ` ${item.text}` },
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
  editedContent,
  aiSummary,
  viewedAt,
  mode,
}: TranscriptViewerProps) {
  const router = useRouter();
  const supabase = createClient();
  const { user, credits, refreshCredits } = useAuth();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarySuccess, setSummarySuccess] = useState(false);

  // UI state
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditingOriginal, setIsEditingOriginal] = useState(false);

  // Title editing
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleIsSaving = useRef(false);

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
          console.log("View status update success:", data);
          // Notify library page so the NEW badge disappears immediately on back-navigation
          window.dispatchEvent(new CustomEvent('transcripts-updated'));
        }
      }
    };
    markAsViewed();
  }, [id, viewedAt, supabase]);

  // ── Tiptap editor ──────────────────────────────────────────────────────────

  // Initial content: original JSON or edited JSON based on mode
  const originalJSON = transcriptToJSON(transcript, videoId);
  const initialContent: JSONContent = isEditedMode && editedContent ? editedContent : originalJSON;

  const editor = useEditor({
    editable: isEditedMode || isEditingOriginal,
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
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] text-foreground/90 leading-relaxed",
          (!isEditedMode && !isEditingOriginal) && "read-only-mode" 
        )
      },
    },
    onUpdate: () => {
      setIsDirty(true);
    },
  }, [mode, isEditingOriginal, isEditedMode]); // Reinitialize if mode or editing state changes

  // Synchronize editor editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditedMode || isEditingOriginal);
    }
  }, [editor, isEditedMode, isEditingOriginal]);

  // ── Title save ─────────────────────────────────────────────────────────────

  const handleTitleBlur = useCallback(async () => {
    setIsEditingTitle(false);
    if (titleIsSaving.current) return;
    titleIsSaving.current = true;
    const { error } = await supabase
      .from("transcripts")
      .update({ title })
      .eq("id", id);
    titleIsSaving.current = false;
    if (error) toast.error("Failed to save title");
    else toast.success("Title saved");
  }, [id, supabase, title]);

  // ── Explicit Save ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editor) return;

    const json = editor.getJSON();
    // Guard against empty doc (no content or all empty paragraphs)
    const plainText = editor.getText().trim();
    if (!plainText) {
      toast.error(
        "Cannot save empty transcript. Use Reset to restore the original."
      );
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("transcripts")
      .update({ edited_content: json })
      .eq("id", id);
    setIsSaving(false);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      setIsDirty(false);
      setHasSavedEdits(true);
      setIsEditingOriginal(false);
      toast.success("Saved!");
      // If we are saving an unsaved edit, reload cleanly to '?tab=edited'
      if (!isEditedMode) {
        router.replace(`?tab=edited`);
      }
    }
  }, [editor, id, supabase, router, isEditedMode]);

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
    const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
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
              metadata: { title, videoUrl, extractedAt: new Date().toISOString() },
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
        downloadFile(generateSrt(transcript), `${safe}.srt`, "text/plain");
      else if (format === "vtt")
        downloadFile(generateVtt(transcript), `${safe}.vtt`, "text/vtt");
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to download ${format.toUpperCase()}`);
    }
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
        toast.error("No saved edits found");
        return;
      }
      const json = data.edited_content as JSONContent;
      const text = (json.content ?? []).map(tiptapNodeToText).join("\n");
      downloadFile(text, `${safe}_edited.txt`, "text/plain");
      toast.success("Downloaded Edited TXT");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download Edited TXT");
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
        toast.error("No saved edits found");
        return;
      }
      const json = data.edited_content as JSONContent;
      const md = `# ${title}\n\n` + (json.content ?? []).map(tiptapNodeToMarkdown).join("");
      downloadFile(md, `${safe}_edited.md`, "text/markdown");
      toast.success("Downloaded Edited MD");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download Edited MD");
    }
  };

  const handleCopy = () => {
    const text = editor ? editor.getText() : "";
    navigator.clipboard.writeText(text);
    toast.success("Transcript copied to clipboard");
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    const { error } = await supabase
      .from("transcripts")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete transcript");
      setIsDeleting(false);
    } else {
      toast.success("Transcript deleted");
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
        toast.error("Server error: received invalid response.");
        setIsSummarizing(false);
        return;
      }

      if (!response.ok || !data.success) {
        toast.error(data?.error || "Failed to generate summary");
        setIsSummarizing(false);
        return;
      }
      await refreshCredits();
      setSummarySuccess(true);
    } catch (error) {
      console.error("Summarize error:", error);
      toast.error("Failed to summarize transcript");
    } finally {
      setIsSummarizing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row overflow-hidden bg-background">
        {/* ── VIDEO SIDEBAR ── */}
        <div
          className={cn(
            "border-r bg-muted/10 shrink-0 transition-all duration-300 ease-in-out flex flex-col",
            showVideo
              ? "w-full lg:w-[400px] xl:w-[480px]"
              : "w-0 border-r-0 overflow-hidden"
          )}
        >
          <div className="w-[400px] xl:w-[480px] flex flex-col h-full">
            <div className="p-4 border-b flex items-center gap-2">
              <Link href="/dashboard/library">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="font-semibold text-sm truncate flex-1">{title}</h1>
              <Button variant="ghost" size="sm" onClick={() => setShowVideo(false)}>
                <VideoOff className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video w-full bg-muted shrink-0">
              {showVideo && (
                <iframe
                  src={getEmbedUrl(videoUrl)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                {channelTitle && (
                  <p className="text-sm text-muted-foreground">{channelTitle}</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* ── MAIN EDITOR ── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          {/* Top action bar */}
          <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-background z-10">
            <div className="flex items-center gap-3">
              {!showVideo && (
                <div className="flex items-center gap-2">
                  <Link href="/dashboard/library">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideo(true)}
                    className="gap-2 h-8 hover:bg-[var(--accent)] hover:text-white transition-all duration-150"
                  >
                    <Video className="h-4 w-4" />
                    <span className="hidden sm:inline">Show Video</span>
                  </Button>
                </div>
              )}
              <div className="flex items-center space-x-2 border-l pl-3">
                <Switch
                  id="ts-mode"
                  checked={showTimestamps}
                  onCheckedChange={setShowTimestamps}
                />
                <Label htmlFor="ts-mode" className="text-sm font-medium">
                  Timestamps
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Summarize is strictly bound to the Original tab */}
              {isOriginalMode && (
                summarySuccess ? (
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-xs font-medium text-green-500 mr-1 hidden sm:inline">Summary ready!</span>
                    <Button
                      size="sm"
                      className="h-8 text-xs px-3 bg-[var(--color-warning)] text-white hover:bg-[var(--color-warning-hover)] border border-[var(--color-warning-border)]"
                      onClick={() => {
                        router.replace(`?tab=summary`);
                      }}
                    >
                      View Summary
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-3 text-xs font-medium hover:bg-[var(--accent)] hover:text-white mr-2 transition-all duration-150 border border-border"
                    disabled={isSummarizing || !user}
                    onClick={() => {
                      if (!user) {
                        toast.error("Please sign in to summarize.");
                        return;
                      }
                      if (credits !== null && credits < 3) {
                        toast.error(
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm">Not enough credits</span>
                            <span className="text-xs">You need 3 credits to generate a summary.</span>
                            <Link href="/pricing" className="text-primary hover:underline text-xs mt-1">
                              Buy Credits →
                            </Link>
                          </div>
                        );
                        return;
                      }

                      posthog.capture('summary_requested', { transcript_id: id })
                      setShowSummaryDialog(true);
                    }}
                  >
                    {isSummarizing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiSummary ? "Regenerate Summary" : "Summarize"}
                  </Button>
                )
              )}

              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 hover:bg-[var(--accent)] hover:text-white transition-all duration-150">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Export As…</DropdownMenuLabel>
                  {hasSavedEdits && (
                    <>
                      <DropdownMenuItem onClick={handleDownloadEditedTxt}>
                        Edited TXT ✏️
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadEditedMd}>
                        Edited MD ✏️
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Text</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleDownload("txt")}>TXT — plain text</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("txt-ts")}>TXT — with timestamps</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("md")}>Markdown</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("md-ts")}>Markdown — with timestamps</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Data</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleDownload("json")}>JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("csv")}>CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Subtitles</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleDownload("srt")}>SRT</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("vtt")}>VTT</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive font-medium focus:text-destructive focus:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Transcript
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Edit button logic for Original tab */}
              {isOriginalMode && !hasSavedEdits && !isEditingOriginal && (
                <>
                  <div className="h-5 w-px bg-border mx-1" />
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 px-3"
                    onClick={() => setIsEditingOriginal(true)}
                  >
                    Edit
                  </Button>
                </>
              )}

              {/* Save/Cancel logic for active editing */}
              {(isEditedMode || isEditingOriginal) && (
                <>
                  <div className="h-5 w-px bg-border mx-1" />
                  {isEditingOriginal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 mr-1"
                      onClick={() => {
                        setIsEditingOriginal(false);
                        setIsDirty(false);
                        editor?.commands.setContent(originalJSON);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 px-3"
                    onClick={handleSave}
                    disabled={isSaving || !editor || !isDirty}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 w-full overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="max-w-3xl mx-auto px-6 lg:px-12 pb-20 pt-8 space-y-6">

                {/* Editable title */}
                <div className="flex items-start gap-2">
                  {isEditingTitle ? (
                    <input
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape")
                          e.currentTarget.blur();
                      }}
                      className="flex-1 text-2xl font-bold bg-transparent border-b-2 border-primary outline-none text-foreground"
                    />
                  ) : (
                    <h1
                      className="flex-1 text-2xl font-bold text-foreground cursor-pointer hover:text-foreground/80 transition-colors"
                      onClick={() => setIsEditingTitle(true)}
                      title="Click to edit title"
                    >
                      {title}
                    </h1>
                  )}
                </div>

                {/* AI Summary card replaced by bottom section */}

                {/* Search bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search in transcript…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-background border-input text-foreground"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {searchMatchesCount > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
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
                    <span className="text-xs text-muted-foreground whitespace-nowrap">No results</span>
                  )}
                </div>

                {/* Toolbar */}
                {(isEditedMode || isEditingOriginal) && (
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-border flex-wrap mb-4 bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("bold") && "bg-accent text-accent-foreground")}
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("italic") && "bg-accent text-accent-foreground")}
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("underline") && "bg-accent text-accent-foreground")}
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                      title="Underline"
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </Button>

                    <div className="h-5 w-px bg-border/80 mx-1" />

                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("bulletList") && "bg-accent text-accent-foreground")}
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      title="Bullet List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-8 p-0", editor?.isActive("orderedList") && "bg-accent text-accent-foreground")}
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      title="Numbered List"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Editor */}
                <div
                  className={cn(
                    "rounded-xl border border-border bg-card p-5 min-h-[400px]",
                    !showTimestamps && "hide-timestamps"
                  )}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </ScrollArea>
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
              className="bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-white gap-2"
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
