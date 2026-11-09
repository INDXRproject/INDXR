# Prompt voor Claude Code: livegang-klaar voor "eigen bronnen in Claude/ChatGPT" (9-11)

Kopieer alles tussen de lijnen in Claude Code (map `INDXR.AI V2`). Plan Mode.

---

Eerst `git pull`. Sinds 9-11 is de positionering: gebruik Claude/ChatGPT met je eigen bronnen erbij. De
assistent houdt zijn eigen kennis en het web, en krijgt jouw geordende, geciteerde bronnen; "alleen mijn
bronnen" kan per vraag (zie `docs/wiki/business/growth-live-status.md` §0 en LESSONS 2026-11-09). De copy
staat live. Wat hieronder staat, maakt het product klaar voor de lancering (Product Hunt + Claude Connectors
Directory). Doe alle punten. Raak niets anders aan; ongerelateerde rommel rapporteren, niet fixen. Credits
en de playlist-bon zijn financieel: geen logica veranderen, en draai `./scripts/check-playlist-invariants.sh`
zodra je de playlist-flow aanraakt. Bij twijfel over geld of rechten: stop en rapporteer.

**A. Bibliotheekkwaliteit** (gevonden bij het vullen van de showcase op contact@indxr.ai, 110 transcripten)
1. **Playlist-transcripten krijgen geen `channel`.** Losse video's slaan het kanaal op, playlist-jobs niet
   (0/24 in HIST 202). Daardoor zegt het APA-citaat (SourceCard `buildCitation`, MCP `get_source`)
   "Unknown channel". Sla het kanaal op voor elke playlist-video (captions én AI). Backfill daarna voor alle
   gebruikers de transcripten met `video_id` en lege `channel` (YouTube Data API in batches van 50, of
   playlist-metadata als die al bewaard is). Bewijs: een nieuwe playlist van 3 video's heeft overal een
   channel; telling lege channels vóór/na.
2. **Zoeken rangschikt niet op relevantie.** `search_library` in `backend/mcp_server.py` (en de
   bibliotheekzoeker, zie `apps/app/src/components/library/filters.ts`) geeft treffers in willekeurige
   volgorde met `limit`. "Napoleon" gaf 5 treffers uit HIST 210 en Kagan, terwijl HIST 202 er 13 heeft.
   Rangschik titeltreffers eerst, daarna `ts_rank` op `search_tsv`. Doe dat in één SQL-RPC die zowel de MCP
   als de app gebruikt: migratie met 14-cijferige timestamp, via Supabase MCP `apply_migration`,
   `schema_migrations` +1, RLS/grants volgens de conventie. Bewijs: "Napoleon" zet HIST 202 bovenaan, via de
   echte connector én in de app.
3. **Playlist maakt altijd een nieuwe collectie en vinkt al aanwezige video's aan.** Bied in de review aan:
   "Add to: [bestaande collectie ▾] / New collection (naam playlist)". Standaard de collectie waarin al video's
   van deze playlist staan. Video's met "CAPTIONS IN LIBRARY" staan standaard uitgevinkt en tellen niet als
   gratis plek. Bon en reservering blijven exact gelijk aan wat Python reserveert.
4. **Foutkopij bij PROXY_ERROR op een captions-video** zegt "We couldn't reach this video's audio … Use
   Upload", zonder Retry. Geef in captions-modus de juiste tekst en een Retry-knop (gezien bij CLCV 205
   college 16; los opnieuw geprobeerd → gelukt).
5. **APA-titel:** `buildCitation` neemt de YouTube-titel letterlijk over; APA 7 wil sentence case en
   cursief. Laat de kopieerknop de titel cursief zetten in de rich-text-variant, en zet een kleine hint
   "Check capitals: APA uses sentence case" bij het citaat. Geen automatische sentence-case-conversie
   (eigennamen gaan dan stuk). Werk `docs/guides/library` en `/articles/cite-youtube-video-apa` bij als
   het gedrag verandert.

