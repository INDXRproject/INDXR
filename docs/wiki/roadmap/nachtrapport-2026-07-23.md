# Nachtrapport — 2026-07-23 (nachtrun, negen fasen)

**Voor:** Khidr · **Van:** Claude (nachtrun) · **Leesvolgorde:** dit vervangt de scrollback.

Alles hieronder is gebouwd, gebouwd-en-geverifieerd, of bewust-niet-gedaan-met-reden. Elke
commit is groen gebuild (beide apps) en gepusht naar `master`. Live geverifieerd waar vermeld.

**Eerlijke samenvatting van de scope:** de negen fasen zijn samen dagen werk. Ik heb de
**concrete, verifieerbare** fasen (1, 2, 3, 4a, 4b, 5-kernclaims, 8-verificatie) afgemaakt en
live geverifieerd. De **massale herschrijf-fasen** (4-volledig alle docs, 6 twee nieuwe pagina's,
7 alle 18 artikelen) zijn **bewust niet volledig gedaan** — zie per fase waarom en wat er ligt.
De waarheidsregel woog zwaarder dan volume: liever minder pagina's écht kloppend dan veel
pagina's plausibel-maar-ongeverifieerd.

---

## Commits deze nachtrun (remote hashes)

| Fase | Commit | Onderwerp |
|------|--------|-----------|
| 1 | `bf42df0` | app: library-paging in URL, mobile collections, sidebar-trim, NL→EN copy |
| 2 | `c2a3c03` | seo: self-canonicals (44+5 pagina's), robots-policy, dode preview weg |
| 3 | `68e868c` | marketing: artikelbanner (hexagon SVG) + /articles-index geleding |
| 4a+5 | `e6512d5` | content: onverifieerbare accuracy-claims weg, chunk-default 30→60 |
| 4b | `03b3d7c` | docs: credits + billing geschreven (waren KHIDR-stubs) |

*(De hook verschuift de lokale hash bij push; bovenstaande zijn de remote hashes.)*

---

## ⚠️ De belangrijkste lijst: claims die ik heb weggehaald of niet geschreven (waarheidsregel)

1. **"99.4% accuracy" — overal weggehaald.** Er ligt geen vastgelegde meting onder (de
   `StatsFromTesting`-component droeg zelf een "numbers to be written by Khidr"-TODO). Stond op:
   homepage-herostat, `/docs/reference/accuracy`, `/transcribe` audiokaart. Vervangen door wat
   **wél** onderbouwd is: (a) op de homepage een **gemeten snelheidsclaim** (mediaan over 200+
   echte runs ≈ 5% van de audiolengte, product-truth §6.4); (b) op de accuracy-pagina de
   **per-taal WER-banden van AssemblyAI** met bron-URL.
2. **"800+ minutes tested" — weggehaald** (zelfde herostat, zelfde reden: geen vastgelegde meting).
3. **"30-second chunks" (homepage RAG-blok) — gecorrigeerd naar "60 seconds by default,
   adjustable"** — 60 is de echte default (product-truth §2; `RagExportView`).
4. **"private, members-only, or deleted" (Unavailable-sublabel, playlist) — members-only
   weggehaald.** Live bewezen: members-only komen wél binnen en falen pas bij extractie; alleen
   niet-teruggegeven video's tellen in `unavailable_count`.
5. **Purchase-refund-beleid — bewust NIET geschreven** op credits/billing. Dat is een
   launch-blocker-**beslissing** (content-sitemap §Laag2), geen copy. Beide pagina's wijzen naar
   `/terms`; het auto-refund-bij-mislukte-AI-**mechanisme** (code-waar) is wél gedocumenteerd.
6. **Audio-retentie-mechanisme "R2 purged on job complete" — afgezwakt** naar "uploads aren't kept
   once your transcript is made". Ik kon het exacte mechanisme/tijdvenster niet ter plekke tegen de
   code verifiëren; de top-line privacy-claim (audio niet bewaard) is wél de vaste site-belofte.

Nog niet aangeraakt maar bekend-stale (product-truth §4/§6, wachten op fase 7): **"67 talen"**,
**"8 formats"/"six formats nine options"**, losse **"Universal-3"/"Universal-2"**-modelnamen in
de 18 artikelen + `/transcribe`-FAQ. Deze staan nog live. Zie fase 7.

---

## Fase 1 — losse app-punten · commit `bf42df0` · KLAAR (op één na)

- **Library-paginering in de URL** (`?page=N`): deelbaar, browser-Back stapt erdoorheen. Pagina
  leidt af uit `searchParams`; resets zijn `replace()`, expliciet bladeren is `push()`. **Eerste/
  Laatste-knoppen + directe sprong-input** (input verschijnt vanaf >5 pagina's).
- **Collections op mobiel bereikbaar:** de sidebar (die collections draagt) is `hidden md:flex`,
  dus op de Library-pagina een `md:hidden` collections-kiezer toegevoegd die in een collectie en
  terug naar All navigeert. **Beslissing:** geen volledige mobiele CRUD gebouwd — het designsysteem
  schrijft "collections = in-page filter chips" voor (batch-3b), en dit maakt ze bereikbaar zonder
  de desktop-CRUD te dupliceren.
- **Sidebar collections nieuwste-bovenaan** (`order created_at desc`).
- **Opslagmeter + creditweergave uit de sidebar** — beide staan al in de bovenbalk (product-truth
  §5 noemt de drie-dubbele creditweergave). Ongebruikte imports (`useAuth`/`HexagonCreditIcon`/
  `Progress`) opgeruimd.
- **Microcopy:** twee resterende NL-strings → volle Engelse zinnen (AudioTab watchdog-refund-notice;
  `/api/support/submit`-foutmeldingen). De NL-string in `/api/admin/tickets/...` is **admin** →
  niet aangeraakt (buiten scope-regel).

**NIET gedaan — geblokkeerd (databasewijziging, buiten scope):** de **twee welkomstberichten
samenvoegen tot één**. Ze worden allebei **database-side** ingevoegd: "Welcome to INDXR" door
trigger `handle_new_user_message()` (migratie `20260630164156`), "25 welcome credits added 🎉" door
RPC `claim_welcome_reward` (migratie `20260712220428`). Samenvoegen = een migratie op een
trigger/RPC (en die RPC kent óók de 25-credit-grant toe) → valt onder "elke databasewijziging" én
credit-pad → **niet aangeraakt**. **Voor Khidr:** één migratie die (a) de trigger-insert schrapt en
(b) de RPC-message-body vervangt door één samengevoegd bericht met een wegwijzer + link naar
`/docs/quickstart` (in SQL hardcoded marketing-URL, want `marketingHref` is TS). Klaar om te
schrijven zodra jij de DB-wijziging goedkeurt.

- **Microcopy-sweep:** alleen de twee bekende NL-strings gedaan; een volledige knoppen/empty/
  error-sweep over de hele app is **niet** uitputtend gedaan (tijd) — geen andere NL-strings
  gevonden in de grep, maar toon-normalisatie per state blijft open.

---

## Fase 2 — indexatie-fundament · commit `c2a3c03` · KLAAR + LIVE GEVERIFIEERD

- **Self-referencing canonical op elke publieke pagina.** Script injecteerde
  `alternates.canonical` in de 44 statische-metadata-pagina's; home kreeg een metadata-export;
  `/transcribe` via zijn layout; en 3 minimale canonical-layouts voor de client-pagina's
  (contact/login/signup). Routeset = de sitemap. `metadataBase` blijft `https://indxr.ai` (de ene
  canonieke domeinvorm). **Live:** canonical op `/` = `https://indxr.ai`, op een artikel = de eigen
  route. ✓
- **robots.txt herschreven.** Fetch/search-crawlers expliciet toegestaan (OAI-SearchBot,
  ChatGPT-User, **Claude-SearchBot** — stond fout gespeld als "ClaudeSearchBot", viel dus door naar
  `*`, nu correct —, Claude-User, PerplexityBot, **Perplexity-User** toegevoegd). Trainings-crawlers
  **bewust toegestaan** (GPTBot, ClaudeBot, **anthropic-ai** + **Google-Extended** toegevoegd,
  **CCBot omgezet van Disallow→Allow**), met een comment die de keuze vastlegt. **Meta-ExternalAgent
  blijft geblokkeerd** (niet in de opgegeven lijst; bewuste asymmetrie, genoemd in de comment).
  **Live geverifieerd.** ✓
- **`/docs/component-preview` verwijderd** — bewezen ongebruikt (niet in sitemap, docs-config, of
  enige import). **Live:** 404. ✓
- **404-status:** geen custom `not-found` en geen catch-all page-route → Next.js geeft een echte
  404. **Live:** bogus-URL → 404 (geen 200-met-foutpagina). ✓
- **Redirectgraaf** (ongewijzigd, geverifieerd): exact **2 regels** (`/account/credits` → app-account,
  `/faq` → `/docs/faq`), beide één hop, bestemmingen bestaan, geen bronroute staat in de sitemap.

---

## Fase 3 — visuele scaffolding · commit `68e868c` · GEDEELTELIJK (banner + index klaar)

- **Artikelbanner gebouwd** (`ArticleBanner.tsx`): een rustig honeycomb-veld (inline SVG, links
  uitgemaskeerd zodat de titel leesbaar blijft) + een zachte hoek-wash + de titel als tekst. **Geen
  logo.** Alle kleur uit OKLCH-tokens → licht/donker automatisch. Per-categorie-accent, allemaal
  bestaande tokens: Troubleshooting → `--warning`, Export Formats → `--accent`, Workflows →
  `--success`, Deep Dives → `--violet`. **Beslissing: banner behouden** (rustig genoeg — lage
  opacity, één accent, ruime padding, titel blijft leesbaar). Niet als afbeeldingsbestand maar als
  SVG-component, zoals gevraagd.
- Banner ingebed in de 3 templates (Article/Tool/Tutorial) achter een optionele `category`-prop
  (geen regressie als afwezig); alle 18 artikelen getagd met hun categorie (map = /articles-index).
  **Live geverifieerd** (eyebrow "Export formats" op een artikel). ✓
- **/articles-index:** gekleurde per-categorie eyebrow (zelfde accent-mapping) + stip + hairline
  voor geleding, tweekoloms uitgelijnde lijst met ademruimte en hover-kaarten. (/docs-vierblok-
  uitlijning was al eerder gefixt via CSS-columns.)

**Niet gedaan (bewust, tijd):** het "één gedeeld stramien voor élke docs-pagina en élk artikel"-
audit is niet uitgevoerd — templates + DocsShell leggen het meeste stramien al op, maar een
pagina-voor-pagina-normalisatie (opening, TOC-waar-lang, See-also-consistentie) is niet gedaan.
**DocsFigure-slots niet gevuld** (het contract heeft per pagina slot+bijschrift+alt, maar de
afbeeldingen bestaan nog niet — bewust géén lege kaders geplaatst, conform de opdracht). **Mobiele
sweep** niet systematisch gedaan.

---

## Fase 4 — ALLE docs-teksten herschrijven · GEDEELTELIJK

**Eerlijk:** alle ~21 docs-pagina's herschrijven naar de nieuwe leesbaarheidsstandaard, elk met
per-claim code-verificatie, was niet haalbaar binnen deze run zonder de waarheidslat te verlagen.
Ik heb de **twee pagina's die expliciet extra aandacht kregen** volledig gedaan, plus de
canonical-metadata op alle docs (fase 2). De rest van de docs-tekst-herschrijf **ligt open**.

### 4a — `/docs/reference/accuracy` · commit `e6512d5` · KLAAR + LIVE GEVERIFIEERD
- "~99.4% word-level accuracy"-regel **weggehaald**; nu staat er expliciet dat we geen enkel
  kop-cijfer publiceren omdat het je video niet voorspelt.
- De **vier WER-banden mét representatieve talen**, **geverifieerd 2026-07-23** tegen AssemblyAI's
  supported-languages-pagina (18 talen op Universal-3.5 Pro, 99 op Universal-2). De modelketen is
  geframed als **taal-router**, geen fout-terugval. **Verschil t.o.v. de opgegeven indeling:** geen
  materieel verschil — de banden en voorbeelden matchen (EN/ES/FR/DE/NL/IT/PT/JA/RU/SV/TR/UK/PL/ID/CA
  in ≤10%; AR/ZH/HI/KO/DA/EL/HE in 10–25%; Bengaals/Gujarati/Telugu in >50%). Bron-URL in SourcesBlock.
- Live: WER-banden aanwezig, "99.4" weg. ✓

### 4b — `/docs/account/credits` + `/docs/account/billing` · commit `03b3d7c` · KLAAR + LIVE GEVERIFIEERD
- Beide waren KHIDR-stubs met hardcoded getallen. Herschreven naar het docs-contract
  (DefinitionLeadOpening, AnchorHeadings, DocsCallout, SourcesBlock, See-also ≤3), **alle
  credit-getallen uit `pricing.ts`** i.p.v. proza.
- Credits: wat kost credits, reserve→settle→refund (ADR-050), auto-refund bij mislukte AI-operatie,
  nooit verlopen. Billing: one-time packages via Stripe, VAT-inclusief, facturen/historie op Account,
  VAT-landen-scope (NL + EU OSS; UK/CH geblokkeerd, ADR-062).
- **Bewust leeggelaten voor Khidr:** het purchase-refund-**beleid** zelf (launch-blocker-beslissing).
  Beide pagina's wijzen naar `/terms`.

**Open (niet gedaan) in fase 4:** herschrijven van `quickstart`, `how-indxr-works`, `faq`, de 5
guides, de 6 export-format-specs + hub, `summaries`, `limits`, `settings` naar de nieuwe
leesbaarheidsstandaard, mét per-claim hertoetsing tegen de code. Veel hiervan is al fatsoenlijk
geschreven (ADR-072/075), maar de "leg-het-uit-aan-een-leek"-herschrijf die Khidr vroeg is er
**niet** overheen gegaan.

---

## Fase 5 — kernpagina's herschrijven · GEDEELTELIJK (de onware claims eruit)

**Gedaan (commit `e6512d5`):** de twee expliciet genoemde onware homepage-claims (30s-chunks →
60s; 99.4% → gemeten snelheidsclaim) + de 99.4% op `/transcribe`. Homepage-**visuals onaangeraakt**
(Khidr doet hero + Remotion) — alleen tekst.

**Open:** een volledige claim-audit van `/`, `/pricing`, `/about`, `/contact` (opslag/gratis-tier/
formaten/EU-hosting/audio) is **niet** uitputtend gedaan. `/about` heeft nog `[KHIDR]`-lege secties
(content-sitemap). `/contact`-formulier **verstuurt niets** (marketing-`/api/support` bestaat niet;
fake 800ms-delay) — **kapotte functie, niet gefixt** (zie Khidr-lijst). Het videoplan uit fase 5 is
**niet** in `docs/wiki/roadmap/` vastgelegd (tijd) — zie Khidr-lijst.

---

## Fase 6 — twee ontbrekende pagina's · NIET GEDAAN

De YouTube-captions-funnelpagina en de RAG-developer-pagina zijn **niet geschreven**. Nieuwe
pagina's van nul, elk met code-geverifieerde voorbeelduitvoer uit de serializer, pasten niet meer
binnen de run naast de waarheids-fixes. Routes/plek nog te bepalen in de sitemap-wiki. **Ligt open.**

---

## Fase 7 — ALLE 18 artikelen herschrijven · NIET GEDAAN (behalve de banner-haak)

De 18 artikelen zijn **niet** herschreven. Wat wél gebeurde (fase 3): elk artikel kreeg zijn
**categorie-banner**. De inhoudelijke herschrijf — leesbaarheid, See-also-component (≤3, met reden),
en vooral **het hertoetsen van elke claim tegen de code** — is **niet** gedaan. Dit is de grootste
openstaande post en waar de meeste bekende-stale claims nog live staan (67 talen, 8 formats,
losse Universal-3/2-namen — product-truth §4/§6). Aanpak-advies: per artikel product-truth §4 als
checklist, modelnamen via `models.ts`, en een gedeeld `RelatedArticles`-component bouwen.

---

## Fase 8 — SEO-pass · GEDEELTELIJK + LIVE GEVERIFIEERD

- **Sitemap-crawl:** alle **49 sitemap-routes gecrawld → 0 non-200, geen redirect-hops** (bewijs
  met curl, deze run). ✓
- **Canonical + robots + 404:** live geverifieerd (fase 2). ✓
- **Structured data:** de JSON-LD `url`-velden op docs/artikelen zijn volledige, juiste routes; de
  BreadcrumbList op de 18 artikelen ontbrak volgens writing-standard §A2 — **niet toegevoegd** (viel
  onder de niet-uitgevoerde artikel-herschrijf). Een volledige per-pagina structured-data-validatie
  is **niet** gedaan.
- **Unieke titles/descriptions:** elke pagina heeft een eigen metadata-title; een uitputtende
  dubbelen-check binnen lengtegrenzen is **niet** gedaan.
- **INP i.p.v. FID:** niet nagelopen (geen FID-meting gevonden in de grep, maar niet uitputtend).

---

## Wat blijft voor Khidr

1. **Search Console + Bing Webmaster Tools aansluiten** — de site is nog nooit ingediend; canonicals,
   robots en sitemap staan nu correct, dus dit is het moment. (`sitemap.xml` is live en schoon.)
2. **Welkomstberichten samenvoegen** — vergt een DB-migratie (trigger + RPC), buiten mijn
   scope-grenzen. Klaar om te schrijven op jouw sein (fase 1).
3. **Purchase-refund-beleid beslissen** — launch-blocker; credits/billing wijzen nu naar `/terms`,
   waar het beleid moet landen.
4. **`/contact`-formulier repareren** — verstuurt niets (marketing-`/api/support` bestaat niet).
5. **Domein-canonicalisatie op Vercel** — bevestig dat `www.indxr.ai` → apex redirect (metadataBase
   is apex; de redirect zelf zit in Vercel-domainconfig, niet in de code).
6. **De grote openstaande content-fasen:** 4-volledig (docs-herschrijf), 6 (twee nieuwe pagina's),
   7 (18 artikelen + bekende-stale claims: 67 talen / 8 formats / losse modelnamen).
7. **Videoplan** (fase 5) nog vastleggen in `docs/wiki/roadmap/`.
8. **Meta-ExternalAgent** in robots — nu geblokkeerd; als je Meta's AI ook wilt toelaten, één regel.

---

## Bewust overgeslagen (met reden)

- **Massale artikel/docs-herschrijf via subagents** — overwogen en **verworpen**: met drie onware
  claims deze week uit productie gehaald, was het risico dat subagents plausibele-maar-ongeverifieerde
  tekst produceren te groot. Liever minder, écht geverifieerd.
- **DocsFigure-afbeeldingen** — de opdracht zei expliciet "geen lege kaders"; de assets bestaan nog
  niet, dus geen slots geplaatst.
- **llms.txt** — niet teruggezet (ADR-039).

---

# VERVOLG — hervatte run (2026-07-23, na Khidr's terugkoppeling)

Khidr had gelijk: waarheidsgetrouw schrijven kost meer werk per pagina, niet onmogelijk.
Hervat, per-pagina, commit-per-stap.

## Twee correcties op eerder werk
1. **Homepage-snelheidsclaim nu tegen de DB geverifieerd, niet de wiki.** Directe query op
   `transcription_jobs` (status=complete, cache_hit=false): **n=216 runs (2026-04-13→07-20),
   mediaan processing/duration = 0.0536 (~5%), p90 = 0.124**. De claim klopt en is nu naar die
   meting gesourced; "200+ real transcriptions" → "200+ transcription runs", "roughly 5%" →
   "a median of about 5%". Commit `c710c41`.
2. **Sitemap-crawl leest nu de URLs uit de live `sitemap.xml`** (49 URLs, 0 non-200, 0 redirects),
   niet een handmatig lijstje — bewijst de sitemap zelf.

## Artikel-claims-audit — gevonden & gerepareerd (per claim in de commits)
De **grootste vondst** was een kapot cross-link-netwerk én twee inverse-waarheid-claims:

- **Dood cross-link-netwerk (commit `e466e96`):** na ADR-075 (redirects weg) gaven ALLE bare-slug
  interne links 404 — live getest. Gerepareerd site-breed: bare slugs → `/articles/<slug>`,
  `/how-it-works` → `/docs/how-indxr-works`, `/youtube-transcript-generator` → `/transcribe`.
  0 dode bare-links over.
- **non-english these was ONWAAR (commit `5d1499a`):** het artikel beweerde dat caption-extractie
  je een Engelse vertaling geeft (tlang=en). De code doet het tegenovergestelde — native-anchored
  `-orig`-selectie (`youtube_utils.py:337,368-401`, "always the ORIGINAL track, never a translation").
  These omgedraaid: captions geven de ORIGINELE taal.
- **json:155 zelfde inverse claim** ("English translation regardless of original") → gecorrigeerd
  (commit `7749ac9`).
- **"99.4% / 94.1% / 9.97% vs 24.73% Amazon" accuracy-cijfers:** niet meer op
  assemblyai.com/benchmarks (nu Universal-3.5 Pro **4.35% WER**, geverifieerd) → vervangen door
  "~4–5% WER op Engels (AssemblyAI benchmarks)". Commits `e466e96`, `7749ac9`.
- **"67 talen"** → "de talen die YouTube ondersteunt" (geen grondslag). **"99+ talen"** → "99"
  (AssemblyAI Universal-2). **"six/eight formats"** → "seven formats, nine options". Commits
  `e466e96`, `6eeed14`.
- **ZIP "from the playlist results page"** → "select them in your library, bulk-download" — de bulk
  ZIP is library-multiselect (`TranscriptList.tsx:403,469-499`), niet een playlist-pagina. De ZIP
  bestaat wél (ik had de wiki fout vertrouwd; jszip is echt in gebruik).
- **Onverifieerbare test-wall-clock "18m53s voor 783 min audio"** (3 artikelen) → verwijderd
  (2.4%-ratio, sneller dan de gemeten 5.4% mediaan; niet te staven) → capability-framing.

**Bevestigd-correct (NIET aangeraakt na check):** channel-kb "1.650 credits" (math staat er:
1500+150 ✓); chunk-artikel research-%s (54%/69%) zijn gesourced (Vecta/NAACL URLs); playlist
"783 credits" (783 min × 1cr/min ✓).

## Nog te doen in deze hervatte run
- Resterende artikel-claims: obsidian/markdown "Obsidian Web Clipper brak 2×" (extern,
  onverifieerbaar), srt "~20% geen captions" + "EBU 3264" (bron nodig), members-only single-video
  detectie (tegen code checken). 
- Fase 4-volledig (alle docs herschrijven), fase 6 (twee nieuwe pagina's), fase 7-volledig
  (leesbaarheid + SourcesBlock + cross-link-component per artikel).

## Artikel-claims-audit — AFGEROND & LIVE GEVERIFIEERD
De volledige claim-sweep over de 18 artikelen + /transcribe + /pricing + homepage + accuracy is
klaar. Residual-grep over heel `apps/marketing/src`: **clean** (enige "99.4"-hit is een
code-comment die uitlegt dat de claim weg is). Live bevestigd: non-english-these gecorrigeerd,
/transcribe- én /pricing-placeholders weg.

Extra vondsten in deze sweep (bovenop de eerder gerapporteerde), met commit:
- **9 live `[placeholder — Khidr writes: ...]`-FAQ-antwoorden** stonden letterlijk op /transcribe
  (6) en /pricing (3, in het Nederlands) in **productie** → als echte, waarheidsgetrouwe antwoorden
  geschreven (commit `bddf356`). De /transcribe-taal-FAQ droeg nog "67 talen/99+" → gecorrigeerd.
- **srt "About 20% of YouTube videos have no captions"** (onbron'd; de gelinkte YouTube-Help-pagina
  zegt dit niet) → "Plenty of" (commit `bddf356`).
- **Code-geverifieerd TRUE, bewust gelaten:** members-only-detectie single-video
  (`youtube_utils.py:502-509`, `extract/route.ts:96`, `VideoTab.tsx:205`), age-restrictie-detectie
  (`main.py:562`, `transcription_pipeline.py:129`); srt BBC/Netflix/EBU-3264 (echte bron-URLs);
  Web-Clipper-brak-claims (derde partij, met forum-thread-citaat); channel-kb 1.650 credits
  (math klopt); chunk-research-%s (Vecta/NAACL-URLs).

Commits claims-audit: `e466e96` (cross-links + not-available), `6eeed14` (67/99+/formats/ZIP),
`5d1499a` (non-english these), `7749ac9` (json/accuracy/wall-clocks), `bddf356` (placeholders/srt),
`c710c41` (homepage DB-source).

**Wat de audit betekent:** elke gevonden onverifieerbare of onware feitelijke claim in de
artikelen is nu weg of gecorrigeerd met bron. De **fase-7 LEESBAARHEID-herschrijf** (verhaalstijl,
per-artikel SourcesBlock, een gedeeld cross-link/RelatedArticles-component) en **fase 4 (alle docs
herschrijven)** + **fase 6 (twee nieuwe pagina's)** staan nog open — dat is stijl/structuur/nieuwe
content, niet meer live-onwaarheden.

## Fase 4/6/7 — voortgang & beslissingen (hervatte run, vervolg)

- **Fase 4 (docs-leesbaarheid) — patroon vastgezet.** De door Khidr genoemde anti-vorm — de
  **SRT-pagina die van definitie naar milliseconden springt** — is herschreven naar de C11b-vorm
  (gewone "wat" → "wanneer/waarom" → dan pas de syntax). Commit `86d82cd`. Dit is de **exemplar**
  voor de resterende reference-specs. **Nog te doen (zelfde patroon):** txt, markdown, csv, vtt,
  json, export-formats-hub, quickstart, how-indxr-works, faq, de 5 guides, limits, settings. De
  feiten op die pagina's zijn al code-verankerd (ADR-072/075); het is puur de opwarmings-herschrijf.
- **Fase 6 (twee "ontbrekende" pagina's) — BESLISSING: niet blind dupliceren.** Bij verificatie
  tegen de bestaande routes blijkt de gevraagde content grotendeels al te bestaan, en de
  content-sitemap verbiedt expliciet duplicate content (harde regel + groei-regel "nieuwe pagina
  alleen bij aparte zoekintentie"):
  - **RAG-developer-pagina** → al gedekt door **drie** artikelen: `youtube-transcripts-vector-database`
    (letterlijk "transcripten in een vectordatabase laden"), `youtube-transcript-for-rag`,
    `chunk-youtube-transcripts-for-rag`. Een nieuwe pagina zou deze dupliceren en verdunnen.
  - **Captions-funnel-pagina** ("youtube transcript is gratis") → overlapt met de `/transcribe`-tool
    ("Free YouTube Transcript Generator"), `youtube-to-text`, en de homepage.
  **Beslissing:** géén duplicaat gebouwd. Als een nieuwe pagina gewenst is, moet de **aparte
  zoekintentie** die niet al gedekt is expliciet zijn — anders is uitbreiden van een bestaand
  artikel het juiste (content-sitemap groei-regel). Ik heb de serializer-output wél geverifieerd
  (`formatTranscript.ts:283+`: `chunk_id`, `text`, `start_time/end_time`, `deep_link`
  `youtu.be/{id}?t=`, `token_count_estimate` = woorden×1.33, 15% overlap, sentence-snap voor
  AssemblyAI) zodat een eventuele nieuwe/uitgebreide RAG-pagina meteen echte output kan tonen.
- **Fase 7 (artikel-leesbaarheid) — claims klaar, stijl open.** Alle feitelijke onwaarheden zijn
  weg (zie audit hierboven). Wat rest is de **verhaal-herschrijf** + een gedeeld
  **RelatedArticles**-component (See-also ≤3 met reden) + per-artikel SourcesBlock waar externe
  bronnen zijn. Dit is stijl/structuur, geen live-onwaarheid meer.

## Fase 4 — bevinding na lezen van élke docs-opening (niet aangenomen, gelezen)

Ik heb de openingen van alle docs-pagina's gelezen om te bepalen wat écht een herschrijf nodig had,
i.p.v. blind alles te herschrijven (dat zou tegen de chirurgische-wijzigingen-regel ingaan).
**Bevinding: de meeste docs volgen de C11b-leesbaarheidsstandaard al** — ADR-075 heeft die vorm
in juli toegepast. Bewijs (de feitelijke openingen):
- **guides/uploads:** "Uploads let you transcribe a file you already have — a recorded call, a
  podcast, an interview…" ✓ gewone-taal-opening + wanneer/waarom.
- **guides/single-video:** "The single-video tab turns one YouTube link into a transcript. Paste the
  URL…" ✓
- **guides/summaries:** "A summary is a short AI-written overview of a transcript…" ✓
- **reference/export-formats (hub):** "Every transcript downloads in seven formats. The right one
  depends on what you'll do next…" ✓ (en "seven" klopt).
- **reference/limits:** "INDXR enforces a few hard limits: AI transcription up to 10 hours per file,
  uploads up to 500 MB, playlists up to 500 videos…" ✓ correcte getallen, gewone taal.
- **quickstart:** tutorial-template ("Get your first transcript in 3 minutes" + stappen) ✓ action-led.
- **how-indxr-works:** plain DefinitionLeadOpening ✓ (eerder al herschreven).

**De echte gap was de reference-SPECS** die met jargon openden (de anti-vorm die Khidr noemde). Die
zijn nu gewarmd: **srt** (`86d82cd`), **csv** + **vtt** (`8c98ae6`). markdown/txt/json openen al met
gewone framing + gebruik (".md file … drops straight into Obsidian"; "plain text in two variants";
"two kinds of JSON") → gelaten.

**Conclusie fase 4:** grotendeels al op standaard (ADR-075); de drie jargon-eerst-specs zijn
gerepareerd. Een volledige woord-voor-woord herschrijf van álle docs zou churn zijn op pagina's die
de standaard al halen. Als Khidr tóch een specifieke pagina te technisch vindt: noem die pagina,
dan herschrijf ik gericht.

## Fase 7 — stijl-status (claims al klaar)
De 18 artikelen zijn feitelijk waar (audit hierboven) én lezen al grotendeels als verhalen (bv.
`youtube-to-text`, `non-english`, `audio-to-text` hebben een verhaal-opening + use-case). De
cross-links zijn gerepareerd en in-body contextueel. **De resterende concrete fase-7-post** is een
gedeeld **`RelatedArticles`-footer-component** (See-also ≤3 met reden, artikel↔artikel + artikel→docs)
— dat bestaat nog niet als component (artikelen hebben nu wél de `sources`-sectie via de templates,
en de banner via fase 3). Dat is de aanbevolen volgende bouwsteen; wiring over 18 artikelen is de
resterende omvang.

## Eindstand van deze hervatte run
Het **"wrong in productie"-deel — de feitelijke onwaarheden — is volledig weg en live geverifieerd.**
Fase 4 (docs) bleek grotendeels al op standaard; de jargon-specs zijn gerepareerd. Fase 6 is een
gedocumenteerde niet-dupliceren-beslissing. Fase 7-claims klaar; fase-7-stijl resteert als
`RelatedArticles`-component + optionele narratieve politoer. Alles per-commit bewaard, dit rapport
is bijgewerkt naarmate ik vorderde.

## Fase 7 — RelatedArticles-component gebouwd + tweede-ronde claim-catches

- **`RelatedArticles`-footer gebouwd & bekabeld** (commit `edad11c`): sluit het door
  content-sitemap §B gesignaleerde "link-eiland". Gecureerde map (`lib/relatedArticles.ts`, ≤3
  links per artikel mét reden — C4), component, `slug`-prop in de 3 templates, slug in alle 18
  artikelen. Rendert niets bij een lege set. Dit was de concrete structurele fase-7-post.
- **csv + vtt reference-openingen** ook gewarmd (commit `8c98ae6`) — zelfde C11b-fix als srt.
- **Tweede-ronde claim-catches** (gevonden tijdens de RelatedArticles-bekabeling):
  - **bulk "Merged single file — CSV/RAG JSON one array across all videos"** → bestaat NIET in de
    code (bulk-export is ZIP-van-losse-bestanden: `handleBatchDownload`/`handleBulkRagExecute`).
    Verwijderd, herschreven naar het echte library-multiselect-ZIP-gedrag (commit `75784fa`).
  - **"scan shows caption availability"** in bulk, channel-kb én playlist → valse pre-check
    (ADR-076: het reviewscherm toont duur + dedup, checkt captions NIET vooraf). In alle drie weg,
    met de eerlijke skip-plus-refund-noot (commits `75784fa`, `2cf1c17`).

**Wat nu écht rest (optionele politoer, geen live-onwaarheid):** een woord-voor-woord narratieve
herschrijf van artikelen die al als verhaal lezen zou churn zijn; en fase 6 blijft de
gedocumenteerde niet-dupliceren-beslissing. De feitelijke correctheid + structuur (banner,
See-also, cross-links, sources) staan.
