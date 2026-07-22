# Writing standard — één bron voor het schrijven van content

**Opgesteld:** 2026-07-23 · **Aard:** synthese-besluit (leest read-only bronnen, wijzigt geen code) · **Doel:** één document dat zegt wát geldt bij het schrijven van élke pagina, in plaats van vier documenten die elkaar tegenspreken. Dit **blokkeert de schrijfronde** tot het staat.

**Status van dit document:** bij een conflict tussen bronnen over een *content-schrijfvraag* wint dit document. Het vervangt de content-/SEO-strategie in `business/INDXR-SITEMAP.md` (2026-04-15, masterplan) en verzamelt de verspreide regels uit content-sitemap, page-structures, design-research en strategy.

**Twee harde ankers waar dit document nooit vanaf wijkt:**
- **Feiten** (prijs, credits, limieten, formaat-/taal-tellingen, modelnamen, accuracy) → [content/product-truth.md](./product-truth.md) + de constanten (`pricing.ts`, `models.ts`). Nooit hardcoded proza.
- **Paginagrenzen** (wat elke pagina bezit/niet herhaalt) → [content/docs-page-contract.md](./docs-page-contract.md) + de docs↔artikel-rolverdeling in [business/content-sitemap.md](../business/content-sitemap.md).

Markering: elke regel die op een **aanname** of op **onderzoek/claims ouder dan ~2026-04** rust is gemarkeerd **[TE VERIFIËREN]** — Khidr toetst die extern aan de huidige industriestandaard. Ruimhartig toegepast; de volledige lijst staat in §D.

---

## §A — Conflictenregister

Elke plek waar de bronnen elkaar tegenspreken, met citaat, bron, en wat geldt.

### A1 — FAQ-strategie (masterplan ↔ reference-doc ↔ content-sitemap)
- **Masterplan** wil FAQ op bijna élke pagina: *"Elke pagina heeft FAQ-sectie → FAQPage schema → AI Overview / People Also Ask"* (`INDXR-SITEMAP.md:775`); schema-tabel geeft FAQPage aan bijna elk type (`:718-727`).
- **reference-doc.md** verbiedt het in docs: *"Geen FAQ binnen reference pages. FAQ leeft als eigen `/docs/faq` pagina. Reference pages beantwoorden één concept grondig — geen Q&A format."* (`reference-doc.md:86-87`).
- **content-sitemap.md**: docs = kale spec, artikel = het verhaal, **geen duplicate content**; FAQ-antwoorden worden korte antwoorden + link naar de bezittende doc (rolverdeling §Docs↔artikel).
- **batch-3a** wil `/faq` juist ontmantelen: *"FAQ pages are 2010-era IA; modern users search. A single `/docs/faq` pile competes with itself for SEO … each FAQ becomes a focused article"* (batch-3a §1.4).
- **WAT GELDT:** (a) **Docs reference pages: GEEN inline FAQ** (reference-doc wint voor `/docs/how-indxr-works/*` + `account-and-data/*`). (b) **Artikelen + marketing (homepage, pricing, tool-artikelen): een FAQ-sectie mét FAQPage-schema mag** — die is er al (templates), en is page-specifiek, dus geen duplicate content. (c) **`/docs/faq`** = de docs-FAQ-index: kort antwoord + link naar de bezittende doc (ADR-073). (d) **Harde regel:** geen enkel FAQ-antwoord staat woordelijk op twee pagina's (single-source). De masterplan-intentie (AI-Overview via FAQPage) blijft dus intact op de artikel-/marketinglaag, zónder de docs te vervuilen.

