"use client";

import { useState } from "react";
import { Plus, FolderOpen, Folder, List, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export interface Collection {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface CollectionPanelProps {
  collections: Collection[];
  selectedId: string | null; // null = "All Transcripts"
  onSelect: (id: string | null) => void;
  onCollectionCreated: (c: Collection) => void;
  onTranscriptMoved: (transcriptId: string, collectionId: string | null) => void;
  transcriptCounts: Record<string, number>; // collection_id → count
  totalCount: number;
}

export function CollectionPanel({
  collections,
  selectedId,
  onSelect,
  onCollectionCreated,
  onTranscriptMoved,
  transcriptCounts,
  totalCount,
}: CollectionPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null | "all">(undefined as unknown as null);
  const supabase = createClient();

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("collections")
        .insert({ name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      onCollectionCreated(data as Collection);
      setNewName("");
      setIsCreating(false);
      toast.success(`Collection "${name}" created`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create collection");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id as string | null);
  };

  const handleDragLeave = () => {
    setDragOverId(undefined as unknown as null);
  };

  const handleDrop = async (e: React.DragEvent, targetCollectionId: string | null) => {
    e.preventDefault();
    setDragOverId(undefined as unknown as null);
    const transcriptId = e.dataTransfer.getData("transcriptId");
    if (!transcriptId) return;

    const { error } = await supabase
      .from("transcripts")
      .update({ collection_id: targetCollectionId })
      .eq("id", transcriptId);

    if (error) {
      toast.error("Failed to move transcript");
      return;
    }

    onTranscriptMoved(transcriptId, targetCollectionId);
    const colName = targetCollectionId
      ? (collections.find((c) => c.id === targetCollectionId)?.name ?? "collection")
      : "All Transcripts";
    toast.success(`Moved to "${colName}"`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const dropHighlight = "ring-2 ring-primary ring-offset-1 bg-primary/10";

  return (
    <div className="flex flex-col h-full select-none">
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Collections
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setIsCreating(true)}
          title="New collection"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {/* All Transcripts — drop target for removing from a collection */}
        <button
          onClick={() => onSelect(null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            selectedId === null
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            dragOverId === null && dropHighlight
          )}
        >
          <List className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left truncate">All Transcripts</span>
          <span className="text-xs tabular-nums opacity-60">{totalCount}</span>
        </button>

        {/* Per-collection items */}
        {collections.map((col) => {
          const isSelected = selectedId === col.id;
          const isDragTarget = dragOverId === col.id;
          return (
            <button
              key={col.id}
              onClick={() => onSelect(col.id)}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isSelected
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                isDragTarget && dropHighlight
              )}
            >
              {isSelected ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="flex-1 text-left truncate">{col.name}</span>
              <span className="text-xs tabular-nums opacity-60">
                {transcriptCounts[col.id] ?? 0}
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 opacity-30" />
            </button>
          );
        })}
      </div>

      {/* Inline new-collection form */}
      {isCreating && (
        <div className="px-3 py-2 border-t border-border space-y-2">
          <Input
            autoFocus
            placeholder="Collection name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setIsCreating(false); setNewName(""); }
            }}
            className="h-7 text-xs"
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleCreate}
              disabled={isSaving || !newName.trim()}
            >
              {isSaving ? "Creating…" : "Create"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setIsCreating(false); setNewName(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
