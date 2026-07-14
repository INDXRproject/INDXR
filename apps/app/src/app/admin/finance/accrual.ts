import type { ExpenseRow } from "./financeTypes"

// JS-spiegel van public.opex_accrual — voor de trend-overlay (entered-OPEX live over frozen snapshots).
// Werkt op UTC-dagen [fromISO, toISO) (exclusief). Houdt de SQL-regels aan:
//  monthly evenly → dagtarief = amount / dagen_in_kalendermaand
//  none evenly    → dagtarief = amount / dagen_in_occurrence
//  single         → volledig bedrag op de ankerdag
const DAY = 86400000
function d(iso: string): number { return Date.parse(iso + "T00:00:00Z") }
function daysInMonth(y: number, m: number): number { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate() }

export function accrualForRange(expenses: ExpenseRow[], fromISO: string, toISO: string): number {
  const from = d(fromISO)
  const to = d(toISO)
  let total = 0
  for (const e of expenses) {
    const effFrom = d(e.effective_from)
    const effTo = e.effective_to ? d(e.effective_to) : null
    const amount = Number(e.amount)
    if (e.recurrence === "monthly") {
      // iterate months from max(effFrom, from) month-start
      const startBase = Math.max(effFrom, from)
      const sd = new Date(startBase)
      let mY = sd.getUTCFullYear()
      let mM = sd.getUTCMonth()
      while (true) {
        const monthStart = Date.UTC(mY, mM, 1)
        if (monthStart >= to) break
        if (effTo != null && monthStart > effTo) break
        const dim = daysInMonth(mY, mM)
        const monthEndIncl = Date.UTC(mY, mM, dim)
        const occStart = Math.max(monthStart, effFrom)
        const occEndIncl = effTo != null ? Math.min(monthEndIncl, effTo) : monthEndIncl
        if (e.spread === "evenly") {
          const daily = amount / dim
          const ov = Math.max(0, (Math.min(occEndIncl + DAY, to) - Math.max(occStart, from)) / DAY)
          total += ov * daily
        } else {
          if (occStart >= from && occStart < to) total += amount
        }
        // next month
        mM += 1
        if (mM > 11) { mM = 0; mY += 1 }
      }
    } else {
      const occStart = effFrom
      const occEndIncl = effTo ?? effFrom
      if (e.spread === "evenly") {
        const denom = (occEndIncl - occStart) / DAY + 1
        const daily = amount / denom
        const ov = Math.max(0, (Math.min(occEndIncl + DAY, to) - Math.max(occStart, from)) / DAY)
        total += ov * daily
      } else {
        if (occStart >= from && occStart < to) total += amount
      }
    }
  }
  return total
}
