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
  Highlighter,
  Sparkles,
  Search,
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  generateTxt,
  generateSrt,
  generateVtt,
  generateCsv,
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
                        style: `background-color:#facc15;border-radius:2px;${
                          isCurrent ? "outline:2px solid #f97316;" : ""
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

// ─── Save indicator ───────────────────────────────────────────────────────────

function UnsavedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500 ring-1 ring-amber-500/30">
      Unsaved changes
    </span>
  );
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
}: TranscriptViewerProps) {
  const router = useRouter();
  const supabase = createClient();

  // UI state
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Title editing
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleIsSaving = useRef(false);

  // Editor dirty state
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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

  // Initial content: use saved JSON if present, else build from transcript array
  const originalJSON = transcriptToJSON(transcript, videoId);
  const initialContent: JSONContent = editedContent ?? originalJSON;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
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
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] text-foreground/90 leading-relaxed",
      },
    },
    onUpdate: () => {
      setIsDirty(true);
    },
  });

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
      toast.success("Saved!");
    }
  }, [editor, id, supabase]);

  // ── Reset to original ──────────────────────────────────────────────────────

  const handleReset = useCallback(async () => {
    if (
      !confirm(
        "Are you sure? This will discard all your edits and restore the original transcript."
      )
    )
      return;

    setIsResetting(true);
    // Clear edited_content in DB (set to null)
    const { error } = await supabase
      .from("transcripts")
      .update({ edited_content: null })
      .eq("id", id);

    if (error) {
      toast.error("Failed to reset transcript");
      setIsResetting(false);
      return;
    }

    // Restore original content in editor
    editor?.commands.setContent(originalJSON);
    setIsDirty(false);
    setHasSavedEdits(false);
    setIsResetting(false);
    toast.success("Transcript restored to original");
  }, [editor, id, originalJSON, supabase]);

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

  const handleDownload = (format: "txt" | "json" | "srt" | "vtt" | "csv") => {
    const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    try {
      if (format === "txt")
        downloadFile(
          generateTxt(transcript, title, videoUrl, showTimestamps),
          `${safe}.txt`,
          "text/plain"
        );
      else if (format === "json")
        downloadFile(
          JSON.stringify(
            {
              metadata: { title, videoUrl, extractedAt: new Date().toISOString() },
              transcript,
            },
            null,
            2
          ),
          `${safe}.json`,
          "application/json"
        );
      else if (format === "csv")
        downloadFile(
          generateCsv(transcript, title, videoUrl),
          `${safe}.csv`,
          "text/csv"
        );
      else if (format === "srt")
        downloadFile(
          generateSrt(transcript, title, videoUrl),
          `${safe}.srt`,
          "text/plain"
        );
      else if (format === "vtt")
        downloadFile(
          generateVtt(transcript, title, videoUrl),
          `${safe}.vtt`,
          "text/vtt"
        );
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this transcript?")) return;
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <style>{`
        .ts-link {
          font-family: monospace;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          text-decoration: none;
          opacity: 0.6;
          margin-right: 0.25rem;
          transition: opacity 0.15s;
        }
        .ts-link:hover { opacity: 1; text-decoration: underline; color: hsl(var(--primary)); }
        .hide-timestamps .ts-link { display: none; }
        .ProseMirror p { margin-bottom: 0.5rem; }
        .ProseMirror:focus { outline: none; }
      `}</style>

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
          <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur z-10">
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
                    className="gap-2 h-8"
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
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                  <DropdownMenuItem onClick={() => handleDownload("txt")}>Text File (.txt)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("json")}>JSON (.json)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("csv")}>CSV (.csv)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDownload("srt")}>SRT Subtitles</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("vtt")}>VTT Subtitles</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Transcript
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

                {/* AI Summary card — placeholder for coming-soon */}
                {aiSummary && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      AI Summary
                    </div>
                    <ul className="space-y-1.5">
                      {Array.isArray((aiSummary as JSONContent).content)
                        ? ((aiSummary as JSONContent).content ?? []).map((node, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span>
                                {node.content
                                  ?.map((c: JSONContent) => c.text)
                                  .join("") ?? ""}
                              </span>
                            </li>
                          ))
                        : null}
                    </ul>
                  </div>
                )}

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
                <div className="flex items-center gap-1 p-1.5 rounded-lg border border-border bg-muted/30 flex-wrap">
                  {/* Formatting */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0", editor?.isActive("bold") && "bg-accent text-accent-foreground")}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0", editor?.isActive("italic") && "bg-accent text-accent-foreground")}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0", editor?.isActive("highlight") && "bg-accent text-accent-foreground")}
                    onClick={() => editor?.chain().focus().toggleHighlight({ color: "#facc15" }).run()}
                    title="Highlight"
                  >
                    <Highlighter className="h-3.5 w-3.5" />
                  </Button>

                  <div className="h-5 w-px bg-border mx-1" />

                  {/* AI Summarize — coming soon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-3 text-xs font-medium opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                          Summarize
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Coming soon</TooltipContent>
                  </Tooltip>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Unsaved badge */}
                  {isDirty && <UnsavedBadge />}

                  <div className="h-5 w-px bg-border mx-1" />

                  {/* Reset */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-destructive"
                        onClick={handleReset}
                        disabled={isResetting}
                      >
                        {isResetting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Reset
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Restore original transcript</TooltipContent>
                  </Tooltip>

                  {/* Save */}
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 px-3 text-xs"
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>

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
    </TooltipProvider>
  );
}
