# NU — wat loopt er, wat ligt bij Khidr (één pagina)

Elke chat/sessie werkt deze pagina bij als hij iets start, afrondt of een besluit van Khidr nodig heeft. Kort houden: één regel per onderwerp, details in de gelinkte pagina. Afgerond → regel weg (geschiedenis staat in `LOG.md`).
Bijgewerkt: 2026-11-12 avond (hoofdchat/projectleider).

## Wie doet wat (afspraak 12-11 avond — leidend voor elke chat)
- **Hoofdchat (projectleider):** overzicht, cijfers, marketing/community, besluiten van Khidr, deze pagina. Kleine frontend-/copywijzigingen zelf via GitHub (eerst `git pull`, daarna hier noteren). Schrijft **geen** prompts meer voor de lokale Claude Code; zet nieuwe taken alleen in de wachtrij hieronder.
- **Productchat (test-/bouwchat):** live testen, Sentry + contact@-inbox, en als énige chat prompts voor de lokale Claude Code. Pakt de wachtrij hieronder van boven naar beneden.
- **Claude Code lokaal:** één taak tegelijk, altijd eerst `git pull`; migraties, backend, secrets.
- **Chrome-profiel "INDXR.ai":** wordt door één chat tegelijk gebruikt; Sentry en inbox zijn van de productchat.

## Wachtrij Claude Code (lokaal, van boven naar beneden)
Werkwijze voor Claude Code: pak het bovenste item zonder [x], lees de prompt in het gelinkte bestand en voer die volledig uit (eerst `git pull`). Klaar en geverifieerd → zet [x] met commit-hash, dan het volgende. Iets nodig van Khidr → zet het onder "Ligt bij Khidr" en ga door met wat kan.
1. [x] **Proxy-dataverbruik + spelling-hints-vervolg** (commit `e5400a2`, 2026-11-12) — `roadmap/cc-prompt-2026-11-12-proxy-hints.md`. Format selector audio-only; playlist-dubbelklik + Select-all-indeterminate gefixt; helptekst contextueel; docs/ADR-109 herschreven met de volledige 5,8-uur dataset; LESSONS-regel. Build + check-playlist-invariants.sh groen, Railway + Vercel groen na push.
1b. [x] **Proxy-meting afmaken** (commit `3e8fd11`, 2026-11-13) — 5e video gemeten (TED `yqc9zX04DXs`, 17:41, 0,404 MB/min). Pharma 3× herhaald met de huidige code: elke keer exact 0,351 MB/min in 1 poging, format_id=249 (49 kbps opus, audio-only) — de eerder gerapporteerde 1,633 MB/min was dus geen format-fout maar vermoedelijk een meting met mislukte/herhaalde pogingen (partial-egress telt terecht mee als kost). Alle 5: Dewey 0,470 / MMA 0,735 / Pharma 0,351 / History 0,404 / TED 0,404 — allemaal ≤1,5, allemaal audio-only. Vastgelegd in ADR-110.
2. [ ] **Zotero + citatiestijlen fase 1** (akkoord 12-11) — `roadmap/cc-prompt-2026-11-12-zotero-citations.md`, fase 1.
3. [ ] **Zotero fase 2** (Send to Zotero) — geblokkeerd, zie "Ligt bij Khidr": Zotero-OAuth-app-registratie. Zelfde bestand, fase 2.
4. [ ] **Gratis voorproefje eerste minuut** (akkoord 12-11, niet-storend ontwerp) — `roadmap/cc-prompt-2026-11-12-voorproefje.md`.

## Doel
Eerste betalende klanten. Nu 0. Criterium: terugkerende gebruikers uiterlijk 15-12 (`business/growth-live-status.md` §0).

## Stand 12-11 (Supabase = bron van waarheid, gemeten 5-11 t/m 12-11)
- Nieuwe echte accounts: **0** (enige nieuwe auth-user = intern @indxr.ai, 9-11). Laatste externe signup: 29-10.
- Transcripten/jobs door externe accounts: **0**. Laatste externe transcript: 30-9. Terugkeer: 0. Externe inlogsessies: 0.
- Aankopen: **0** (credit_transactions + Stripe-dashboard; laatste Stripe-betaling juli = test). Balie-offertes: 0 (laatste 3-11).
- Claude-connector: 4 OAuth-clients + 90 tokens sinds 5-11, **allemaal van interne accounts**.
- PostHog (project 155180, test-accounts uitgefilterd): ±32 bezoekers in 7 dagen, 26 `$direct`, claude.ai 1, alternativeto 1, **HN 0, Obsidian-forum 0**. Landingspagina's: /login, /pricing, home.
- Sentry: alle open issues 14 d hebben 0 gebruikers → eigen tests. Playlist-500 (`keyterms`) gefixt 12-11 15:30.
- **Lezing:** het knelpunt is bereik, niet conversie. Reacties zonder link leveren (terecht) geen bezoek op; dat is opwarmen, geen kanaal.

## Top 3 voor de eerste betalende klant
1. **Een moment waarop de doelgroep INDXR ziet** — de opwarmreacties bouwen geloofwaardigheid; bezoek komt pas van een eigen post (Show HN, Obsidian-forum "Share & showcase", r/ObsidianMD) of een reactie op iemand die letterlijk om zo'n tool vraagt. Wanneer: besluit Khidr.
2. **Gratis vindbaar waar MCP-gebruikers zoeken** — officiële MCP Registry (voedt Glama/PulseMCP); kost niets, levert de Claude-koppeling gebruikers die al zoeken.
3. **Betaalmoment na eerste gebruik** — bij een gratis captions-transcript een knop "maak hier een AI-transcript van (X credits)": sprekers, leestekens, alinea's. Bij 10 welkomstcredits loopt iemand daar snel tegen de prijs aan. Gebouwd 12-11 (bibliotheek); meten via `library_ai_upgrade_clicked`.

