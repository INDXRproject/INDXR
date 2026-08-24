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
