"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
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
import { Search, LayoutGrid, List as ListIcon, Loader2, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { TranscriptList, Transcript } from "@/components/library/TranscriptList";
import { cn } from "@indxr/shared/lib/utils";

interface Collection {
  id: string;
  name: string;
}

type SortBy = "date" | "duration" | "title";

const DEFAULT_PAGE_SIZE = 50;

// Inner component reads searchParams
function LibraryContent() {
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const selectedCollectionId = searchParams.get("collection"); // null = All Transcripts

  const [transcripts, setTranscripts]     = useState<Transcript[]>([]);
  const [collections, setCollections]     = useState<Collection[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode]           = useState<"grid" | "list">("list");
  const [sortBy, setSortBy]               = useState<SortBy>("date");
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [listError, setListError]         = useState<string | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);

  const supabase = createClient();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeFrom  = (page - 1) * pageSize;

  // Debounce the search box → server query. Reset to page 1 when the term settles.
  useEffect(() => {
    const id = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Switching collection resets to the first page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [selectedCollectionId]);

  // Server-side page fetch — filter (collection + search), sort and paginate
  // run over the FULL dataset in Postgres, not just the loaded rows.
  const fetchTranscripts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("transcripts").select("*", { count: "exact" });

      if (selectedCollectionId) query = query.eq("collection_id", selectedCollectionId);

      const q = debouncedSearch.trim().replace(/[%,()]/g, " ").trim();
      if (q) query = query.or(`title.ilike.%${q}%,video_id.ilike.%${q}%`);

      if (sortBy === "duration")      query = query.order("duration", { ascending: false, nullsFirst: false });
      else if (sortBy === "title")    query = query.order("title", { ascending: true });
      else                            query = query.order("created_at", { ascending: false });

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      setTranscripts((data ?? []) as Transcript[]);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error("Error fetching library:", err);
      setListError("Failed to load library. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedCollectionId, debouncedSearch, sortBy, page, pageSize]);

  useEffect(() => { fetchTranscripts(); }, [fetchTranscripts]);

  // Clamp page if deletes shrink the set below the current page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Load collections + persisted page-size preference once.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [colRes, profRes] = await Promise.all([
        supabase.from("collections").select("id, name").eq("user_id", user.id),
        supabase.from("profiles").select("library_page_size").eq("id", user.id).single(),
      ]);
      if (colRes.data) setCollections(colRes.data);
      const size = (profRes.data as { library_page_size?: number } | null)?.library_page_size;
      if (size && size !== pageSize) { setPageSize(size); setPage(1); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch current page when a drop/rename elsewhere changes the set.
  useEffect(() => {
    const handler = () => fetchTranscripts();
    window.addEventListener("transcripts-updated", handler);
    return () => window.removeEventListener("transcripts-updated", handler);
  }, [fetchTranscripts]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transcripts").delete().eq("id", id);
      if (error) throw error;
      setTranscripts(prev => prev.filter(t => t.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
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

  const handleSortChange = (v: SortBy) => { setSortBy(v); setPage(1); };

  // Bug 4: Resolve collected name for page title display
  const selectedCollectionName = selectedCollectionId
    ? collections.find(c => c.id === selectedCollectionId)?.name ?? "Collection"
    : null;

  const pageTitle = selectedCollectionName ? selectedCollectionName : "Library";
  const pageSubtitle = `${totalCount} transcript${totalCount !== 1 ? "s" : ""}`;

  return (
    <div className="relative flex flex-col min-h-full">
      {/* Subtle honeycomb page-background texture — behind the content, not in the rows */}
      <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />

      <div className="relative flex flex-col flex-1 space-y-0">
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
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => handleSortChange(v as SortBy)}>
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
        {debouncedSearch && (
          <p className="text-sm text-fg-muted mb-4">
            Searching for &ldquo;{debouncedSearch}&rdquo;
          </p>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
          </div>
        ) : (
          <>
            <TranscriptList
              transcripts={transcripts}
              onDelete={handleDelete}
              onRename={handleRename}
              viewMode={viewMode}
              showThumbnails={showThumbnails}
              collections={collections}
            />

            {/* Pagination — server-side, works over the whole filtered dataset */}
            {totalCount > pageSize && (
              <div className="mt-5 flex items-center justify-between gap-4 text-sm text-fg-muted">
                <span className="tabular-nums">
                  {rangeFrom + 1}–{Math.min(rangeFrom + pageSize, totalCount)} of {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="tabular-nums px-1">Page {page} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