## Product — loopt
- **Spelling hints (ADR-109):** live 11-11, 3 bugs gefixt 12-11. Andere chat bezig met toepassen + review.
- **Playlists:** keyterms-bug gefixt 12-11. Bekend open: botcheck bij 3 parallelle playlists (`roadmap/priorities.md`, "Gevonden 9-11"); yt-dlp 403-golf (ADR-110-vervolg, andere chat).
- **AI-transcriptknop in de bibliotheek (gat 2, akkoord 12-11):** gebouwd door de hoofdchat, commit `0dc1fe4`. Op een captions-transcript: "Transcribe with AI · N credits" → transcribe-pagina met video + AI vooringevuld → bestaande kostenblok/reservering. Al een AI-versie: "Open AI transcript". Event `library_ai_upgrade_clicked`. Gratis voorproefje eerste minuut: niet gebouwd (apart besluit, kost proxy + AssemblyAI).
- **Google-login:** werkt voor externen (sept: 23 externe Google-aanmeldingen). Wordt in het weekrapport bevestigd bij de eerste nieuwe externe Google-aanmelding; geen actie.

- **Sentry 12-11:** 15 opgeloste issues op resolved gezet door de hoofdchat (A3–A7 MCP, AT/AS kolom, AP tijdelijk bestand, AQ/AR/AK/AN/AM/AJ/72 403/proxy). Bewust open: botcheck, YouTube-429, watchdog-HTTP (6X/61).

## Marketing — loopt
- **Claude-directory:** live sinds 11-11; 0 externe koppelingen tot nu toe.
- **Hacker News (`sinbadbuilds`):** reacties geplaatst 11/12-11 (Algolia toont er 1). Show HN: als Khidr vindt dat we klaar zijn (geen datum).
- **Obsidian-forum (`Sinbad`):** 2 reacties geplaatst 12-11 (Khidr), vastgelegd in `marketing/community/warming-up.md`; de dagronde leest ze voortaan zelf terug.
- **Dagelijkse community-ronde (13:41, aangescherpt 12-11):** leest nu eerst Khidrs geplaatste reacties terug, vergelijkt met het concept en schrijft zijn aanpassingen in `marketing/community/voice.md`; volgende concepten gebruiken dat. Logt per reactie link + punten. Stelt geen Show HN meer voor.
- **Directories:** herziening 12-11 in `marketing/directories/README.md`. Volgende: officiële MCP Registry (gratis). AlternativeTo $5 akkoord; TAAFT eerst gratis route checken.
- **Product Hunt:** na redesign; check 25-11.

## Ligt bij Khidr (besluit of actie)
- Stripe-mail 10-11: vanaf 20-11 toont het dashboard secret keys niet meer; bestaande keys blijven werken. Alleen actie als je een key ergens anders nodig hebt dan in Vercel/Railway.
- **Zotero fase 2 ("Send to Zotero"):** registreer een Zotero-OAuth 1.0a-app (op zotero.org/oauth/apps) voordat dit gebouwd kan worden — meld de applicatienaam/callback-URL die je kiest, dan koppelt Claude Code de key-exchange + Web API v3-writes.
- **Zotero fase 1 verificatie:** fase 1 (CSL-JSON/citeproc/.ris/.bib/citekey) is gebouwd en automatisch getest, maar een echte import in Zotero-desktop en een Obsidian-vault+Pandoc-rendering van `[@citekey]` kon niet vanuit deze headless sessie getest worden (geen GUI-app). Download een `.ris`/`.bib`/CSL-JSON-export van een transcript en probeer 'm zelf in Zotero/Obsidian.

## Toegang per chat (wat kan een chat zelf zien)
- **Hoofdchat in Claude-app, gekoppeld aan Khidrs computer (12-11):** docs/wiki lezen+schrijven (Obsidian-MCP, alleen `/docs/`, geen broncode, geen shell, geen git push). Chrome-profiel "INDXR.ai" (deviceId `992309b2…`, via `select_browser`): **Supabase** (SQL-editor, alleen-lezen-queries), **Stripe**, **Railway**, **Vercel**, **Sentry** ingelogd; PostHog daar niet ingelogd. **PostHog-INDXR via de connector: `switch-project 155180`** (staat standaard op Zwart op Wit). contact@-mailbox via Fastmail-connector (werkwijze labels/regel/handtekening: `operations/mailbox.md`; concepten krijgen handtekening en label `P8DV` niet vanzelf). INDXR-bibliotheek (MCP). Geplande taken lezen/aanpassen. **Repo `INDXRproject/INDXR` gekoppeld (12-11):** eigen clone in de cloud, code lezen/wijzigen, typecheck, commit + push naar master (→ auto-deploy). `pnpm build` lukt daar niet (Google Fonts geblokkeerd): Vercel-build is de buildcheck. **Niet:** Supabase-migraties (geen Supabase-MCP → Claude Code lokaal), Vercel Web Analytics (staat uit). Let op: wijzigingen die de hoofdchat via Obsidian in `docs/wiki/NU.md` en `docs/LOG.md` maakt staan alleen op Khidrs schijf tot Claude Code ze commit.
- **Geplande community-chat (cloud):** repo (code + docs, push), contact@-mailbox, INDXR-bibliotheek (MCP, lezen), HN en Obsidian-forum lezen, PostHog via `switch-project 155180`. **Niet:** Supabase, Railway, Vercel, Stripe, Sentry-dashboard, Chrome, Reddit, Khidrs computer.
- Cijfers: Supabase via Chrome in de hoofdchat; herkomst via PostHog-connector (155180).
