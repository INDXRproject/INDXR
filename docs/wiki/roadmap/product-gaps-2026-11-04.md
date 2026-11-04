# Productgaten vanuit "Transcripts, done properly" (2026-11-04)

Twee gaten die de positionering ("elke lezing, interview en video waar je van leert, als tekst die je kunt doorzoeken, citeren en gebruiken") nu niet waarmaakt. Gecontroleerd tegen de broncode op 4-11.

## Gat 1: de bibliotheek doorzoekt geen transcripttekst — LIVE sinds 2026-11-05

**Status:** migratie `20261104150000` op prod (schema_migrations 173), code op master (`c6ea140`, `e24624f`). Geverifieerd in productie: zoeken op een woord dat alleen in de tekst staat vindt het transcript. Copy mag nu "search your transcripts" zeggen. Open vervolg: treffers markeren en naar het tijdstip springen (stap 3).

**Nu (code):** `apps/app/src/components/library/filters.ts` → `applyLibraryFilters` zoekt per token met `ilike` op `title`, `channel` en `video_id` van de view `transcripts_list`. De tekst zelf (`transcripts.transcript` jsonb, array van `{text, offset, duration}`; bewerkingen in `edited_content` jsonb) wordt niet doorzocht. Wie twintig colleges heeft en "the moon" zoekt, vindt niets.

**Gevolg voor copy:** nergens "search your transcripts" beloven tot dit live is.

**Plan:**
1. Migratie: gegenereerde kolom `transcripts.search_tsv tsvector GENERATED ALWAYS AS (strip(to_tsvector('simple', coalesce(jsonb_path_query_array(transcript,'$[*].text')::text,'') || ' ' || coalesce(jsonb_path_query_array(edited_content,'strict $.**.text')::text,'')))) STORED` + GIN-index. Daarna `transcripts_list` herdefiniëren met `search_tsv` erbij (zelfde kolommen, `security_invoker` blijft).
   - `'simple'`-config: gebruikers transcriberen in veel talen, en stemming per taal zou per rij een andere config vereisen. Prefix-match (`woord:*`) vangt meervouden en vervoegingen grotendeels.
   - `strip()` gooit posities weg. Een tsvector mag maximaal 1 MB zijn; zonder posities blijft zelfs een transcript van 10 uur ruim daaronder (alleen unieke woorden). Daardoor kan een insert nooit falen op een te grote vector. Prijs: geen frase-zoeken. Dat is acceptabel voor v1.
   - Alle functies in de expressie zijn IMMUTABLE (`jsonb_path_query_array` zonder `_tz`, `to_tsvector` met vaste config), dus de kolom mag gegenereerd zijn. De bestaande rijen worden bij de `ALTER` eenmalig herschreven. De tabel is klein, dus dat duurt seconden.
2. Frontend: in `applyLibraryFilters` per token `search_tsv.fts(simple).<token>:*` aan de bestaande `or(...)` toevoegen. Tokens voor de fts-tak eerst saneren tot letters en cijfers, zodat tsquery-tekens (`& | ! < > ' :`) nooit een 400 geven.
3. Daarna (stap 2 van deze feature): op de transcriptpagina de treffers markeren en naar het tijdstip springen. Dat is een aparte taak, geen v1-voorwaarde.

**Verificatie:** de migratie toepassen via Supabase MCP (er is geen DB-toegang vanuit de cloud-sessie). Daarna moet het aantal rijen in `schema_migrations` met +1 stijgen. `EXPLAIN` op een fts-query moet de GIN-index tonen. Zoeken op een woord dat alleen in de tekst staat (niet in de titel) moet het transcript vinden. Een token met `&` of `'` mag geen fout geven. Tot slot `pnpm build:app` groen.

**Risico's:** de view-herdefinitie moet exact dezelfde kolommen houden, anders breekt `LIST_COLUMNS` in `dashboard/library/page.tsx`. RLS verandert niet, want de view is `security_invoker`.

## Gat 2: de upsell captions → AI is onzichtbaar

**Nu (code):** vóór extractie kiest de gebruiker in `VideoTab.tsx` tussen captions en AI (radio, `useWhisper`). Na een captions-transcript is er geen weg terug naar "doe deze video goed". In de bibliotheek ontbreekt een knop om opnieuw te transcriberen met AI. Juist daar ziet de gebruiker hoe slecht captions zijn (geen leestekens, geen sprekers).

**Plan:**
1. Op een captions-transcript in de bibliotheek: een kaart met de tekst "Punctuation and speakers? Compare the first minute free". Die kaart vraagt een gratis AI-voorproefje van de eerste 60 seconden aan. Het voorproefje komt naast de captions van dezelfde minuut te staan, met de knop "Transcribe the whole video with AI — N credits" (de bestaande AI-flow, de bestaande reservering).
2. Backend: hergebruik `extract_preview_clip` en `submit_assemblyai` uit de balie-preview. Download alleen de eerste minuut (`yt-dlp --download-sections "*0-60"`), zodat het proxyverkeer klein blijft. Kosten per voorproefje: AssemblyAI ~$0.0025 plus wat residentieel proxyverkeer.
3. Misbruikgrenzen (vooraf, geen naschrift): alleen ingelogd; één voorproefje per transcript; maximaal 5 per gebruiker per dag; het resultaat cachen per `video_id`, zodat een tweede gebruiker het niet opnieuw kost. Nooit credits of een reservering in dit pad, net als bij de balie-preview.

**Verificatie:** een captioned video in de testaccount laten zien met naast elkaar de eerste minuut van captions en van AI. De knop moet de bestaande AI-job starten met de juiste prijs. Een zesde voorproefje op één dag moet geweigerd worden. De vier invariant-tests (`./scripts/check-playlist-invariants.sh`) moeten groen blijven.

## Volgorde

Eerst gat 1 (zoeken): het is klein, zonder kosten en zonder financieel pad, en de positionering beweert het. Daarna gat 2: dat raakt de proxy, AssemblyAI en de credit-flow, en daarom gaat het via CC met de financiële veiligheidsinstructie.
