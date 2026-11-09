# Prompt voor Claude Code — bibliotheekkwaliteit voor de "eigen bronnen in Claude/ChatGPT"-positionering (9-11)

Kopieer alles tussen de lijnen in Claude Code (map `INDXR.AI V2`). Plan Mode.

---

Eerst `git pull`. De positionering is sinds 9-11 "gebruik Claude/ChatGPT met je eigen bronnen" (zie
`docs/wiki/business/growth-live-status.md` §0). Tijdens het vullen van de showcasebibliotheek
(contact@indxr.ai, 110 transcripten) kwamen vijf productfouten boven die precies dat verhaal raken.
Los ze alle vijf op. Raak niets anders aan; ongerelateerde rommel: rapporteren, niet fixen. Credits en
de playlist-bon zijn financieel: verander daar geen logica, en draai `./scripts/check-playlist-invariants.sh`
als je de playlist-flow aanraakt.

1. **Playlist-transcripten krijgen geen `channel`.** Losse video's slaan het kanaal op, transcripten uit
   een playlist-job niet (in de showcase: 0 van 24 in HIST 202, 1 van 24 in CLCV 205). Daardoor zegt het
   APA-citaat (SourceCard `buildCitation`, MCP `get_source`) "Unknown channel". Sla het kanaal op voor
   elke playlist-video (captions én AI). Backfill daarna voor alle gebruikers de bestaande transcripten
   met `video_id` en lege `channel` (YouTube Data API in batches van 50, of het playlist-metadata dat al
   bewaard is). De showcase is al met de hand gevuld. Bewijs: een nieuwe playlist van 3 video's heeft
   overal een channel; telling van lege channels vóór/na de backfill.
2. **Zoeken rangschikt niet op relevantie.** `search_library` in `backend/mcp_server.py` (en de
   bibliotheekzoeker, check `apps/app/src/components/library/filters.ts`) geeft treffers in willekeurige
   volgorde met `limit`. Bij "Napoleon" gaf de connector 5 treffers uit HIST 210 en Kagan terwijl HIST 202
   (European Civilization) er 13 heeft. Rangschik op relevantie: titeltreffers eerst, daarna `ts_rank` op
   `search_tsv`. Doe het in één SQL-RPC (migratie, 14-cijferige timestamp, Supabase MCP `apply_migration`,
   `schema_migrations` +1, RLS/grants volgens de conventie) die zowel de MCP als de app gebruikt. Bewijs:
   "Napoleon" geeft HIST 202 bovenaan, via de echte connector én in de app.
3. **Playlist maakt altijd een nieuwe collectie, en vinkt al-aanwezige video's aan.** Bied in de
   review "Add to collection: [bestaande ▾] / New collection (naam playlist)" aan; standaard de collectie
   waarin al video's van deze playlist staan. Video's met "CAPTIONS IN LIBRARY" zijn standaard uitgevinkt
   en tellen niet als gratis plek. Bon en reservering blijven exact gelijk aan wat Python reserveert.
4. **Foutkopij bij PROXY_ERROR op een captions-video** zegt "We couldn't reach this video's audio … Use
   Upload" en geeft geen Retry. Voor captions-modus: juiste tekst + Retry-knop. (Gezien: CLCV 205 college 16;
   los opnieuw → gelukt.)
5. **APA-titel:** `buildCitation` neemt de YouTube-titel letterlijk over (bv. `"THE MORAL SIDE OF MURDER"`).
   APA 7 vraagt sentence case + cursief. Kopieer-knop: cursieve titel in de HTML-variant (rich text) en een
   kleine hint "Check capitals: APA uses sentence case" bij het citaat. Geen automatische sentence-case-
   conversie (eigennamen gaan stuk). Werk `docs/guides/library` en `/articles/cite-youtube-video-apa` bij als
   het gedrag verandert.

Docs: LOG.md onderaan, `docs/wiki/roadmap/priorities.md` (sectie "Gevonden 9-11" afvinken), CLAUDE.md-rij
"Rate limiting … uit in prod" corrigeren (Upstash staat aan, zie LOG 2026-11-09 03:00), LESSONS.md als een
fout een patroon is. Commit en push zelf; verifieer Vercel + Railway groen; rapporteer commit-hash,
deploy-status en per punt het bewijs.

---
