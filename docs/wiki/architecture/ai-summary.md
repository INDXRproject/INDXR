# AI-samenvatting — hoe het nu werkt

Deze pagina beschrijft de **huidige toestand** van de AI-samenvatting: de twee modelstappen, het vangnet,
de onderbreker, de creditformule en de bekende beperkingen. De beslisgeschiedenis (waarom het zo groeide)
staat in de ADR's — [090](../decisions/090-ai-summary-two-step-structured.md) (met drie addenda) en
[098](../decisions/098-summary-cost-guardrails.md) (met twee). Als code en deze pagina uiteenlopen, is de
code leidend; werk dan deze pagina bij.

**Bron:** `backend/summary_pipeline.py` (pijplijn + onderbreker), `backend/credit_manager.py`
(`calculate_summary_cost`), `packages/shared/src/lib/pricing.ts` (`summaryCreditCost`, frontend-spiegel).
**Ingang:** `POST /api/ai/summarize` → job op `transcription_jobs` (`source_kind='ai_summary'`) → ARQ
`run_summary_job` → `run_summary_reservation_aware`. Provider: AssemblyAI **EU LLM Gateway** (OpenAI-
compatibel, EU data-residency, ADR-068).

## De twee modelstappen

Een samenvatting wordt in twee stappen gebouwd, gevolgd door een lokale assemblage (geen modelcall):

1. **Stap 1 — structuur** (`_run_structure`). Eén call op `gemini-2.5-flash` (fallback
   `claude-sonnet-4-6`) die het **volledige transcript** leest en een JSON-structuur teruggeeft: een
   `overview` plus een lijst hoofdstukken met `heading`, `description`, `start_time`, `end_time`. Deze
   stap gebruikt **wél** een gestructureerd JSON-schema — de output is kort en machine-gericht, dus
   afkapping is hier geen probleem. Het aantal hoofdstukken ligt tussen een onder- en bovengrens afgeleid
   van de duur (`section_bounds`: ~1 hoofdstuk per 8 min, cap 40); het model kiest binnen die band op
   echte onderwerp-overgangen. Dit is de duurste enkele call bij lange video's (leeskost van ~50k woorden).

2. **Stap 2 — uitwerking** (`_run_section`, parallel begrensd). Per hoofdstuk één call op
   `gemini-2.5-flash` (fallback `claude-haiku-4-5-...`) die het transcriptfragment van dat hoofdstuk
   uitwerkt tot lopende notities. Deze stap vraagt **platte tekst**, geen schema (zie hieronder). De kop
   komt via de `HEADING:`-conventie op de eerste regel (`_parse_section_text`). Een expliciet denkbudget
   van 2048 tokens staat aan (`extra_body.google.thinking_config.thinking_budget`).

3. **Stap 3 — assemblage.** De koppen, tijdstempels en uitgewerkte tekst worden lokaal samengevoegd tot
   `ai_summary` (`schema_version: 2`). Geen modelcall. Het resultaat wordt pas ná de onderbreker-check
   naar `transcripts.ai_summary` geschreven.

**Splitsing tegen verdunning** (`_plan_section_fragments`): een hoofdstuk dat > 2× de mediane
hoofdstukduur van die run is, wordt in gelijke delen (< mediaan) gehakt; elk deel krijgt een eigen stap-2-
call met dezelfde kop, daarna samengevoegd. De **zichtbare** hoofdstukindeling verandert niet — dit houdt
de uitwerkingsdichtheid op peil zodat één lang hoofdstuk niet verdund wordt.

## Waarom stap 2 geen gestructureerd schema gebruikt

Gemini 2.5 Flash/Pro leveren **intermitterend geldige, parseerbare JSON waarvan een lang tekstveld midden
in de zin stopt** — mét `finish_reason=stop` en output-tokens ver onder de limiet (bevestigd op Google's
AI Developers Forum; treedt op mét én zonder schema, denk-tokens dragen bij). Omdat `json.loads` slaagde,
glipte de afkapping langs élk vangnet en leverde afgekapte betaalde samenvattingen (ADR-090 Addendum 3).

De fix: stap 2 vraagt **platte tekst**, waar afkapping direct zichtbaar is i.p.v. gecamoufleerd als
geldige JSON, plus het expliciete denkbudget. Stap 1 houdt het schema (korte, machine-gerichte output —
daar is het risico verwaarloosbaar en de structuur waardevol).

## Het vangnet (model-onafhankelijk)

