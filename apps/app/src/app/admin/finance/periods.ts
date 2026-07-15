// Period math for the Finance calendar picker. UTC-day-aligned (admin_finance_summary localises the
// day-grain to Europe/Amsterdam internally; the ~1h edge fuzz is immaterial at week/month/quarter/year).
export type PeriodKind = "week" | "month" | "quarter" | "year" | "custom"

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

function labelFor(kind: PeriodKind, from: Date): string {
  const y = from.getUTCFullYear()
  switch (kind) {
    case "week": {
      const end = new Date(from.getTime() + 6 * DAY)
      return `${fmt(from)} – ${fmt(end)} ${y}`
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
export function makePeriod(kind: PeriodKind, anchor: Date, now: Date, customTo?: Date): Period {
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
