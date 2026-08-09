// Meetlaag-helpers (ADR-096). Strikt begrensd: alleen export-formaat-logging + een grove
// bewerkingsgraad. Geen inhoudsanalyse, geen extra gedragsregistratie buiten deze twee.

import { createClient } from "../utils/supabase/client";

/**
 * Log één export met het formaat (gebruik-meting: welke van de 9 downloadopties wordt gebruikt).
 * Fire-and-forget — mag een download NOOIT blokkeren of laten falen. Alleen voor ingelogde
 * gebruikers (RLS: insert-own); anonieme free-tool-exports (alleen TXT) worden niet gelogd.
 * `format`: txt | txt-ts | md | md-ts | json | csv | srt | vtt | rag.
 */
export function trackExport(
  format: string,
  opts?: { transcriptId?: string | null; source?: string },
): void {
  void (async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("export_events").insert({
        user_id: user.id,
        transcript_id: opts?.transcriptId ?? null,
        format,
        source: opts?.source ?? null,
      });
    } catch {
      /* meten mag de export nooit breken */
    }
  })();
}

/**
 * Grove bewerkingsgraad = woord-multiset-symmetrisch-verschil(bewerkt, origineel) / origineel-woorden.
 * O(n), bewust grof: meet de OMVANG van toegevoegde/verwijderde woorden, telt herordening niet mee
 * (zeldzaam bij transcript-correctie). Het gaat om de trend per taal ("hoeveel wijzigen gebruikers"),
 * niet om precisie — daarom geen dure Levenshtein op 30k woorden. 0 = niets gewijzigd.
 */
export function computeEditRatio(original: string, edited: string): number {
  const words = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean);
  const a = words(original);
  const b = words(edited);
  if (a.length === 0) return b.length > 0 ? 1 : 0;
  const freq = new Map<string, number>();
  for (const w of a) freq.set(w, (freq.get(w) ?? 0) + 1);
  for (const w of b) freq.set(w, (freq.get(w) ?? 0) - 1);
  let symdiff = 0;
  for (const v of freq.values()) symdiff += Math.abs(v);
  return symdiff / a.length;
}