### A2 — Schema-toewijzing (masterplan-tabel ↔ page-structures ↔ live implementatie)
- **Masterplan-tabel** (`:718-727`): Homepage = SoftwareApplication+Organization+FAQPage+WebApplication; Tool = SoftwareApplication+FAQPage; Feature = +HowTo; Probleem/Comparison/Blog = Article+FAQPage(+HowTo); Pricing = Offer+FAQPage. **Geen BreadcrumbList genoemd.**
- **reference-doc.md:77**: *"Per pagina: TechArticle + BreadcrumbList JSON-LD. Optioneel Dataset."* (voor docs).
- **batch-3b §4.3**: *"Use `Article` schema (not `BlogPosting`) for the SEO articles"*, *"`BreadcrumbList` JSON-LD for each article's hierarchy"*, *"`HowTo` where steps apply"*. **Geen FAQPage genoemd** (opvallend gat in het onderzoek).
- **Live**: docs = TechArticle + CollectionPage + BreadcrumbList; tool-artikelen = SoftwareApplication+Offer+FAQPage; Article-/Tutorial-templates = Article+Person+Organization+FAQPage(+HowTo); pricing = Product+AggregateOffer+FAQPage; about = Organization.
- **WAT GELDT:** neem de **live graaf** als basis (die is grotendeels correct en dekt masterplan + batch-3b), met **twee correcties**: (1) **BreadcrumbList ontbreekt op de 18 artikelen** → toevoegen (batch-3b + masterplan eisen hiërarchie-schema). (2) De **FAQPage-answer-serialisatie dropt ReactNode-antwoorden naar `""`** (templates `typeof a === 'string' ? a : ''`) → FAQ-antwoorden in schema moeten platte string zijn. Zie de schema-tabel in §C6. *"Welk schema beter rankt"* = **[TE VERIFIËREN]**; de types zelf zijn beslist.

### A3 — Dichtheid docs vs artikelen (docs-vs-articles-density.md ↔ batch-3b) — *research wint*
- **docs-vs-articles-density.md** (mijn doc, 2026-07-22): docs = *"smaller — content in `max-w-3xl`"* (`:9`).
- **batch-3b §6.2** (2026-07-03, research): marketing/artikelen *"breathe (**60–70 ch text width**, generous vertical rhythm at **1.5–1.75 line-height**)"*; docs-template = *"**denser typography**, three-column, TOC, sticky anchors"* (§4.3).
- **Conflict:** `max-w-3xl` ≈ 48rem ≈ **~90ch** bij de basisfont — **breder** dan de door het onderzoek aanbevolen leesmaat van 60–75ch.
- **WAT GELDT (research wint):** de docs-content-kolom richt zich op **~65–75ch** (dichter dan `max-w-3xl`), body **line-height 1.5**, artikelen **60–70ch / 1.5–1.75**. **Actie (buiten deze read-only taak):** `docs-vs-articles-density.md` corrigeren van "smaller — `max-w-3xl`" naar de ch-maat uit batch-3b, en de DocsShell-measure daarop afstemmen. Tot dan: schrijvers houden de body kort en scanbaar; de maat is een layout-, geen schrijf-issue.

### A4 — Callouts (DocsCallout ↔ design/system.md)
- **DocsCallout** (ADR-073): drie **doel-gebaseerde** varianten `costs-credits` / `careful` / `requires-account`, in prose, content-oppervlak.
- **design/system.md:488**: *"Single `<Banner>` component met `intent="error"|"warning"|"info"`. Pushen, niet overlay."* — **intentie-gebaseerd**, app-oppervlak (dashboard); + harde **NO-TOASTS**-regel (`:457`); + badge-families `--info`/`--violet` (`:113`).
- **WAT GELDT:** geen hard conflict — **twee oppervlakken**: `DocsCallout` = content (docs/marketing, doel-semantiek), `<Banner>` = app-state (intentie-semantiek). Beide respecteren NO-TOASTS. **Regels:** gebruik in content **alleen** `DocsCallout`; gebruik het app-`Banner` nooit in gepubliceerde content. `costs-credits` deelt het accent-token, `careful` deelt het warning-token — dus geen nieuwe kleuren. **Gat (te melden):** de componenten-inventaris in `design/system.md:623` (Banner/Card/Button/EmptyState/…) noemt de **docs-componenten niet** (DocsCallout/DocsFigure/SourcesBlock/DocsTable/DocsCodeBlock leven in page-structures). Documentatie-gat, geen conflict.

