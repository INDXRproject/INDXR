// Library filter model — the single source for how a filter maps to the URL, to the
// Supabase query, and to a removable chip. Everything server-side: the query runs over the
// whole dataset (transcripts_list view), never over just the loaded rows.

export type SortKey = "date" | "duration" | "title";
export type SortDir = "asc" | "desc";
export type HasKey = "summary" | "edited" | "rag";

export interface LibraryFilters {
  q: string;
  status: "unread" | null;
  source: "captions" | "ai" | null;
  has: HasKey[];
  duration: "lt10" | "10to30" | "30to60" | "gt60" | null;
  added: "today" | "7d" | "30d" | null;
  sort: SortKey;
  dir: SortDir;
}

// Default sort direction per key (used when ?dir is absent).
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  date: "desc",
  duration: "desc",
  title: "asc",
};

const SORT_KEYS: SortKey[] = ["date", "duration", "title"];
const HAS_KEYS: HasKey[] = ["summary", "edited", "rag"];

/** Read the full filter state out of the URL search params. */
export function parseFilters(sp: URLSearchParams): LibraryFilters {
  const sortRaw = sp.get("sort");
  const sort: SortKey = SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "date";
  const dirRaw = sp.get("dir");
  const dir: SortDir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : DEFAULT_DIR[sort];

  const sourceRaw = sp.get("source");
  const source = sourceRaw === "captions" || sourceRaw === "ai" ? sourceRaw : null;

  const durRaw = sp.get("dur");
  const duration = (["lt10", "10to30", "30to60", "gt60"] as const).includes(durRaw as never)
    ? (durRaw as LibraryFilters["duration"])
    : null;

  const addedRaw = sp.get("added");
  const added = (["today", "7d", "30d"] as const).includes(addedRaw as never)
    ? (addedRaw as LibraryFilters["added"])
    : null;

  const has = (sp.get("has") ?? "")
    .split(",")
    .filter((h): h is HasKey => HAS_KEYS.includes(h as HasKey));

  return {
    q: sp.get("q") ?? "",
    status: sp.get("status") === "unread" ? "unread" : null,
    source,
    has,
    duration,
    added,
    sort,
    dir,
  };
}

/** True when any content filter (not sort, not search) is active. */
export function hasActiveFilters(f: LibraryFilters): boolean {
  return !!(f.status || f.source || f.has.length || f.duration || f.added);
}

/** True when anything narrows the set (filters OR search) — drives the "no results" vs
 *  "library empty" distinction. */
export function isNarrowed(f: LibraryFilters): boolean {
  return hasActiveFilters(f) || f.q.trim().length > 0;
}

// Duration buckets in seconds.
const DURATION_BOUNDS: Record<NonNullable<LibraryFilters["duration"]>, [number, number | null]> = {
  lt10: [0, 600],
  "10to30": [600, 1800],
  "30to60": [1800, 3600],
  gt60: [3600, null],
};

/** Cutoff ISO timestamp for the "Added" filter, computed against `now`. */
function addedCutoff(added: NonNullable<LibraryFilters["added"]>, now: Date): string {
  if (added === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  const days = added === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

// Loose type — a Supabase PostgrestFilterBuilder. Kept generic so this module has no
// supabase-js type dependency; every method used below returns the same builder.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

/**
 * Apply search + all content filters to a Supabase query over `transcripts_list`.
 * Search matches title/channel/video_id per whitespace token (each token AND-ed), exactly
 * as the old list did. Sort/range/count are applied by the caller.
 */
export function applyLibraryFilters(query: QueryBuilder, f: LibraryFilters, now: Date): QueryBuilder {
  let q = query;

  const search = f.q.trim().replace(/[%,()]/g, " ").trim();
  if (search) {
    const tokens = search.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const tok of tokens) {
      q = q.or(`title.ilike.%${tok}%,channel.ilike.%${tok}%,video_id.ilike.%${tok}%`);
    }
  }

  if (f.status === "unread") q = q.is("viewed_at", null);

  // Source: verified two enum values, no NULLs (youtube_captions / assemblyai).
  if (f.source === "captions") q = q.eq("processing_method", "youtube_captions");
  else if (f.source === "ai") q = q.eq("processing_method", "assemblyai");

  for (const h of f.has) {
    if (h === "summary") q = q.eq("has_summary", true);
    else if (h === "edited") q = q.eq("has_edit", true);
    else if (h === "rag") q = q.eq("has_rag", true);
  }

  if (f.duration) {
    const [lo, hi] = DURATION_BOUNDS[f.duration];
    if (lo > 0) q = q.gte("duration", lo);
    if (hi !== null) q = q.lt("duration", hi);
  }

  if (f.added) q = q.gte("created_at", addedCutoff(f.added, now));

  return q;
}

/** Apply the chosen sort + direction to the query. */
export function applyLibrarySort(query: QueryBuilder, f: LibraryFilters): QueryBuilder {
  const ascending = f.dir === "asc";
  if (f.sort === "duration") return query.order("duration", { ascending, nullsFirst: false });
  if (f.sort === "title") return query.order("title", { ascending });
  return query.order("created_at", { ascending });
}

// ── Chip descriptors ────────────────────────────────────────────────────────
// Each active content filter renders one removable chip. `clear` lists the URL params
// to delete (page.tsx turns that into a navigation).

export interface FilterChip {
  id: string;
  label: string;
  clear: { param: string; value?: string }[]; // value set → remove only that token (multi-value `has`)
}

const SOURCE_LABEL: Record<NonNullable<LibraryFilters["source"]>, string> = {
  captions: "YouTube captions",
  ai: "AI transcription",
};
const HAS_LABEL: Record<HasKey, string> = {
  summary: "Has AI summary",
  edited: "Has edits",
  rag: "Has RAG export",
};
const DURATION_LABEL: Record<NonNullable<LibraryFilters["duration"]>, string> = {
  lt10: "Under 10 min",
  "10to30": "10–30 min",
  "30to60": "30–60 min",
  gt60: "Over 60 min",
};
const ADDED_LABEL: Record<NonNullable<LibraryFilters["added"]>, string> = {
  today: "Added today",
  "7d": "Added this week",
  "30d": "Added this month",
};

export function filterChips(f: LibraryFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.status === "unread") chips.push({ id: "status", label: "Unread only", clear: [{ param: "status" }] });
  if (f.source) chips.push({ id: "source", label: SOURCE_LABEL[f.source], clear: [{ param: "source" }] });
  for (const h of f.has) chips.push({ id: `has-${h}`, label: HAS_LABEL[h], clear: [{ param: "has", value: h }] });
  if (f.duration) chips.push({ id: "dur", label: DURATION_LABEL[f.duration], clear: [{ param: "dur" }] });
  if (f.added) chips.push({ id: "added", label: ADDED_LABEL[f.added], clear: [{ param: "added" }] });
  return chips;
}

/** All content-filter param keys — used to clear everything at once. */
export const FILTER_PARAMS = ["status", "source", "has", "dur", "added"] as const;
