"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowDownUp,
  Check,
  Rows3,
  Rows2,
  Folder,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Input } from "@indxr/shared/components/ui/input";
import { Button } from "@indxr/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@indxr/shared/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@indxr/shared/components/ui/sheet";
import { cn } from "@indxr/shared/lib/utils";
import {
  LibraryFilters,
  HasKey,
  SortKey,
  SortDir,
  DEFAULT_DIR,
  hasActiveFilters,
  filterChips,
} from "./filters";

export type Density = "default" | "compact";
export interface Collection {
  id: string;
  name: string;
}

interface LibraryControlsProps {
  filters: LibraryFilters;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSetParam: (mut: Record<string, string | null>, opts?: { replace?: boolean }) => void;
  onToggleHas: (k: HasKey) => void;
  density: Density;
  onDensityChange: (d: Density) => void;
  collections: Collection[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
}

const SOURCE_OPTS: { v: LibraryFilters["source"]; l: string }[] = [
  { v: null, l: "Any source" },
  { v: "captions", l: "YouTube captions" },
  { v: "ai", l: "AI transcription" },
];
const HAS_OPTS: { v: HasKey; l: string }[] = [
  { v: "summary", l: "AI summary" },
  { v: "edited", l: "Edited" },
  { v: "rag", l: "RAG export" },
];
const DURATION_OPTS: { v: LibraryFilters["duration"]; l: string }[] = [
  { v: null, l: "Any length" },
  { v: "lt10", l: "Under 10 min" },
  { v: "10to30", l: "10–30 min" },
  { v: "30to60", l: "30–60 min" },
  { v: "gt60", l: "Over 60 min" },
];
const ADDED_OPTS: { v: LibraryFilters["added"]; l: string }[] = [
  { v: null, l: "Any time" },
  { v: "today", l: "Today" },
  { v: "7d", l: "This week" },
  { v: "30d", l: "This month" },
];

const SORT_OPTS: { sort: SortKey; dir: SortDir; l: string }[] = [
  { sort: "date", dir: "desc", l: "Newest first" },
  { sort: "date", dir: "asc", l: "Oldest first" },
  { sort: "duration", dir: "desc", l: "Longest first" },
  { sort: "duration", dir: "asc", l: "Shortest first" },
  { sort: "title", dir: "asc", l: "Title A–Z" },
  { sort: "title", dir: "desc", l: "Title Z–A" },
];

function OptionRow({
  selected,
  label,
  onClick,
  type = "radio",
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  type?: "radio" | "check";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors cursor-pointer",
        selected ? "text-fg font-medium" : "text-fg-muted hover:text-fg hover:bg-surface-elevated/60",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center border",
          type === "radio" ? "rounded-full" : "rounded-[4px]",
          selected ? "border-accent bg-accent text-fg-on-accent" : "border-border-strong bg-surface-sunken",
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </span>
      {label}
    </button>
  );
}

/** The filter body — reused verbatim inside the desktop dropdown and the mobile sheet. */
function FilterPanel({
  filters,
  onSetParam,
  onToggleHas,
}: Pick<LibraryControlsProps, "filters" | "onSetParam" | "onToggleHas">) {
  const f = filters;
  return (
    <div className="space-y-3">
      <section>
        <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Status</p>
        <OptionRow
          type="check"
          selected={f.status === "unread"}
          label="Unread only"
          onClick={() => onSetParam({ status: f.status === "unread" ? null : "unread" })}
        />
      </section>
      <section>
        <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Source</p>
        {SOURCE_OPTS.map((o) => (
          <OptionRow
            key={o.l}
            selected={f.source === o.v}
            label={o.l}
            onClick={() => onSetParam({ source: o.v })}
          />
        ))}
      </section>
      <section>
        <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Has</p>
        {HAS_OPTS.map((o) => (
          <OptionRow
            key={o.v}
            type="check"
            selected={f.has.includes(o.v)}
            label={o.l}
            onClick={() => onToggleHas(o.v)}
          />
        ))}
      </section>
      <section>
        <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Duration</p>
        {DURATION_OPTS.map((o) => (
          <OptionRow
            key={o.l}
            selected={f.duration === o.v}
            label={o.l}
            onClick={() => onSetParam({ dur: o.v })}
          />
        ))}
      </section>
      <section>
        <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Added</p>
        {ADDED_OPTS.map((o) => (
          <OptionRow
            key={o.l}
            selected={f.added === o.v}
            label={o.l}
            onClick={() => onSetParam({ added: o.v })}
          />
        ))}
      </section>
    </div>
  );
}

function SortPanel({
  filters,
  onSetParam,
}: Pick<LibraryControlsProps, "filters" | "onSetParam">) {
  const set = (sort: SortKey, dir: SortDir) =>
    onSetParam({
      sort: sort === "date" ? null : sort,
      dir: dir === DEFAULT_DIR[sort] ? null : dir,
    });
  return (
    <div>
      <p className="px-2 pb-1 text-xs font-medium text-fg-muted">Sort by</p>
      {SORT_OPTS.map((o) => (
        <OptionRow
          key={o.l}
          selected={filters.sort === o.sort && filters.dir === o.dir}
          label={o.l}
          onClick={() => set(o.sort, o.dir)}
        />
      ))}
    </div>
  );
}

function DensityToggle({ density, onDensityChange }: Pick<LibraryControlsProps, "density" | "onDensityChange">) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 bg-surface">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md transition-colors",
          density === "default" ? "bg-accent text-fg-on-accent hover:bg-accent hover:text-fg-on-accent" : "text-fg-muted hover:text-fg",
        )}
        onClick={() => onDensityChange("default")}
        aria-label="Default density"
      >
        <Rows3 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md transition-colors",
          density === "compact" ? "bg-accent text-fg-on-accent hover:bg-accent hover:text-fg-on-accent" : "text-fg-muted hover:text-fg",
        )}
        onClick={() => onDensityChange("compact")}
        aria-label="Compact density"
      >
        <Rows2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function LibraryControls(props: LibraryControlsProps) {
  const {
    filters,
    searchValue,
    onSearchChange,
    onSetParam,
    onToggleHas,
    density,
    onDensityChange,
    collections,
    selectedCollectionId,
    onSelectCollection,
  } = props;

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileCollOpen, setMobileCollOpen] = useState(false);
  const [collSearch, setCollSearch] = useState("");

  const activeCount = filterChips(filters).length;
  const selectedCollectionName = selectedCollectionId
    ? collections.find((c) => c.id === selectedCollectionId)?.name ?? "Collection"
    : "All Transcripts";

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(collSearch.trim().toLowerCase()),
  );

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2">
        {/* Search — always visible */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
          <Input
            placeholder="Search…"
            className="pl-8 h-9 rounded-lg border-border bg-surface text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle transition-all duration-150"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            dir="auto"
            data-testid="library-search"
          />
        </div>

        {/* Desktop: Filter + Sort + Density */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-9 gap-2 rounded-lg border px-3 text-sm",
                  activeCount > 0 ? "border-accent text-accent" : "border-border text-fg-muted hover:text-fg",
                )}
                data-testid="library-filter"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter
                {activeCount > 0 && (
                  <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-fg-on-accent tabular-nums">
                    {activeCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-2">
              <FilterPanel filters={filters} onSetParam={onSetParam} onToggleHas={onToggleHas} />
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-2 rounded-lg border border-border px-3 text-sm text-fg-muted hover:text-fg"
                data-testid="library-sort"
              >
                <ArrowDownUp className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-2">
              <SortPanel filters={filters} onSetParam={onSetParam} />
            </DropdownMenuContent>
          </DropdownMenu>

          <DensityToggle density={density} onDensityChange={onDensityChange} />
        </div>

        {/* Mobile: single "Filters & sort" trigger */}
        <Button
          variant="ghost"
          className={cn(
            "md:hidden h-9 gap-2 rounded-lg border px-3 text-sm shrink-0",
            activeCount > 0 ? "border-accent text-accent" : "border-border text-fg-muted",
          )}
          onClick={() => setMobileFilterOpen(true)}
          aria-label="Filters and sort"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-fg-on-accent tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile: collections picker button */}
      {collections.length > 0 && (
        <button
          onClick={() => setMobileCollOpen(true)}
          className="md:hidden w-full flex items-center justify-between rounded-lg border border-border bg-surface px-3 h-9 text-sm text-fg"
        >
          <span className="flex items-center gap-2 truncate">
            <Folder className="h-4 w-4 text-fg-muted shrink-0" />
            <span dir="auto" className="truncate">{selectedCollectionName}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-fg-muted rotate-90" />
        </button>
      )}

      {/* Mobile filter+sort sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter &amp; sort</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-6">
            <FilterPanel filters={filters} onSetParam={onSetParam} onToggleHas={onToggleHas} />
            <div className="border-t border-border-subtle pt-3">
              <SortPanel filters={filters} onSetParam={onSetParam} />
            </div>
            <div className="border-t border-border-subtle pt-3 flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted px-2">Density</span>
              <DensityToggle density={density} onDensityChange={onDensityChange} />
            </div>
            {hasActiveFilters(filters) && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onSetParam({ status: null, source: null, has: null, dur: null, added: null });
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile collections sheet */}
      <Sheet open={mobileCollOpen} onOpenChange={setMobileCollOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Collections</SheetTitle>
          </SheetHeader>
          <div className="pb-6">
            <Input
              placeholder="Filter collections…"
              value={collSearch}
              onChange={(e) => setCollSearch(e.target.value)}
              className="h-9 mb-2"
              dir="auto"
            />
            <button
              onClick={() => {
                onSelectCollection(null);
                setMobileCollOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                !selectedCollectionId ? "bg-accent-subtle text-accent font-medium" : "text-fg-muted hover:text-fg",
              )}
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">All Transcripts</span>
            </button>
            {filteredCollections.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelectCollection(c.id);
                  setMobileCollOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                  selectedCollectionId === c.id ? "bg-accent-subtle text-accent font-medium" : "text-fg-muted hover:text-fg",
                )}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate" dir="auto">{c.name}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