**B. Koppeling fase 2: "Connected apps"** (ADR-108; nodig voor de directory en voor vertrouwen)
6. In Instellingen een blok **Connected apps**: per gekoppelde client de naam, de host waarheen
   teruggestuurd wordt, wanneer gekoppeld, wanneer laatst gebruikt, en een knop **Disconnect** die alle
   tokens en autorisaties van die client voor deze gebruiker intrekt. Stijl B (`notice.ts`). Leeg →
   "No AI assistants connected" met een link naar `/docs/guides/ai-assistants`. Bewijs: koppel een testclient,
   zie hem staan, ontkoppel, en de volgende MCP-call met dat token krijgt 401. Werk daarna in
   `/docs/guides/ai-assistants` de sectie "Disconnect" bij (Settings → Connected apps in plaats van mailen)
   en haal "intrekken in de app = fase 2" weg uit known-issues.
7. **Privacybeleid** (`apps/marketing/src/app/privacy`): voeg een sectie toe over de AI-koppeling.
   Die is optioneel en door de gebruiker aangezet. Wat er gedeeld wordt: alleen wat de assistent opvraagt,
   dus zoekresultaten, transcriptblokken, bronmetadata en bestaande samenvattingen; geen audio, account of
   betaalgegevens. Na het delen geldt het beleid van de aanbieder (Anthropic/OpenAI). Leg uit hoe je
   ontkoppelt en wat er bewaard blijft (welke OAuth-tokens, hoe lang; lees de echte waarden uit
   `backend/oauth_server.py`). Houd de toon van de bestaande pagina aan. Update de lastmod in de sitemap.

**C. Directory-klaar maken** (Claude Connectors Directory; zoek de actuele eisen eerst op via web_search
op claude.com/support.claude.com, niet uit je geheugen)
8. Loop de actuele indieningseisen na (tool-annotaties, beschrijvingen, privacy-URL, support-contact,
   OAuth-gedrag, testaccount voor reviewers, logo/iconen) en maak alles wat aan onze kant ontbreekt.
   Maak een apart **reviewer-account** (`@indxr.ai`, `is_internal=true`) met een kleine demobibliotheek:
   kopieer 2 collecties uit contact@ door rijen te dupliceren, geen nieuwe extracties. Zet de inloggegevens
   NIET in de repo: zeg in je rapport dat Khidr ze zelf aanmaakt of rouleert. Schrijf alle teksten die
   Khidr in het formulier moet plakken in `docs/marketing/claude-directory/submission.md`, plus een checklist
   van wat hij zelf moet doen.

**D. Opruimen**
9. `apps/marketing/src/lib/editorialAlts.ts` heeft nog entries voor de verwijderde slugs `video-to-text`,
   `supported-formats` en `youtube-video-summarizer`. Haal ze weg als niets ze meer gebruikt.
10. CLAUDE.md: corrigeer de rij "Rate limiting … uit in prod" (Upstash staat aan, LOG 2026-11-09 03:00) en
    de sectie "Geen Sentry / uptime monitoring" (Sentry draait voor de backend; check of er
    uptime-monitoring is en schrijf op wat waar is). Database-backups: besluit Khidr 9-11. Betaalde backups pas als de omzet
    €1–2K is (de verliezen terugverdiend). Zet dat zo in CLAUDE.md en priorities.md. Zet niets aan en
    onderzoek de kosten niet verder.

Docs: LOG.md onderaan, `docs/wiki/roadmap/priorities.md` (sectie "Gevonden 9-11" afvinken), ADR-108
aanvullen voor Connected apps, LESSONS.md als een fout een patroon is. Commit en push zelf, per blok (A, B,
C, D) een commit. Verifieer Vercel + Railway groen. Rapporteer commit-hashes, deploy-status en per punt het
bewijs.

---
