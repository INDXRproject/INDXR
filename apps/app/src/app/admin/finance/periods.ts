// Period math for the Finance calendar picker. UTC-day-aligned (admin_finance_summary localises the
// day-grain to Europe/Amsterdam internally; the ~1h edge fuzz is immaterial at week/month/quarter/year).
export type PeriodKind = "week" | "month" | "quarter" | "year" | "alltime" | "custom"

export interface Period {
  kind: PeriodKind
  from: Date // inclusive
  to: Date // exclusive — capped at `now` for the running period ("to date")
  fullTo: Date // the period's natural end (uncapped)
  toDate: boolean // true when the period is still running (to === now)
  label: string
  compareFrom: Date // same elapsed length in the previous period
  compareTo: Date
}

const DAY = 86400000

function startOfUTCWeek(d: Date): Date {
  // ISO week: Monday start.
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (x.getUTCDay() + 6) % 7 // Mon=0
  return new Date(x.getTime() - dow * DAY)
}
function addMonthsUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
}
function startOfQuarterUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1))
}

function bounds(kind: PeriodKind, anchor: Date): { from: Date; fullTo: Date } {
  switch (kind) {
    case "week": {
      const from = startOfUTCWeek(anchor)
      return { from, fullTo: new Date(from.getTime() + 7 * DAY) }
    }
    case "month": {
      const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
      return { from, fullTo: addMonthsUTC(from, 1) }
    }
    case "quarter": {
      const from = startOfQuarterUTC(anchor)
      return { from, fullTo: addMonthsUTC(from, 3) }
    }
    case "year": {
      const from = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1))
      return { from, fullTo: new Date(Date.UTC(anchor.getUTCFullYear() + 1, 0, 1)) }
    }
    default:
      return { from: anchor, fullTo: anchor }
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
function fmt(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

// ISO-8601 week number (weeks start Monday; week 1 contains the year's first Thursday).
export function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7 // Mon=0
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // Thursday of this ISO week
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThu.getUTCDay() + 6) % 7
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDayNum + 3)
  return 1 + Math.round((date.getTime() - firstThu.getTime()) / (7 * DAY))
}

function labelFor(kind: PeriodKind, from: Date): string {
  const y = from.getUTCFullYear()
  switch (kind) {
    case "week": {
      const end = new Date(from.getTime() + 6 * DAY)
      // ISO week number shown in the picker (F12) — "W02 · 6 Jan – 12 Jan 2026".
      return `W${String(getISOWeek(from)).padStart(2, "0")} · ${fmt(from)} – ${fmt(end)} ${y}`
    }
    case "month":
      return `${MONTHS[from.getUTCMonth()]} ${y}`
    case "quarter":
      return `Q${Math.floor(from.getUTCMonth() / 3) + 1} ${y}`
    case "year":
      return `${y}`
    default:
      return `${fmt(from)} – …`
  }
}

// Build a Period from a kind + an anchor date inside it, relative to `now`.
export function makePeriod(kind: PeriodKind, anchor: Date, now: Date, customTo?: Date, businessStart?: Date): Period {
  if (kind === "alltime") {
    // From the configured business start (F13) through now — a live to-date window. No prior period exists
    // before launch, so the comparison window is zero-length → delta() returns null (no misleading %).
    const from = businessStart ?? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    return {
      kind, from, to: now, fullTo: now, toDate: true,
      label: "All time",
      compareFrom: from, compareTo: from,
    }
  }
  if (kind === "custom") {
    const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()))
    const to = customTo ?? now
    const len = to.getTime() - from.getTime()
    return {
      kind, from, to, fullTo: to, toDate: false,
      label: `${fmt(from)} – ${fmt(new Date(to.getTime() - DAY))}`,
      compareFrom: new Date(from.getTime() - len), compareTo: from,
    }
  }
  const { from, fullTo } = bounds(kind, anchor)
  const running = now >= from && now < fullTo
  const to = running ? now : fullTo
  const elapsed = to.getTime() - from.getTime()
  // previous period of the same kind
  const prevAnchor =
    kind === "week" ? new Date(from.getTime() - DAY)
      : kind === "month" ? addMonthsUTC(from, -1)
      : kind === "quarter" ? addMonthsUTC(from, -3)
      : new Date(Date.UTC(from.getUTCFullYear() - 1, 0, 1))
  const prev = bounds(kind, prevAnchor)
  // Running (to-date): compare the SAME elapsed span in the previous period (month-to-date vs 1st→same day).
  // Completed: compare the WHOLE previous period regardless of length — a full 31-day March against a full
  // 28-day February, a 92-day Q4 against a 90-day Q1. Using prev.from + elapsed would spill the current
  // period's extra days into the previous one (March 31d → 1 Feb + 31d = 1 Feb–3 Mar, three March days
  // counted as February). Whole-vs-whole avoids that.
  const compareTo = running ? new Date(prev.from.getTime() + elapsed) : prev.fullTo
  return {
    kind, from, to, fullTo, toDate: running,
    label: labelFor(kind, from),
    compareFrom: prev.from,
    compareTo,
  }
}

// Shift the anchor one period back/forward. Forward is capped so you can't scroll past the running period.
export function shiftAnchor(kind: PeriodKind, anchor: Date, dir: -1 | 1): Date {
  switch (kind) {
    case "week": return new Date(anchor.getTime() + dir * 7 * DAY)
    case "month": return addMonthsUTC(anchor, dir)
    case "quarter": return addMonthsUTC(anchor, dir * 3)
    case "year": return new Date(Date.UTC(anchor.getUTCFullYear() + dir, anchor.getUTCMonth(), 1))
    default: return anchor
  }
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Named presets (F10). Each maps to a (kind, anchor) the picker navigates to; `matchFromISO` is the period
// start it produces, used to highlight the active preset. Quarter is here as the OSS filing cycle, not decoration.
export interface Preset {
  key: string
  label: string
  kind: PeriodKind
  anchorISO?: string // omitted for "this X" presets (anchor defaults to now); set for "last X" + all-time
  matchFromISO: string
}
export function presets(now: Date, businessStart: Date): Preset[] {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const weekStart = startOfUTCWeek(now)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastMonth = addMonthsUTC(monthStart, -1)
  const qStart = startOfQuarterUTC(now)
  const lastQ = addMonthsUTC(qStart, -3)
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  return [
    { key: "this-week", label: "This week", kind: "week", matchFromISO: iso(weekStart) },
    { key: "this-month", label: "This month", kind: "month", matchFromISO: iso(monthStart) },
    { key: "last-month", label: "Last month", kind: "month", anchorISO: iso(lastMonth), matchFromISO: iso(lastMonth) },
    { key: "this-quarter", label: "This quarter", kind: "quarter", matchFromISO: iso(qStart) },
    { key: "last-quarter", label: "Last quarter", kind: "quarter", anchorISO: iso(lastQ), matchFromISO: iso(lastQ) },
    { key: "this-year", label: "This year", kind: "year", matchFromISO: iso(yearStart) },
    { key: "all-time", label: "All time", kind: "alltime", matchFromISO: iso(businessStart) },
  ]
}

// True when stepping back would start a period BEFORE the business start → the ← arrow is blocked there (F13).
export function atLowerBound(kind: PeriodKind, anchorISO: string, businessStart: Date): boolean {
  if (kind === "custom" || kind === "alltime") return true
  const anchor = new Date(anchorISO + "T00:00:00Z")
  const prev = shiftAnchor(kind, anchor, -1)
  return bounds(kind, prev).from < businessStart
}
