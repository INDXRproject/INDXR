# Beslissing 098: Kostenbewaking AI-samenvatting — paneel, onderbreker, baseline

**Status:** Geaccepteerd
**Datum:** 2026-08-24
**Gerelateerde code:** `backend/summary_pipeline.py` (onderbreker), `backend/summary_health.py` (test-verkeer logging), `backend/worker.py` (nachtelijke baseline-cron), `apps/app/src/app/admin/operations/page.tsx` (paneel), migraties `20260824130000_ai_summary_usage_log_is_test.sql`, `20260824135000_admin_summary_cost_panel.sql`, `20260824140000_summary_cost_baseline.sql`

## Context

De ADR-090-truncatiefix voegde een model-onafhankelijk vangnet toe (retry → fallback-model) plus vier
diagnostiek-kolommen (`finish_reason`, `max_tokens_set`, `reasoning_tokens`, `recovery`) aan
`ai_summary_usage_log`. Die kolommen werden nergens getoond en er werd nergens een marge berekend. Twee
gaten bleven:

1. **Zichtbaarheid** — de kostenkant van AI-samenvattingen was onzichtbaar in Operations ("Behaviour, not
   money"). Median/p99-kost per duurklasse, marge, vangnet-gebruik en leverancier-gedrag stonden nergens.
2. **Bescherming** — een paneel beschermt niets: het wordt niet dagelijks geopend. Als het vangnet
   systematisch zou moeten herstellen (leverancier-regressie), liep de kost door zonder rem.
3. **Meetlek** — `summary_health.py --generate` doet echte AssemblyAI-uitgaven (gateway-tokens) die
   nergens werden geboekt. Reële COR die in geen enkele rapportage landde.

## Beslissing

**A. Operations-paneel "Summary cost"** (`admin_summary_cost_panel`, 30d, alleen `is_test=false`):
- Kost per samenvatting als **mediaan én p99**, gesplitst per duurklasse (≤30 min / 30–90 min / >90 min).
  Gemiddelde verbergt wat we zoeken; mediaan toont het normale bereik, p99 legt uitschieters bloot.
- **Marge** per samenvatting = opbrengst − kost, berekend op het **goedkoopste pakket** (Power
  €0,02/credit = worst-case). Getoond als mediaan én slechtste geval, met kleur (rood = verlies).
- **Vangnet-aandeel** van de calls, gesplitst retry vs fallback-model, plus het aantal onopgeloste
  secties (structureel 0 — zie B) en hoe vaak de onderbreker vuurde.
- **Verdeling van finish_reason en model** — het vroegste signaal dat leverancier-gedrag verandert.
- Groen/oranje/rood per waarde zodat het paneel in één oogopslag leesbaar is.

**B. Harde onderbreker per taak** (`SummaryCostBreaker` in `run_summary`). Ná het loggen van de
gateway-kost (die is al gemaakt en hoort geboekt), vóór de assemblage, stopt de run bij:
1. **≥1 sectie ná alle pogingen nog afgekapt** (`safety_net`-marker) — een afgekapte betaalde
   samenvatting mag nooit geleverd worden.
2. **Herstel-aandeel > 50%** van de secties — systematisch modelfalen.
3. **Kost/minuut > €0,02** — een per-eenheid-explosie (zelf-schalend, straft geen lange video's).
4. **Absolute kost > €1,50** — vangnet-plafond voor willekeurige lengte / absurd lange input.

Bij overschrijding: de `run_summary_reservation_aware`-wrapper refundt **alle** credits (`refund_credits`)
en zet `status=error` met een duidelijke user-message ("This summary couldn't be completed and you were
not charged. Please try again — if it keeps happening, contact support@indxr.ai."). Alle grenzen zijn
env-override­baar (`SUMMARY_MAX_RECOVERY_SHARE`, `SUMMARY_MAX_EUR_PER_MIN`, `SUMMARY_MAX_COST_EUR`).

**C. Rolling-baseline** (`check_summary_cost_baseline`, nachtelijk in `fetch_service_metrics`):
vergelijkt de kost/min van de **laatste 7 dagen** met de **basislijn dag 8–37** en logt een WARNING bij
**ratio > 2,0** (de gangbare "verdubbeling"-aanbeveling). Minimum-sample-guard (recent n≥3, prior n≥5)
voorkomt vals alarm op één dure video in een stille week. Elke uitkomst wordt in
`summary_cost_baseline_log` bewaard (queryable).

**D. Meetverkeer geboekt maar geïsoleerd**: `ai_summary_usage_log.is_test`. `summary_health.py --generate`
logt nu zijn gateway-calls met `is_test=true` — de kost telt mee in de totaal-COR maar wordt uit de
per-user-marge en het paneel gefilterd.

**E. Per-user COR** (`admin_summary_cost_per_user`): dezelfde query per `user_id`, zodat een account dat
structureel meer kost dan het oplevert zichtbaar wordt.

## Rationale

**Waarom deze grenzen?** Gemeten over de bestaande taken (2026-08-24, EU-tarief 0,33/2,75 USD/1M):

| Duurklasse | n | kost mediaan | kost p99 | kost max | marge mediaan (Power) | marge worst |
|---|--:|--:|--:|--:|--:|--:|
| ≤30 min | 12 | €0,0108 | €0,0592 | €0,0615 | €0,0492 | **−€0,0015** |
| 30–90 min | 7 | €0,0321 | €0,0861 | €0,0895 | €0,0679 | €0,0105 |
| >90 min | 5 | €0,1681 | €0,4168 | €0,4199 | €0,0319 | **−€0,1199** |

- **Herstel-aandeel = 0%** op ál het verkeer → een cap op 50% vangt systematisch falen zonder ooit op
  gezond verkeer te vuren.
- **Kost/min €0,0006–€0,0030**; €0,02/min ≈ 7× de piek → tript alleen bij een echte explosie.
- **Duurste légale generatie €0,42** (4,2u-video); een vaste absolute cap rond €0,50 zou een legitieme
  5u+-video onterecht onderbreken. Daarom is de **per-minuut-normalisatie** de primaire kostengrens en
  €1,50 (~3,5× de piek) puur een vangnet-plafond.

**Break-even herstelpercentage per pakket.** Opbrengst = credits × €/credit; kost stijgt ~lineair met
elk herstel (een fallback naar Sonnet kost ~6× de output-prijs van Gemini). Uitkomst:
- Op **Try/Starter/Plus** (€0,05 / €0,0375 / €0,025 per credit) is de basiskost sub-cent en de marge zo
  ruim dat een volledige run aan herstelbeurten de opbrengst niet passeert — het break-even ligt buiten
  het bereik van één realistische taak. De 50%-cap is daar dus een **signaalgrens** (systematisch falen),
  niet een economische.
- Op **Power** (€0,02/credit) is de summary voor **lange video's al structureel verliesgevend zónder
  enige pathologie** (>90 min: worst-case marge −€0,12; een 4,2u-video kost €0,42 maar levert 15×€0,02 =
  €0,30 op). Dat is een **prijs**kwestie die het paneel zichtbaar maakt — géén reden om automatisch te
  refunden. De onderbreker bewaakt runaway/systematisch falen, niet de per-samenvatting-winstgevendheid.

**Waarom de onderbreker de enige echte bescherming is.** Het paneel en de baseline-WARNING landen in een
scherm resp. een log die niemand continu bekijkt. Alleen de onderbreker grijpt in zónder toezicht:
hij stopt de taak, geeft de credits terug en meldt het de gebruiker. Dat is de bescherming die werkt
wanneer niemand kijkt.

## Consequenties

- Geen afgekapte betaalde samenvatting kan meer geleverd worden: een onopgeloste sectie → stop + volledige
  teruggave. "Onopgeloste secties" is daarmee structureel 0 in opgeslagen samenvattingen.
- De onderbreker vuurt nu op géén van de bestaande taken (herstel 0%, kost/min ≤ €0,003, max €0,42) — hij
  is een vangnet, geen dagelijkse rem.
- Health-metingen verschijnen voortaan in de totaal-COR (eerlijker), maar niet in per-user-marge/paneel.
- Lange video's op het goedkoopste pakket zijn zichtbaar verliesgevend; of dat een prijsaanpassing vergt
  is een aparte beslissing — het paneel levert nu de data.
- **Wat rood betekent + wat te doen:** zie `docs/wiki/operations/monitoring.md` (sectie Summary cost).

## Addendum 1 (2026-08-24): kosten-tuning lange samenvattingen — onderzoek vóór prijsaanpassing

Vraag: kan de kostprijs van lange samenvattingen omlaag vóór we de prijs aanpassen? Drie knoppen gemeten op twee ~4,5u-video's (10 instellingen × 2 = 20 runs; volledige tabellen + marge-analyse in `docs/wiki/testing/summary-health-2026-08-24.md`, reproduceerbaar via `SUMMARY_STRUCTURE_THINKING_BUDGET` / `SUMMARY_SECTION_THINKING_BUDGET` / `SUMMARY_SECTION_MINUTES`).

**Uitkomst:**
- **Denkbudget (stap 1 én stap 2) is een inerte/zwakke kost-hendel op deze gateway.** Kost/1000-output-woorden is vlak (~€12–17/1k) over álle budgetten; de gateway honoreert `thinking_budget` niet als harde cap (budget "256" gaf soms méér denk-tokens dan unbounded). Budget 0/256 herintroduceerde afkapping (het ADR-090-gedrag). → **Budgetten NIET verlaagd; géén stap-1-budget toegevoegd.** De twee env-knoppen zijn wél toegevoegd (default-behoudend: `SECTION_MINUTES` nu env-tunable; `STRUCTURE_THINKING_BUDGET` default None = ongewijzigd) puur voor meetbaarheid/reproductie.
- **Enige echte hendel = hoofdstuk-ondergrens (`SECTION_MINUTES`), maar niet gratis:** secmin=16 → −16 tot −30% kost maar uitwerking/min −11 tot −28% (diepteverlies); secmin=12 → −6 tot −7% mét gelijke uitwerkingsdichtheid. Goedkoopste kwaliteit-behoudende combinatie = huidige budgetten + optioneel secmin=12. **Gemeten 4-uur-kostprijs blijft ~€0,20–0,22 (mediaan), tail ~€0,42.** Geen verspild denken om weg te snijden — de truncatiefix-kost is echte uitwerking.

**Marge-gevolg (Power €0,02/cr, netto na 21% btw):** de huidige formule (+1 credit/20 min boven 30 min) geeft 78% marge op 30 min maar zakt naar **7–9% (mediaan) en negatief op de tail vanaf ~2u**. Omdat de kost níet omlaag kan, is een formule-aanpassing nodig voor gezonde marge over het hele duurbereik. **Voorstel: +1 credit per 10 min boven 30 min** → ~47–50% netto marge, tail rond break-even (4u: 14→24 credits). Lichter alternatief +1/12 min (4u→21 cr) laat de 4u+-tail licht negatief. **Creditformule bewust NOG NIET gewijzigd — dit addendum is de onderbouwing voor die beslissing.**

## Addendum 2 (2026-08-24): creditformule doorgevoerd — +1 per 10 min

Beslissing uit Addendum 1 doorgevoerd. **`calculate_summary_cost` / `summaryCreditCost`: 3 credits t/m 30 min, daarna +1 per BEGONNEN 10 min** (was /20). Bron: `backend/credit_manager.py` + `packages/shared/src/lib/pricing.ts` (`AI_SUMMARY_STEP_MINUTES = 10`). Reden: de kostprijs kán niet omlaag (kost/1000-uitvoerwoorden vlak over alle instellingen, Add.1), dus de credit-slope moet de tokenkost bijhouden om ~50% netto-marge-na-btw over het hele duurbereik te houden, ook op Power.

**Financieel pad geborgd:** het bedrag komt uit één bron (`calculate_summary_cost`) → reservering, afrekening en teruggave lezen alle drie hetzelfde; de app-weergave (`TranscriptViewer.summaryCost`, credits-pagina, kostentabel, artikel) rendert uit `summaryCreditCost` = exact dezelfde formule. `test_summary_credits.py` groen (23/23, nieuwe verwachtingen). De marge-RPC's (`admin_summary_cost_panel`, `admin_summary_cost_per_user`) spiegelen /600 mee (migratie `20260824150000`), anders toont het paneel een andere marge dan geheven.

**Effect op het paneel (Power, bruto €0,02/cr):** de rode cellen op lange video's zijn weg:

| Duurklasse | marge mediaan (oud → nieuw) | marge worst (oud → nieuw) |
|---|---|---|
| ≤30 min | €0,049 (ongewijzigd — altijd 3 cr) | −€0,0015 (ongewijzigd; één uitschieter, break-even) |
| 30–90 min | €0,068 → **€0,088** | €0,011 → **€0,031** |
| >90 min | €0,032 → **€0,179** | **−€0,120 → +€0,100** |

De enige resterende niet-positieve cel is de ≤30 min-worst (−€0,15 cent, één 20-min-video die uitzonderlijk veel output gaf) — die valt buiten de formule want ≤30 min = altijd 3 credits (basiskost). Verder alles positief; de netto-na-btw-marge (~50%) staat in `docs/wiki/testing/summary-health-2026-08-24.md`.
