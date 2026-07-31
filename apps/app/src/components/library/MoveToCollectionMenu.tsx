"use client";

import { useMemo, useState } from "react";
import { Check, Folder, FolderMinus, Plus, Loader2 } from "lucide-react";
import { Input } from "@indxr/shared/components/ui/input";
import { cn } from "@indxr/shared/lib/utils";
import type { Collection } from "./LibraryControls";

export interface MoveTarget {
  id: string;
  collection_id: string | null;
}

interface MoveToCollectionMenuProps {
  targets: MoveTarget[];
  collections: Collection[];
  onMove: (ids: string[], collectionId: string | null) => void;
  onCreateCollection: (name: string) => Promise<string | null>;
  onDone: () => void;
}

export function MoveToCollectionMenu({
  targets,
  collections,
  onMove,
  onCreateCollection,
  onDone,
}: MoveToCollectionMenuProps) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const ids = useMemo(() => targets.map((t) => t.id), [targets]);
  const n = targets.length;
  const inCollectionCount = targets.filter((t) => t.collection_id).length;
  const noneCount = n - inCollectionCount;
  const presentCols = useMemo(
    () => [...new Set(targets.map((t) => t.collection_id).filter((c): c is string => !!c))],
    [targets],
  );

  const note = (() => {
    if (n === 0) return "";
    if (presentCols.length === 0) return "Not in a collection yet.";
    if (presentCols.length === 1 && noneCount === 0) {
      const name = collections.find((c) => c.id === presentCols[0])?.name ?? "a collection";
      return `All ${n} ${n === 1 ? "is" : "are"} in “${name}”.`;
    }
    return `Spread over ${presentCols.length} collection${presentCols.length !== 1 ? "s" : ""}, ${noneCount} in none. Moving replaces that for all ${n}.`;
  })();

  const filtered = collections.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  const move = (collectionId: string | null) => {
    onMove(ids, collectionId);
    onDone();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const id = await onCreateCollection(name);
    setSaving(false);
    if (id) move(id);
  };

  return (
    <div className="w-64 space-y-1">
      {note && <p className="px-2 py-1 text-[11px] leading-snug text-fg-muted">{note}</p>}

      {collections.length > 6 && (
        <Input
          placeholder="Find a collection…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-8 text-xs mb-1"
          dir="auto"
        />
      )}

      <div className="max-h-56 overflow-y-auto space-y-0.5">
        {filtered.map((c) => {
          const count = targets.filter((t) => t.collection_id === c.id).length;
          const allIn = count === n && n > 0;
          const someIn = count > 0 && !allIn;
          return (
            <button
              key={c.id}
              disabled={allIn}
              onClick={() => move(c.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors",
                allIn ? "text-fg-muted cursor-default" : "text-fg hover:bg-surface-elevated/60 cursor-pointer",
              )}
            >
              <Folder className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
              <span className="flex-1 truncate" dir="auto">
                {c.name}
              </span>
              {allIn && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
              {someIn && (
                <span className="text-[10px] rounded-full bg-surface-sunken px-1.5 py-0.5 text-fg-muted shrink-0">
                  some
                </span>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && <p className="px-2 py-1.5 text-xs text-fg-muted">No collections</p>}
      </div>

      <div className="border-t border-border-subtle pt-1">
        <button
          disabled={inCollectionCount === 0}
          onClick={() => move(null)}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors",
            inCollectionCount === 0
              ? "text-fg-muted cursor-default"
              : "text-fg hover:bg-surface-elevated/60 cursor-pointer",
          )}
        >
          <FolderMinus className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
          {inCollectionCount === 0
            ? "Not in any collection"
            : `Remove from collection${inCollectionCount < n ? ` (${inCollectionCount})` : ""}`}
        </button>

        {creating ? (
          <div className="px-2 py-1.5 space-y-1.5">
            <Input
              autoFocus
              placeholder="Collection name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 150))}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              className="h-8 text-xs"
              dir="auto"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-fg-on-accent disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Create &amp; move
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="rounded-md px-2 py-1 text-xs text-fg-muted hover:text-fg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg-muted hover:text-fg hover:bg-surface-elevated/60 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            New collection…
          </button>
        )}
      </div>
    </div>
  );
}