Na élke stap-2-call draait `_section_ok(content, frag_words)`: de inhoud moet **eindigen op een
zin-afsluitend teken** en **niet onredelijk kort** zijn t.o.v. het fragment (< 4% van de fragmentwoorden
boven 150 woorden). Faalt die check, dan is de call **mislukt ongeacht wat het model teruggaf**. De
pogingen per hoofdstuk zijn:

1. `gemini-2.5-flash` (initieel)
2. `gemini-2.5-flash` (retry, zelfde model)
3. `claude-haiku-4-5-...` (fallback, ander model)

Elke hersteltruc wordt gelogd in `ai_summary_usage_log.recovery` (`retry`/`fallback`). Slaagt geen enkele
poging, dan wordt de langste behouden en de sectie als **onopgelost** gemarkeerd (`safety_net`) — wat de
onderbreker afvangt.

## De onderbreker (`SummaryCostBreaker`, ADR-098)

Ná het loggen van de gateway-kost (die is al gemaakt en hoort geboekt), vóór de assemblage, stopt
`run_summary` de run bij een van vier condities:

1. **≥1 onopgeloste sectie** (nog afgekapt na alle pogingen) — een afgekapte betaalde samenvatting mag
   nooit geleverd worden;
2. **herstel-aandeel > 50%** van de secties — systematisch modelfalen;
3. **kost/minuut > €0,02** — een per-eenheid-explosie (zelf-schalend, straft geen lange video's);
4. **absolute kost > €1,50** — vangnet-plafond voor absurd lange input.

Bij overschrijding refundt de `run_summary_reservation_aware`-wrapper **alle** credits en zet
`status=error` met een duidelijke user-message. Alle grenzen zijn env-overridebaar
(`SUMMARY_MAX_RECOVERY_SHARE`, `SUMMARY_MAX_EUR_PER_MIN`, `SUMMARY_MAX_COST_EUR`). Dit is de enige
bescherming die zónder toezicht ingrijpt; het Operations-paneel en de nachtelijke rolling-baseline
(`check_summary_cost_baseline`) zijn signalen, geen rem. Zie [monitoring](../operations/monitoring.md)
(sectie Summary cost) voor wat rood betekent.

## De creditformule

`calculate_summary_cost(duration)` = **1 credit per 10 min videoduur, naar boven afgerond, minimum 1**
(⌈duur/600⌉ min 1; 30/60/120/240 min = 3/6/12/24 credits) — ADR-098 Add.3, vereenvoudigd van de oude
basis-3-t/m-30min-staffel (rekenkundig identiek vanaf 30 min; alleen kortere video's werden goedkoper).
`packages/shared/src/lib/pricing.ts` `summaryCreditCost` spiegelt dit exact, geborgd via de gedeelde fixture
`test-fixtures/summary_cost.json` en `scripts/check-playlist-invariants.sh`; de app-weergave (`SummaryTab`,
credits-pagina, kostentabel, artikel) rendert uit die ene bron.

**Financieel pad:** het bedrag komt uit één bron. `POST /api/ai/summarize` berekent `cost` één keer →
`credits_cost` + `reserve_credits`; afrekening en teruggave lezen `credits_reserved` → **reservering ==
afrekening == teruggave**, altijd hetzelfde bedrag. Caption-extractie kost 0 credits; alleen de AI-
samenvatting zelf wordt geheven.

**Onderbouwing van /10** (ADR-098 Add.1/2): de kostprijs **kán niet omlaag** — de kost per 1000
uitvoerwoorden is vlak over álle pijplijn-instellingen (het denkbudget is een inerte kost-hendel op deze
gateway, en verlagen brengt de afkapping terug). Er is dus geen verspilling om weg te snijden; de credit-
slope moet de tokenkost bijhouden. De stap van /20 naar /10 herstelt ~50% netto-marge-na-btw over het hele
duurbereik, ook op het goedkoopste pakket (Power) en in de kost-staart. Een samenvatting kost daarmee
ongeveer **een tiende** van wat het transcriberen van dezelfde video kost.

## Kosten-observatie

Elke gateway-call wordt geboekt in `ai_summary_usage_log` (de COR-bron: model, tokens, `finish_reason`,
`recovery`, `is_test`). Meetverkeer (`summary_health.py`) draagt `is_test=true` → telt in de totaal-COR
maar niet in per-user-marge of het paneel. Drie afgeleiden: het Operations-paneel
(`admin_summary_cost_panel`), de per-user-COR (`admin_summary_cost_per_user`) en de rolling-baseline. De
reproduceerbare gezondheidsmetingen staan in `docs/wiki/testing/summary-health-<datum>.md` (elke run
stempelt zijn instellingen via `summary_pipeline.settings_md()`).

## Bekende beperkingen

- **Hoofdstukaantal ruist.** Voor dezelfde video kiest het model run-tot-run een sterk wisselend aantal
  hoofdstukken (gemeten 9–34 op een 4,5u-video). Dat drijft de kost en maakt A/B-vergelijkingen op één run
  onbetrouwbaar — vergelijk over meerdere runs.
- **Denkbudget is inert.** De gateway honoreert `thinking_budget` niet als harde cap; verlagen bespaart
  niet betrouwbaar en 0/256 herintroduceert afkapping. Daarom staat stap 2 op 2048 en heeft stap 1 géén
  budget (zie ADR-098 Add.1).
- **Model-uitvoer is niet deterministisch.** Regenereren overschrijft de bestaande samenvatting; koppen en
  tekst kunnen licht verschillen. Er is geen aparte "bewerkte" opslag — de weergave is read-only.
- **Intermittente Gemini-truncatie blijft mogelijk** op individuele calls; het vangnet + de onderbreker
  vangen het af (nooit een afgekapte geleverde samenvatting), maar het kost soms een retry/fallback.
- **Geen harde duurlimiet** op de samenvatting zelf; boven ~5 uur worden hoofdstukken langer i.p.v.
  talrijker (plateau bij `SECTION_CAP`).

## Generatie-UX & voortgang (2026-08-25)

De samenvatting-generatie leeft op de **Summary-tab** (`apps/app/src/components/library/SummaryTab.tsx`),
niet meer verstopt in het transcript-overloopmenu. De Summary-tab is nu **altijd aanwezig** (ook zonder
samenvatting) en is de bestemming voor genereren, voortgang én resultaat.

- **Bevestiging = kostenkaart** (zelfde vorm als de transcriptie-cost-card): kost + saldo-na (`BalanceLine`)
  + bij tekort een in-app **Buy credits**-knop (`appHref('/dashboard/credits')`) i.p.v. een dode knop of een
  marketing-`/pricing`-link. Geldt voor eerste generatie én opnieuw genereren. Pure UI — raakt
  reserve/settle/refund niet.
- **Live voortgang (hoofdstuk X van N).** De pijplijn schrijft `transcription_jobs.summary_sections_total`
  (ná stap 1) en `summary_sections_done` (per afgerond hoofdstuk, onder een `asyncio.Lock`); de poll-endpoint
  geeft ze terug. UI: "Analyzing the transcript…" tot het totaal bekend is, daarna "Writing your summary —
  chapter k of N" met een echte balk. De teller wordt **alleen bij niet-terminale status** getoond → bij
  `error`/stale ziet de gebruiker de foutstaat, nooit een bevroren tussenstand.
- **Per-hoofdstuk-doorlooptijd** staat in de meetlaag `ai_summary_usage_log` (`chapter_index`, `chapter_ms`).
- **Dubbel-start:** partiële unieke index (zie [known-issues](../operations/known-issues.md)) — een tweede
  gelijktijdige POST krijgt dezelfde job terug, nooit een tweede reservering.

## Transcript-detailpagina — tabs & toolbar (2026-08-25)

- **Tabs = versies van het document:** Transcript · [Edited] · **Summary (altijd)** · [Edited summary] ·
  [Developer]. Navigatie, niet acties.
- **Weergave-optie:** een zichtbare segmented control **Paragraphs | Timestamps** op de transcript-toolbar
  (was verstopt in het "Display options"-menu). Tekstgrootte blijft in een compact `Aa`-menu.
- **Acties:** primair zichtbaar Copy · Export · Edit/Save+Revert · Find; **Speakers blijft zichtbaar zodra
  het transcript sprekers heeft** (propageert door alle exports, eerste handeling bij een interview).
  Overloop (⋯): alleen Watch on YouTube + Delete. **Summarise/Regenerate is van het transcript-overloopmenu
  naar de Summary-tab verplaatst** (geen functie verdwenen).

## GESLOTEN — lengtespreiding van samenvattingen (2026-08-25, besluit onderaan)

> **Status: GESLOTEN (2026-08-25).** Twee harde grenzen ingevoerd (hoofdstuk ≤ fragment, overview ≤
> transcript); de kortste video blijft op 121% en dat is aanvaard gedrag. Besluit + heropenvoorwaarde staan
> onderaan deze sectie. De rest is de onderbouwende meting.

**Onderzoek (achtergrond).** De samenvattingslengte spreidt sterk, zowel tussen video's als tussen
generaties van dezelfde video. Bij KORTE video's is de samenvatting LANGER dan het transcript; bij LANGE
video's komt hij op ~40% uit. Dezelfde Justice-video, tweemaal door dezelfde pijplijn, gaf 6 hoofdstukken /
1794 woorden (26%) versus 5 hoofdstukken / 3282 woorden (47%) — bijna een verdubbeling. Over 8 generaties
van Justice liepen de output-tokens van 7.310 tot 15.890 (2,2×). Dit is dus GEDRAG, geen toeval.

Ratio (samenvattingswoorden ÷ transcriptwoorden) over alle productie-samenvattingen (2026-08-25):

| video | duur | hfdst | ratio |
|---|---|---|---|
| Designing for Deep Work | 72s | 2 | **172%** |
| Every Wife of the Prophet | 1238s | 3 | 99% |
| Malcolm X (Islam) | 297s | 2 | 94% |
| Pharaoh (Nouman Ali Khan) | 1095s | 2 | 62% |
| Justice | 3282s | 5 | 47% |
| Hamza Yusuf interview | 15231s | 20 | 44% |
| JRE MMA #32 | 9345s | 17 | 39% |

**Conclusie:** de knop is de **stap-2-prompt** — die stuurde op VOLLEDIGE dekking met "≈⅓ van de
fragment-woorden" als niet-bindende richting en ZONDER lengtegrens. Niet de hoofdstukindeling
(minder/langere hoofdstukken gaven juist méér woorden) en niet het denkbudget (raakt reasoning-tokens,
niet de uitvoerlengte). Financieel onschadelijk: COR-spreiding ~€0,026–0,049/samenvatting, ruim binnen de
onderbreker.

**Ingreep (2026-08-25): harde bovengrens op de stap-2-uitwerking.** De sectie-prompt kreeg een HARDE
grens: de uitwerking van een hoofdstuk mag nooit langer zijn dan het fragment zelf (bij korte fragmenten
bindend, bij lange verandert er niets — grondige notities zitten daar al ruim onder). De ≈⅓-richting blijft
binnen die grens, net als de vrijheid om lengte de informatiedichtheid te laten volgen. Gemeten (één
regeneratie per kant):

| video | oud | na stap-2-cap | wat er gebeurde |
|---|---|---|---|
| Deep Work (72s, kortste) | 172% | 129% | stap-2-secties naar 178w < transcript 213w (elk hoofdstuk onder zijn fragment); de grens BINDT |
| Justice (3282s, lang) | 47% | 36% | 36% ≪ 100%-grens → niet-bindend; binnen Justice' natuurlijke spreiding → onaangetast |

**Ingreep 2 (2026-08-25): dezelfde harde grens op de stap-1-overview.** De structuur-prompt kreeg een HARDE
grens tied aan de transcript-lengte: de overview mag nooit langer zijn dan het transcript zelf (bij korte
video's bindend, bij lange niets — een echte high-level overview zit daar ver onder). Opnieuw gemeten met
BEIDE grenzen actief:

| video | vóór | ná beide grenzen | ratio |
|---|---|---|---|
| Deep Work (72s, kortste) | ov 96w / sec 178w = 129% | ov **85w** / sec 173w = 258w | **121%** — nog steeds > 100% |
| Justice (3282s, lang, fixture) | — | ov 125w / sec 3507w = 3632w | **52%** — binnen natuurlijke spreiding, onaangetast |

**BESLUIT (2026-08-25): GESLOTEN.** De kortste video komt niet onder 100% (121%) en dat blijft zo — bewust.
De onderbouwing: een grens die elk DEEL aan zijn eigen bron hangt (hoofdstuk ≤ fragment, overview ≤
transcript) kan de SOM van die delen niet onder 100% dwingen — op Deep Work zaten zowel de secties (173w,
~81%) als de overview (85w) al onder hun eigen bron, en tóch sommeren ze boven het transcript. De enige knop
die het wél onder 100% zou brengen is een grens die STRAKKER is dan de bron, en die voeren we bewust niet in:
zo'n grens zou inhoud kosten bij LANGE video's (waar de dichtheid de lengte hoort te sturen) puur om een
randgeval van 72 seconden te repareren. Bij zeer korte video's is een gestructureerde notitie die iets langer
is dan de ruwe tekst geen defect — de structuur (koppen, tijdstempels, opsomming) heeft waarde die de ruwe
transcriptlengte niet meet.

**Voorwaarde die dit heropent:** gebruikersklachten over te lange samenvattingen bij korte video's, óf
productcopy die expliciet COMPRESSIE belooft (bijv. "korter dan het transcript"). Zolang geen van beide
bestaat, is 121% op een 72-seconden-clip aanvaard gedrag en is dit punt dicht.
