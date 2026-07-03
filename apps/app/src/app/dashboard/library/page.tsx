"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@indxr/shared/components/ui/input";
import { Button } from "@indxr/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@indxr/shared/components/ui/dropdown-menu";
import { Search, LayoutGrid, List as ListIcon, Loader2, SlidersHorizontal, X } from "lucide-react";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { TranscriptList, Transcript } from "@/components/library/TranscriptList";
import { cn } from "@indxr/shared/lib/utils";

interface Collection {
  id: string;
  name: string;
}

type SortBy = "date" | "duration" | "title";

// Inner component reads searchParams
function LibraryContent() {
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const selectedCollectionId = searchParams.get("collection"); // null = All Transcripts

  const [transcripts, setTranscripts]     = useState<Transcript[]>([]);
  const [collections, setCollections]     = useState<Collection[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState("");
  const [viewMode, setViewMode]           = useState<"grid" | "list">("list");
  const [sortBy, setSortBy]               = useState<SortBy>("date");
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [listError, setListError]         = useState<string | null>(null);

  const supabase = createClient();

  // Fetch transcripts + collections together
  const fetchTranscripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [txResult, colResult] = await Promise.all([
        supabase.from("transcripts").select("*").order("created_at", { ascending: false }),
        supabase.from("collections").select("id, name").eq("user_id", user.id),
      ]);
      if (txResult.error) throw txResult.error;
      setTranscripts(txResult.data ?? []);
      if (colResult.data) setCollections(colResult.data);
    } catch (err) {
      console.error("Error fetching library:", err);
      setListError("Failed to load library. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTranscripts(); }, []);

  // Bug 2 + 3: Listen for transcripts-updated events dispatched by sidebar drop or TranscriptViewer
  useEffect(() => {
    const handler = () => fetchTranscripts();
    window.addEventListener("transcripts-updated", handler);
    return () => window.removeEventListener("transcripts-updated", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transcripts").delete().eq("id", id);
      if (error) throw error;
      setTranscripts(prev => prev.filter(t => t.id !== id));
    } catch {
      setListError("Failed to delete transcript");
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("transcripts").update({ title: newTitle }).eq("id", id);
      if (error) throw error;
      setTranscripts(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
    } catch {
      setListError("Failed to rename transcript");
    }
  };

  // Filter: collection, then search, then sort
  const filteredTranscripts = useMemo(() => {
    let list = selectedCollectionId === null
      ? transcripts
      : transcripts.filter(t => t.collection_id === selectedCollectionId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          (t.title?.toLowerCase() ?? "").includes(q) ||
          (t.video_id?.toLowerCase() ?? "").includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === "duration") {
      sorted.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
    } else if (sortBy === "title") {
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [transcripts, selectedCollectionId, searchQuery, sortBy]);

  // Bug 4: Resolve collected name for page title display
  const selectedCollectionName = selectedCollectionId
    ? collections.find(c => c.id === selectedCollectionId)?.name ?? "Collection"
    : null;

  const pageTitle = selectedCollectionName ? selectedCollectionName : "Library";
  const pageSubtitle = `${filteredTranscripts.length} transcript${filteredTranscripts.length !== 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col h-full space-y-0">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-fg wrap-break-word">
          {pageTitle}
          <span className="text-fg-muted font-normal text-base ml-2.5 whitespace-nowrap">
            · {pageSubtitle}
          </span>
        </h1>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
            <Input
              placeholder="Search…"
              className="pl-8 h-9 rounded-lg border-border bg-surface text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle transition-all duration-150"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 bg-surface">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-md transition-colors duration-150", viewMode === "list" ? "bg-accent text-fg-on-accent hover:bg-accent hover:text-fg-on-accent" : "text-fg-muted hover:text-fg")}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-md transition-colors duration-150", viewMode === "grid" ? "bg-accent text-fg-on-accent hover:bg-accent hover:text-fg-on-accent" : "text-fg-muted hover:text-fg")}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Display options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border border-border text-fg-muted hover:text-fg" aria-label="Display options">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-fg-muted font-normal">Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="duration">Duration</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={showThumbnails} onCheckedChange={setShowThumbnails}>
                Show thumbnails
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Collection filter-context bar */}
      {selectedCollectionId && (
        <div className="mb-4">
          <button
            onClick={() => router.push("/dashboard/library")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated pl-3 pr-2 py-1 text-xs text-fg-subtle hover:text-fg hover:border-border-strong transition-colors duration-150 cursor-pointer"
          >
            Collection: <span className="font-medium text-fg">{selectedCollectionName}</span>
            <X className="h-3 w-3 ml-0.5" />
          </button>
        </div>
      )}

      {listError && (
        <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error mb-4">
          {listError}
          <button onClick={() => setListError(null)} className="ml-auto opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* Count label with search context */}
      {searchQuery && (
        <p className="text-sm text-fg-muted mb-4">
          Searching for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
        </div>
      ) : (
        <TranscriptList
          transcripts={filteredTranscripts}
          onDelete={handleDelete}
          onRename={handleRename}
          viewMode={viewMode}
          showThumbnails={showThumbnails}
          collections={collections}
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    // useSearchParams requires Suspense boundary in Next.js 14 app router
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-fg-muted" /></div>}>
      <LibraryContent />
    </Suspense>
  );
}
