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