### A5 — llms.txt: prioriteit (masterplan ↔ ADR-039/principles) — *ADR wint*
- **Masterplan**: llms.txt = kerndifferentiator, *"Geen enkele concurrent heeft dit … eerste in de niche"* (`:575`, `:772`).
- **principles.md §7 / ADR-039** (mei 2026): *"llms.txt geen bewezen AI-citation lever … emerging standard zonder bewezen ROI"* (`principles.md:101`).
- **WAT GELDT:** **ADR-039 wint** (nieuwer, expliciet): llms.txt = **low-priority**, geen schrijf-inspanning waard vóór launch. **Maar:** de bestaande drie `llms.txt` zijn *feitelijk fout* (oude 5-tier-prijzen) en moeten hoe dan ook gelijkgetrokken worden met `pricing.ts` (§B2). De vraag "verder investeren in llms.txt" = **[TE VERIFIËREN]** (omstreden aanbeveling — expliciet door de taak gemarkeerd).

### A6 — Docs-structuur (principles.md §6 ↔ ADR-072/073) — *ADR wint*
- **principles.md §6**: *"`/docs/how-to/[slug]` … `/docs/troubleshooting/[slug]` … **Geen derde niveau van nesting (bijv. `/docs/export-formats/markdown`)**"* (`:82-92`).
- **Werkelijkheid (ADR-072/073):** `how-to` + `troubleshooting` zijn **verwijderd** (→ 308 `/articles`); er **is** een derde niveau (`/docs/how-indxr-works/export-formats/markdown`); `how-indxr-works`-nesting is de norm.
- **WAT GELDT:** **ADR-072/073 winnen** (routes winnen, en zijn nieuwer). `principles.md §6` is **stale** → wiki-cleanup: superseded-noot (§E).

### A7 — Productfeiten in de masterplan zijn verouderd (masterplan ↔ product-truth)
- **Formaat-telling:** masterplan *"8 export formats"* (`:117`, `:267`) ↔ live *"Seven formats. Six of them free"* (overview, product-truth). **7, niet 8.**
- **Modelnaam:** masterplan *"AssemblyAI Universal-3 Pro, 99%+ accuracy"* (`:143`) ↔ **Universal-3.5 Pro** taal-router (ADR-070/071).
- **Prijzen:** masterplan 3-tier Basic/Plus/Pro €6.99/13.99/27.99 (`:180-187`) én de llms.txt 5-tier ↔ **4-tier Try €5/100 · Starter €15/400 · Plus €25/1.000 · Power €60/3.000** (ADR-058, `pricing.ts`).
- **RAG-kost:** masterplan *"1 credit per 15 min"* (`:193`) ↔ **1 cr/10 min** (ADR-058).
- **WAT GELDT:** **product-truth.md + de constanten winnen altijd.** De masterplan is een strategie-plan, geen feitenbron. **Regel (hard):** elke feitelijke claim rendert uit een gedeelde constante (§C7).

### A8 — Answer-first: "25 woorden" ↔ DefinitionLeadOpening "40–60 woorden"
- **Masterplan**: *"Begin direct met een definitief antwoord in de eerste 25 woorden — voor featured snippet + AI Overview"* (`:393`).
- **reference-doc.md:32**: DefinitionLeadOpening = *"40–60 woorden … de AI-citation slot"*.
- **batch-3a §4.5**: *"a clear opening sentence that states the answer before the elaboration (Stripe/Plausible pattern)."*
- **WAT GELDT:** deze zijn verenigbaar → **answer-first**: elke pagina opent met het antwoord in de **eerste zin**; docs gebruiken de **DefinitionLeadOpening (40–60 woorden)** met het antwoord vooraan; artikelen openen met de antwoordzin gevolgd door uitwerking. Het specifieke "25-woorden-featured-snippet"-doel = **[TE VERIFIËREN]** (SERP-tactiek, april-2026-claim).

### A9 — Design-research intern (batch-3a ↔ batch-3b) — *3b wint (nieuwer)*
Relevant voor content: **categorie-naam** — batch-3a "Integrations", batch-3b hernoemt naar **"Workflows"** (§4.3, *"Khidr's preferred name"*). content-sitemap gebruikt al "Workflows". → **"Workflows" geldt.** (De overige 3a↔3b-divergenties — Settings-item, Inbox/Messages-label, hexagon-op-werkoppervlak — zijn app-UI, buiten content-scope.)

---

## §B — Wat is nooit (of half) geïmplementeerd

Het masterplan langsgelopen tegen de live code.

