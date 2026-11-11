'use client'
import { useCallback, useEffect, useState } from "react"
import { createClient } from "../utils/supabase/client"
import { keytermsSignature } from "../lib/spellingHints"

// keyterms-ADR: up to 3 recent, distinct spelling-hints lists for the current user, read straight
// from their own transcription_jobs rows (RLS already permits auth.uid()=user_id SELECT, ADR-104).
// No new table, no admin screen — deliberately kept small per the product decision.
//
// BUG FIX (2026-11-12 live test): chips "disappeared" across a multi-run test session. The DB side
// was fine — transcription_jobs.keyterms is correctly persisted and cost_eur correctly includes the
// add-on for every hinted job (verified via SQL). The real bug was that this hook only fetched ONCE
// on mount: within a single page session (VideoTab/AudioTab don't remount between consecutive runs),
// a hint list used in run N never became a chip for run N+1 because nothing ever re-fetched. Fix:
// `recordUsed()` updates the in-memory list OPTIMISTICALLY the moment a request is submitted, so the
// very next render shows it — no DB round-trip, no timing race.
export function useRecentSpellingHints(): { lists: string[][]; recordUsed: (terms: string[]) => void } {
  const [lists, setLists] = useState<string[][]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('keyterms')
        .eq('user_id', user.id)
        .not('keyterms', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error || !data || cancelled) return

      const seen = new Set<string>()
      const distinct: string[][] = []
      for (const row of data) {
        const terms = (row.keyterms as string[] | null) ?? []
        if (!terms.length) continue
        const key = keytermsSignature(terms)
        if (seen.has(key)) continue
        seen.add(key)
        distinct.push(terms)
        if (distinct.length >= 3) break
      }
      if (!cancelled) setLists((prev) => (prev.length ? prev : distinct))
    }
    load()
    return () => { cancelled = true }
  }, [])

  const recordUsed = useCallback((terms: string[]) => {
    if (!terms.length) return
    setLists((prev) => {
      const key = keytermsSignature(terms)
      const rest = prev.filter((t) => keytermsSignature(t) !== key)
      return [terms, ...rest].slice(0, 3)
    })
  }, [])

  return { lists, recordUsed }
}
