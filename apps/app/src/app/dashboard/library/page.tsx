"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@indxr/shared/components/ui/button";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { DashboardBackdrop } from "@indxr/shared/components/DashboardBackdrop";
import { TranscriptList, Transcript } from "@/components/library/TranscriptList";
import { LibraryControls, Collection, Density } from "@/components/library/LibraryControls";
import {
  parseFilters,
  applyLibraryFilters,
  applyLibrarySort,
  filterChips,
  isNarrowed,
  FILTER_PARAMS,
  HasKey,
} from "@/components/library/filters";

// Columns the list actually renders — never the heavy `transcript` jsonb (that lives on the
// base table). Read from the `transcripts_list` view (security_invoker), which adds the cheap
// has_* presence booleans.
const LIST_COLUMNS =
  "id, title, video_id, created_at, duration, character_count, processing_method, collection_id, viewed_at, channel, has_summary, has_summary_edit, has_edit, has_rag";

const DEFAULT_PAGE_SIZE = 50;

// Compact page list: first, last, current ±1, ellipses for larger gaps.
function paginationRange(current: number, total: number): (number | "ellipsis")[] {
  const shown = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < shown.length; i++) {
    out.push(shown[i]);
    if (i < shown.length - 1) {
      const gap = shown[i + 1] - shown[i];
      if (gap === 2) out.push(shown[i] + 1);
      else if (gap > 2) out.push("ellipsis");
    }
  }
  return out;
}

function LibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCollectionId = searchParams.get("collection"); // null = All Transcripts

  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Search box is controlled locally and debounced into the URL (?q=).
  const [searchValue, setSearchValue] = useState(filters.q);

  // Density is a personal UI preference, not shareable → localStorage.
  const [density, setDensity] = useState<Density>("default");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("library-density") : null;
    if (saved === "compact" || saved === "default") setDensity(saved);
  }, []);
  const changeDensity = (d: Density) => {
    setDensity(d);
    if (typeof window !== "undefined") localStorage.setItem("library-density", d);
  };

  // ── Pagination — URL-backed (?page=N), page=1 = param absent ────────────────
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const supabase = createClient();

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const rangeFrom = (page - 1) * pageSize;

  // Write params, always resetting to page 1 (any filter/sort/search change invalidates paging).
  const updateParams = useCallback(
    (mut: Record<string, string | null>, opts?: { replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(mut)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      params.delete("page");
      const qs = params.toString();
      const url = `/dashboard/library${qs ? `?${qs}` : ""}`;
      if (opts?.replace) router.replace(url);
      else router.push(url);
    },
    [searchParams, router],
  );

  const goToPage = useCallback(
    (n: number, opts?: { replace?: boolean }) => {
      const next = Math.max(1, n);
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) params.delete("page");
      else params.set("page", String(next));
      const qs = params.toString();
      const url = `/dashboard/library${qs ? `?${qs}` : ""}`;
      if (opts?.replace) router.replace(url);
      else router.push(url);
    },
    [searchParams, router],
  );

  const toggleHas = (k: HasKey) => {
    const next = filters.has.includes(k) ? filters.has.filter((h) => h !== k) : [...filters.has, k];
    updateParams({ has: next.length ? next.join(",") : null });
  };

  const clearFilter = (param: string, value?: string) => {
    if (param === "has" && value) {
      const next = filters.has.filter((h) => h !== value);
      updateParams({ has: next.length ? next.join(",") : null });
    } else {
      updateParams({ [param]: null });
    }
  };

  const clearAllFilters = () => {
    const mut: Record<string, string | null> = {};
    for (const p of FILTER_PARAMS) mut[p] = null;
    mut.q = null;
    updateParams(mut);
    setSearchValue("");
  };

  // Debounce the search box → ?q=. Reset to page 1 handled by updateParams.
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchValue !== filters.q) updateParams({ q: searchValue || null }, { replace: true });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // Keep the box in sync when the URL changes elsewhere (e.g. Clear all, back button).
  useEffect(() => {
    setSearchValue(filters.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  // Server-side fetch — filter/sort/paginate over the whole set in Postgres.
  const fetchTranscripts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("transcripts_list").select(LIST_COLUMNS, { count: "exact" });
      if (selectedCollectionId) query = query.eq("collection_id", selectedCollectionId);
      query = applyLibraryFilters(query, filters, new Date());
      query = applyLibrarySort(query, filters);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      setTranscripts((data ?? []) as unknown as Transcript[]);
      setFilteredCount(count ?? 0);
    } catch (err) {
      console.error("Error fetching library:", err);
      setListError("Failed to load library. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedCollectionId, filters, page, pageSize]);

  useEffect(() => {
    fetchTranscripts();
  }, [fetchTranscripts]);

  // Unfiltered total for the "N of TOTAL" header (scoped to the current collection).
  const fetchTotal = useCallback(async () => {
    let q = supabase.from("transcripts_list").select("id", { count: "exact", head: true });
    if (selectedCollectionId) q = q.eq("collection_id", selectedCollectionId);
    const { count } = await q;
    setTotalCount(count ?? 0);
  }, [supabase, selectedCollectionId]);

  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  // Clamp page if deletes/filters shrink the set below the current page.
  useEffect(() => {
    if (page > totalPages) goToPage(totalPages, { replace: true });
  }, [page, totalPages, goToPage]);

  const loadCollections = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("collections").select("id, name").eq("user_id", user.id);
    if (data) setCollections(data);
  }, [supabase]);

  // Load collections + persisted page-size once.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [colRes, profRes] = await Promise.all([
        supabase.from("collections").select("id, name").eq("user_id", user.id),
        supabase.from("profiles").select("library_page_size").eq("id", user.id).single(),
      ]);
      if (colRes.data) setCollections(colRes.data);
      const size = (profRes.data as { library_page_size?: number } | null)?.library_page_size;
      if (size && size !== pageSize) setPageSize(size);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when a drop/rename/move/create elsewhere changes the set.
  useEffect(() => {
    const handler = () => {
      fetchTranscripts();
      fetchTotal();
      loadCollections();
    };
    window.addEventListener("transcripts-updated", handler);
    return () => window.removeEventListener("transcripts-updated", handler);
  }, [fetchTranscripts, fetchTotal, loadCollections]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transcripts").delete().eq("id", id);
      if (error) throw error;
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
      setFilteredCount((prev) => Math.max(0, prev - 1));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch {
      setListError("Failed to delete transcript");
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase.from("transcripts").update({ title: newTitle }).eq("id", id);
      if (error) throw error;
      setTranscripts((prev) => prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t)));
    } catch {
      setListError("Failed to rename transcript");
    }
  };

  // Move (single or bulk) — collection_id is one nullable uuid, so this replaces.
  const handleMove = async (ids: string[], collectionId: string | null) => {
    const { error } = await supabase.from("transcripts").update({ collection_id: collectionId }).in("id", ids);
    if (error) {
      setListError("Failed to move transcripts");
      return;
    }
    setTranscripts((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, collection_id: collectionId } : t)));
    window.dispatchEvent(new CustomEvent("transcripts-updated"));
  };

  const selectCollection = (id: string | null) => {
    router.push(id ? `/dashboard/library?collection=${id}` : "/dashboard/library");
  };

  const selectedCollectionName = selectedCollectionId
    ? collections.find((c) => c.id === selectedCollectionId)?.name ?? "Collection"
    : null;

  const chips = filterChips(filters);
  const narrowed = isNarrowed(filters);
  const pageTitle = selectedCollectionName ?? "Library";

  return (
    <DashboardBackdrop>
      <div className="flex flex-col min-h-full">
        <div className="flex flex-col flex-1 space-y-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <h1 className="text-2xl font-semibold text-fg wrap-break-word">
              {pageTitle}
              <span className="text-fg-muted font-normal text-base ml-2.5 whitespace-nowrap tabular-nums">
                · {narrowed ? `${filteredCount} of ${totalCount}` : totalCount}
                {" "}transcript{(narrowed ? totalCount : totalCount) !== 1 ? "s" : ""}
              </span>
            </h1>
          </div>

          {/* Toolbar — search, filters, sort, density (desktop) + mobile trigger row + sheets */}
          <LibraryControls
            filters={filters}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSetParam={updateParams}
            onToggleHas={toggleHas}
            density={density}
            onDensityChange={changeDensity}
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={selectCollection}
          />

          {/* Active filter chips */}
          {(chips.length > 0 || selectedCollectionId) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {selectedCollectionId && (
                <button
                  onClick={() => selectCollection(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated pl-3 pr-2 py-1 text-xs text-fg-subtle hover:text-fg hover:border-border-strong transition-colors duration-150 cursor-pointer"
                >
                  Collection: <span className="font-medium text-fg" dir="auto">{selectedCollectionName}</span>
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => chip.clear.forEach((c) => clearFilter(c.param, c.value))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface pl-3 pr-2 py-1 text-xs text-fg-subtle hover:text-fg hover:border-border-strong transition-colors duration-150 cursor-pointer"
                >
                  {chip.label}
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              ))}
              {(chips.length > 0 || filters.q) && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-fg-muted hover:text-fg transition-colors cursor-pointer px-1.5 py-1"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {listError && (
            <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error mb-4">
              {listError}
              <button
                onClick={() => setListError(null)}
                className="ml-auto opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
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
                onMove={handleMove}
                density={density}
                collections={collections}
                narrowed={narrowed}
                onClearFilters={clearAllFilters}
              />

              {filteredCount > pageSize && (
                <div className="mt-5 mb-3 sm:mb-0 flex items-center justify-between gap-4 text-sm text-fg-muted flex-wrap">
                  <span className="tabular-nums">
                    {rangeFrom + 1}–{Math.min(rangeFrom + pageSize, filteredCount)} of {filteredCount}
                  </span>
                  <nav className="flex items-center gap-1" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {paginationRange(page, totalPages).map((item, i) =>
                      item === "ellipsis" ? (
                        <span key={`e${i}`} className="px-1.5 text-fg-muted select-none">
                          …
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={item === page ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8 tabular-nums"
                          onClick={() => goToPage(item)}
                          aria-label={`Page ${item}`}
                          aria-current={item === page ? "page" : undefined}
                        >
                          {item}
                        </Button>
                      ),
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardBackdrop>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
