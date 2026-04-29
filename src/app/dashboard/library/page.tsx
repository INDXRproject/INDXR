"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, List as ListIcon, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { TranscriptList, Transcript } from "@/components/library/TranscriptList";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
}

// Inner component reads searchParams
function LibraryContent() {
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const selectedCollectionId = searchParams.get("collection"); // null = All Transcripts

  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode]       = useState<"grid" | "list">("list");

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
      toast.error("Failed to load library");
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
      toast.success("Transcript deleted");
    } catch {
      toast.error("Failed to delete transcript");
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("transcripts").update({ title: newTitle }).eq("id", id);
      if (error) throw error;
      setTranscripts(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
    } catch {
      toast.error("Failed to rename transcript");
    }
  };

  // Filter: collection, then search
  const filteredTranscripts = useMemo(() => {
    let list = selectedCollectionId === null
      ? transcripts
      : transcripts.filter(t => t.collection_id === selectedCollectionId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          (t.title?.toLowerCase() ?? "").includes(q) ||
          t.video_id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transcripts, selectedCollectionId, searchQuery]);

  // Bug 4: Resolve collected name for page title display
  const selectedCollectionName = selectedCollectionId
    ? collections.find(c => c.id === selectedCollectionId)?.name ?? "Collection"
    : null;

  const pageTitle = selectedCollectionName ? selectedCollectionName : "Library";
  const pageSubtitle = `${filteredTranscripts.length} transcript${filteredTranscripts.length !== 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col h-full space-y-0">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-[var(--fg)] wrap-break-word">
            {pageTitle}
            <span className="text-[var(--fg-muted)] font-normal text-xl ml-3 whitespace-nowrap">
              · {pageSubtitle}
            </span>
          </h1>
          {selectedCollectionId && (
            <button
              className="mt-1 text-xs underline text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer transition-colors duration-150"
              onClick={() => router.push("/dashboard/library")}
            >
              ← All Transcripts
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--fg-muted)]" />
            <Input
              placeholder="Search…"
              className="pl-9 h-9 bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all duration-150"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center border border-[var(--border)] rounded-lg p-1 bg-[var(--surface-elevated)]">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 rounded transition-all duration-150", viewMode === "grid" ? "bg-[var(--accent)] text-[var(--bg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg-subtle)]")}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 rounded transition-all duration-150", viewMode === "list" ? "bg-[var(--accent)] text-[var(--bg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg-subtle)]")}
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Count label with search/filter context */}
      {(searchQuery || selectedCollectionId) && (
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          {searchQuery && `Searching for "${searchQuery}"`}
          {searchQuery && selectedCollectionId && " in "}
          {selectedCollectionId && !searchQuery && "Filtered by collection"}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--fg-muted)]" />
        </div>
      ) : (
        <TranscriptList
          transcripts={filteredTranscripts}
          onDelete={handleDelete}
          onRename={handleRename}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    // useSearchParams requires Suspense boundary in Next.js 14 app router
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--fg-muted)]" /></div>}>
      <LibraryContent />
    </Suspense>
  );
}