| SEO-element (masterplan) | Status | Bewijs / detail |
|---|---|---|
| **robots.txt AI-crawler-allowlist** | **LIVE** | ClaudeBot/ClaudeSearchBot/Claude-User/GPTBot/OAI-SearchBot/ChatGPT-User/PerplexityBot/Googlebot/Bingbot = `Allow`; CCBot + Meta-ExternalAgent = `Disallow`. **Gat:** `Google-Extended` en `anthropic-ai` staan er **niet** (vallen onder `*` = default-allow). |
| **llms.txt** | **HALF / STALE** | 3 bestanden; app-kopieën identiek, `public/llms.txt` wijkt af (feature-tekst). **Alle drie oude 5-tier-prijzen** (Try €2.49/150 · Basic €5.99 · Plus €11.99 · Pro €24.99 · Power €49.99) — Basic/Pro bestaan niet meer. Hoogste-impact feitfout. (ADR-039: low-priority — maar fout moet weg.) |
| **Gesegmenteerde sitemap** | **NEVER** (single volstaat) | Eén platte `sitemap.ts`, **46 URL's**, `priority` per route, `lastModified: new Date()` (build-tijd, geen echte mtimes), `changeFrequency: monthly`. Masterplan wilde `sitemap-pages/features/comparisons/blog.xml`. Voor 46 URL's is segmentatie onnodig — **[TE VERIFIËREN]** of het ooit nodig is (Google adviseert pas bij duizenden URL's). |
| **Bing-indiening / IndexNow** | **NEVER** | 0 hits voor IndexNow-key, `msvalidate`, BingSiteAuth. Alleen Bingbot in robots. Masterplan-claim "Bing = ChatGPT web index" = **[TE VERIFIËREN]**. |
| **JsonLd-component + schema per pagina** | **LIVE** (goed) | `JsonLd.tsx` rendert schema-arrays. Docs=TechArticle+CollectionPage+BreadcrumbList; tool-artikelen=SoftwareApplication+Offer+FAQPage; Article/Tutorial=Article+Person+Organization+FAQPage(+HowTo); pricing=Product+AggregateOffer+FAQPage (data-afgeleid uit `PACKAGES` → blijft correct); about=Organization. **Gaten:** geen BreadcrumbList op de 18 artikelen; FAQPage-antwoord dropt ReactNode → `""`. |
| **FAQPage-schema** | **LIVE, breed** | Elke artikel-template + pricing + `/docs/faq` emitteren FAQPage. (Dus masterplan's "FAQ-everywhere" is grotendeels al gebouwd voor de artikel-/marketinglaag.) |
| **Interne-linkstructuur** | **HALF** | Docs: `RelatedTopicsList` op 14 pagina's — **maar alleen docs→docs**, geen docs→artikel. **Artikelen: 0 interne links** (18 pagina's, geen artikel↔artikel, geen artikel→docs, geen related-footer). De hele artikel-cluster is een **link-eiland**. Masterplan + batch-3a §4.6 eisen juist related-footers + cross-links. |
| **Definitief-antwoord-vooraan** | **HALF** | Docs-overview + accuracy openen met een lede; veel scaffolds nog placeholder; artikelen hebben geen consistente antwoord-eerste-zin. |

**Samenvatting van de gaten die de schrijfronde raken:** (1) llms.txt-prijzen fout → gelijktrekken; (2) BreadcrumbList op artikelen ontbreekt; (3) artikelen missen interne links + related-footers; (4) FAQ-antwoorden moeten platte strings zijn (schema-bug); (5) `Google-Extended`/`anthropic-ai` niet expliciet in robots.

---

## §C — De schrijfstandaard (geldt voor élke pagina)

Per regel: **[BRON]** en of het een **beslissing** of **aanname** is. `[TE VERIFIËREN]` = extern te toetsen.

### C1 — Paginaopening (answer-first)
- Open met het **antwoord in de eerste zin**, dan pas de uitwerking. **[batch-3a §4.5; masterplan :393; beslissing]**
- Docs: een **DefinitionLeadOpening van 40–60 woorden** met het antwoord vooraan (Wikipedia-lede: onderwerp → definitie → context, geen marketing). **[reference-doc.md:31-32; beslissing]**
- Artikelen: de antwoordzin bovenaan, daarna het verhaal/use-case.
- Het "eerste 25 woorden voor featured snippet"-doel is een streven, geen harde limiet. **[masterplan :393; TE VERIFIËREN]**

### C2 — Koppenstructuur & anchors
- Scanbare H2/H3-hiërarchie; **elke H2/H3 via `AnchorHeading`** (click-to-copy anchor, voedt de InPageTOC). **[reference-doc.md §6; beslissing]**
- Docs: `InPageTOC` (rechts, xl+) verschijnt automatisch bij ≥2 koppen. **[ADR-072]**
- Titels autoritair, geen framing ("YouTube Transcript Export Formats", niet "A guide to…"). **[reference-doc.md:29; beslissing]**

### C3 — FAQ-plaatsing
- **Docs reference pages: geen inline FAQ.** **[reference-doc.md:86; beslissing — zie A1]**
- **Artikelen + homepage + pricing: een FAQ-sectie mét FAQPage-schema mag**, mits de antwoorden page-specifiek zijn. **[masterplan; live templates; beslissing]**
- `/docs/faq` = korte antwoorden + link naar de bezittende doc. **[ADR-073]**
- **Geen antwoord staat woordelijk op twee pagina's** (single-source, geen duplicate content). **[content-sitemap; beslissing]**

### C4 — Interne links (het grootste gat)
- **Docs**: sluit af met `RelatedTopicsList` — 3–5 links naar docs-siblings **én het artikel dat het verhaal draagt** (nu alleen docs→docs; docs→artikel toevoegen). **[reference-doc.md §9; content-sitemap rolverdeling; batch-3a §4.6]**
- **Artikelen**: elk artikel eindigt met een **"Related"-sectie: 2–3 gecureerde links** naar sibling-artikelen + de docs-spec van hetzelfde onderwerp. **[batch-3a §4.5-4.6; masterplan :780; beslissing — nu NIET gebouwd, §B]**
- **In-body contextuele links** waar relevant; docs→artikel voor "waarom/wanneer", artikel→docs voor "de exacte spec". **[content-sitemap]**
- De linkgraaf is **handmatig en overwogen, niet auto-gegenereerd** ("overlink and dilute"). **[batch-3a §4.6; beslissing]**

### C5 — Bronvermelding
- **Elke externe feitelijke claim** (taal-tellingen, WER-tiers, subtitle-standaarden, vector-DB-compat) → een gelinkte bron in **`SourcesBlock`** (onderaan, boven RelatedTopicsList). **[ADR-073; reference-doc.md §8]**
- **SPEC-pagina's** noemen de code-bron via `verifiedAgainst` (het bestand waaruit de spec gedestilleerd is). **[docs-page-contract; ADR-073]**

### C6 — Schema per paginatype
Neem de live graaf + de twee correcties. **[live implementatie; batch-3b §4.3; masterplan §9]**

| Paginatype | Schema | Noot |
|---|---|---|
| Docs reference | **TechArticle + BreadcrumbList** | reference-doc.md:77; geen FAQPage |
| Docs hub (`/docs`) | CollectionPage | live |
| `/docs/faq` | **FAQPage** | ADR-073 |
| Artikel (SEO) | **Article** (niet BlogPosting) **+ BreadcrumbList** + FAQPage (+ HowTo bij stappen) | batch-3b §4.3; **BreadcrumbList nu ontbrekend → toevoegen** |
| Tool-artikel | SoftwareApplication + Offer + FAQPage | live |
| Homepage | SoftwareApplication + Organization + FAQPage | masterplan §9 |
| Pricing | Product + AggregateOffer + FAQPage (data-afgeleid uit `PACKAGES`) | live |
- **FAQPage-antwoorden: platte string**, geen ReactNode (anders `text:""` in schema). **[live bug, §A2]**
- *Of een specifiek schema beter rankt* = **[TE VERIFIËREN]**; de types zijn beslist.

### C7 — Feiten & single-source (hard)
- **Elke** prijs, credit-aantal, limiet, formaat-/taal-telling, modelnaam, accuracy-cijfer rendert uit een gedeelde constante — nooit hardcoded proza. **[content-sitemap single-source-regel; product-truth]**
  - Prijzen/credits → `pricing.ts` (`PACKAGES`, `CREDIT_COSTS`, `FREE_TIER`). Euro-bedragen renderen al dynamisch.
  - Modelnamen → `models.ts` (`transcriptionModelName()` = "AssemblyAI Universal-3.5 Pro"; summary = "Gemini 2.5 Flash via de AssemblyAI EU LLM Gateway").
  - Feiten die (nog) geen constante hebben (7 formaten, taal-tellingen 18/99, accuracy) → **importeer of centraliseer**, hardcode niet. Bron van waarheid = product-truth.md. **[content-sitemap Laag-2 single-source]**
- **Verboden verouderde waarden:** "8 formats", "Universal-3 Pro", 5-tier/3-tier-prijzen, "1cr/15min", "67 talen" — allemaal stale (zie A7 + product-truth).

### C8 — Figuren
- Via **`DocsFigure`**: **verplicht bijschrift + alt**; vaste aspect-ratio-placeholder (geen layout-shift). Bijschrift zegt **wat de figuur aantoont**, niet wat het is. **Nooit decoratief** — alleen wat tekst niet kan (gerenderde output, UI-state). **[ADR-073; reference-doc.md §6]**
- Geen stockfoto's, geen 3D/Spline, geen Lottie in marketing; custom geometrische illustraties (1.5px stroke, Lucide-gewicht) voor empty states. **[batch-3b §6.2; beslissing]**

### C9 — Callouts
- Alleen **`DocsCallout`** in content, exact drie varianten: `costs-credits` / `careful` / `requires-account`. **Regel: een callout bestaat alleen als het missen ervan geld, data of tijd kost — anders is het een alinea. Max één per sectie.** **[ADR-073]**
- Nooit het app-`<Banner>` in content; geen toasts. **[design/system.md:457,488; A4]**

### C10 — Dichtheid docs vs artikelen
- **Docs** = dichter: 3-koloms shell (nav / content / TOC), compacte typografie, veel tabellen (`DocsTable`) en code (`DocsCodeBlock`), kaal, geen marketing-CTA's. Content-kolom **~65–75ch**, body line-height **1.5**. **[batch-3b §4.3, §6.2 — research wint; A3]**
- **Artikelen** = ruimer: één kolom, **60–70ch**, line-height **1.5–1.75**, related-footer, optionele hero. Verhaal + use-case + conversie. **[batch-3b §6.2; beslissing]**
- Drop cap toegestaan als *één* Itqan-moment in long-form docs-artikelen; niet op elke kop. **[batch-3b §5.3; beslissing]**
- Een docs-pagina die als artikel begint te lezen staat op het verkeerde oppervlak → inkorten tot spec of naar een artikel verplaatsen. **[docs-vs-articles-density.md; content-sitemap]**

### C11 — Toon & aanspreekvorm
- **Tweede persoon "you", informeel, Engels.** Directe, korte werkwoorden (Transcribe, Open, Export, Save). Eerlijk over beperkingen. Volledige zinnen in empty/error-states. Geen onvertaalbare idiomen ("let's go", "we're cooking"). **INDXR is een tool, geen persona** — geen zachte "AI-assistent"-toon, geen speelse Notion-error-toon. **[batch-3a §2.4, §4.3; batch-3b §6.1; de-facto in alle huidige content]**
- **Status:** dit is een **vastgelegde keuze** (consistentie met bestaande content + de research-voice-regels), **maar er is geen tone-of-voice-onderzoek in de wiki** → **[TE VERIFIËREN]** (extern toetsen: formaliteit, aanspreekvorm, of "you" past bij de doelgroep en de internationale markten). Aanspreekvorm/formaliteit is nergens formeel onderzocht — alleen een incidentele informele "je" in NL-voorbeeldcopy (batch-3b §7.1).

### C12 — Crawlers & technische SEO (voor wanneer de schrijfronde raakt aan robots/llms/sitemap)
- **robots.txt** allowlist staat; overweeg `Google-Extended` + `anthropic-ai` expliciet toe te voegen (nu default-allow). **[masterplan :649; §B; TE VERIFIËREN — crawler-landschap wijzigt snel]**
- **llms.txt**: low-priority (ADR-039), maar **prijzen gelijktrekken met `pricing.ts`** (nu 5-tier fout). Verder investeren = **[TE VERIFIËREN]**.
- **Sitemap** blijft één bestand (46 URL's); segmentatie onnodig. **[TE VERIFIËREN of ooit nodig]**
- **Bing/IndexNow** niet gebouwd; waarde = **[TE VERIFIËREN]**.

---

## §D — [TE VERIFIËREN]-lijst (extern te toetsen)

Ruimhartig gemarkeerd; alles hieronder rust op een aanname of op SEO-claims van ~april 2026 of eerder, in een snel bewegend AI-SEO-landschap.

1. **llms.txt als AI-citation-lever** — masterplan zegt kerndifferentiator; ADR-039 zegt onbewezen. Omstreden aanbeveling. (C7/A5/C12)
2. **FAQPage-schema als AI-Overview/PAA-trigger** — masterplan-claim 2026-04. (A1/C3)
3. **Answer-first "eerste 25 woorden" voor featured snippets** — SERP-tactiek 2026-04. (C1/A8)
4. **robots AI-crawler-allowlist-specifics** — welke bots citaties helpen; wel/niet `Google-Extended`/`anthropic-ai` blokkeren. (C12/B)
5. **Bing-indiening = ChatGPT-web-index** + IndexNow-waarde. (C12/B)
6. **Sitemap-segmentatie** — of ooit nodig onder duizenden URL's. (C12/B)
7. **Toon/aanspreekvorm "you"/informeel** — geen tone-of-voice-onderzoek; formaliteit + internationale markten toetsen. (C11)
8. **Welk schema-type beter rankt** (Article vs BlogPosting vs TechArticle; SoftwareApplication voor tool-pagina's). (C6/A2)
9. **Dichtheidsgetallen** (60–70ch, 1.5–1.75) — intern design-research (batch-3b, 2026-07-03), niet extern-gebenchmarkt tegen huidige leesbaarheid-/SEO-standaard. (C10/A3)
10. **`/docs` vs `/articles` slug-neutraliteit voor ranking** — batch-3b-conclusie ("Google rankt niet op slug"); herbevestigen tegen de huidige stand. (A2-context)

---

## §E — Wiki-opschoning (voorstel, niet uitgevoerd)

**Vier sitemap-achtige documenten** overlappen. Voorstel:

| Document | Voorstel | Reden |
|---|---|---|
| **business/content-sitemap.md** | **BRON VAN WAARHEID — content-map** (pagina's, rollen, status, groei-regel) | Actief onderhouden (ADR-072/073); de meest actuele kaart. |
| **architecture/sitemap.md** | **BRON VAN WAARHEID — routestructuur/redirects/nav** — maar **bijwerken** voor ADR-072/073 (nog niet gedaan) | Het routes-document; moet in sync blijven met `next.config.ts` + docs-config. |
| **business/INDXR-SITEMAP.md** (masterplan) | **Header uitbreiden:** "routes vervangen (2026-05-03); **SEO-/content-strategie vervangen door `content/writing-standard.md` (2026-07-23)**" → daarna **archiveerbaar** | Al gemarkeerd VERVANGEN voor routes; de SEO-strategie leeft nu hier. |
| **architecture/sitemap-audit-2026-05.md** | **ARCHIVEREN** (point-in-time audit, historisch) | Momentopname mei-2026; geen levend document. |

**Extra superseded-noten (buiten deze taak uit te voeren):**
- `strategy/principles.md §6` (docs-structuur) → noot "vervangen door ADR-072/073" (A6).
- `strategy/principles.md §7` blijft geldig (ADR-039), maar de masterplan-tegenspraak is nu opgelost in A5.
- `content/docs-vs-articles-density.md` → dichtheids-maat corrigeren naar batch-3b (A3).
- `design/system.md:623` componenten-inventaris → docs-componenten toevoegen (A4).

**INDEX.md**: nieuwe `content/writing-standard.md` opnemen; de vier sitemap-docs met hun nieuwe rol labelen. (Deze taak werkt INDEX bij; de superseded-headers zelf zijn losse follow-ups.)

---

*Volgende stap na dit document: Khidr toetst de §D-lijst extern; daarna kan de schrijfronde per pagina starten met docs-page-contract (grenzen) + product-truth (feiten) + deze standaard (vorm).*
