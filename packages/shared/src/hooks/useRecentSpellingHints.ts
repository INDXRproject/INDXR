'use client'
import { useEffect, useState } from "react"
import { createClient } from "../utils/supabase/client"

// keyterms-ADR: up to 3 recent, distinct spelling-hints lists for the current user, read straight
// from their own transcription_jobs rows (RLS already permits auth.uid()=user_id SELECT, ADR-104).
// No new table, no admin screen — deliberately kept small per the product decision.
export function useRecentSpellingHints(): string[][] {
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
        const key = [...terms].map((t) => t.toLowerCase()).sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        distinct.push(terms)
        if (distinct.length >= 3) break
      }
      if (!cancelled) setLists(distinct)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return lists
}
