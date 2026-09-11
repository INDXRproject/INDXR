# Beslissing 106: Summary-onderbreker meet uitkomst, niet herstelpogingen + stap-1 truncatie-hardening

**Status:** Geaccepteerd
**Datum:** 2026-09-11
**Gerelateerde code:** `backend/summary_pipeline.py` (`run_summary` onderbreker-blok, `_run_structure`), `backend/test_summary_breaker.py`
**Herziet:** ADR-098 (kostenbewaking AI-samenvatting) — conditie 2. Bouwt voort op ADR-090 (twee-staps), #202 (Gemini-truncatie).

## Context

Tijdens het bouwen van de Product Hunt-demo faalden **4 van 6** AI-samenvatting-pogingen. Diagnose uit de
échte Railway-worker-logs (2026-09-10, deploy 2638a72) — géén gok:

| transcript | breach | secties | kost/min | est_cost | unresolved |
|---|---|---|---|---|---|
| `90281d7f` (116 min) | 1 sectie afgekapt | 13 | €0,0016 | €0,185 | **1** |
| `72c31275` (20 min) | herstel 67% > 50% | **3** | €0,0016 | €0,031 | **0** |
| `5104026a` (13 min) | herstel 100% > 50% | **3** | €0,0033 | €0,043 | **0** |
| (deleted) | `JSONDecodeError` (stap 1) | — | — | — | — |

**De kosten-onderbrekers vuurden nooit** (kost/min €0,0016–0,0033 = ruim onder de €0,02-cap). Twee van de
drie breaker-fires (`72c31275`, `5104026a`) hadden **`unresolved=0`** — élke sectie kwam uiteindelijk schoon
door, de samenvatting was **compleet en correct** — maar werden afgebroken puur omdat
`recovery_share > 50%`. Op een korte video (3 secties) tript die cap al bij 2 herstelde secties.

Onderliggende oorzaak (één, twee symptomen): **Gemini 2.5 Flash trunceert intermitterend** (#202) —
een geldige HTTP-200 met finish_reason `stop`/`max_tokens` waarvan het tekstveld midden in de zin stopt.
1. **Stap 2:** het model-onafhankelijke vangnet (retry→fallback) herstelt de meeste secties → `recovery`
   vuurt vaak. De ADR-098-aanname "herstel-aandeel is 0% op ál het verkeer" (gemeten 2026-08-24) geldt
   niet meer.
2. **Stap 1 (structuur):** had, anders dan stap 2, **geen** truncatie-hardening. Een afgekapte 200 →
   `json.loads` gooit `JSONDecodeError` → de hele job stierf. De gateway-`fallbacks` in de payload vangen
   alleen een non-200, niet een afgekapte 200.

## Beslissing

**A. `recovery_share > SUMMARY_MAX_RECOVERY_SHARE` is geen abort-conditie meer.** Een sectie die na een
retry/fallback alsnog schoon doorkomt (`unresolved=0`) is de vangnet-machinerie die **wérkt** — de
samenvatting is compleet. De onderbreker meet nu uitsluitend de **uitkomst**:
1. `unresolved > 0` — ≥1 sectie ná alle pogingen nog afgekapt (kwaliteitsgrens, ongewijzigd);
2. `eur_per_min > €0,02` (zelf-schalend, ongewijzigd);
3. `est_cost > €1,50` (absolute runaway, ongewijzigd).

`recovery_share`/`recovered` blijven berekend als **health-metriek** (log, debug, rolling baseline,
`admin_summary_cost_panel` "vangnet-aandeel").

**B. Stap 1 (`_run_structure`) krijgt hetzelfde vangnet als stap 2:** na de gateway-call een parse +
volledigheidscheck (JSON parseerbaar én ≥1 sectie); faalt die, dan opnieuw (zelfde model), dan het
fallback-model, vóór de fout doorvalt naar `run_summary_reservation_aware` (volledige refund). Álle calls
(ook de afgekapte retries) tellen mee in `ai_summary_usage_log` (COR-fidelity).

## Rationale

- De kosten van herstel-retries zitten al in `eur_per_min`/`est_cost` (bewezen €0,0008–0,0043/min = ruim
  onder de cap). `recovery_share` was een tweede, indirect kostensignaal dat een **goede uitkomst** strafte.
- Een breaker die "de moeite" meet i.p.v. de uitkomst breekt precies op de gevallen waar het vangnet z'n
  werk deed. Het juiste faalsignaal is `unresolved > 0` (vangnet gaf op), niet `recovery_share` (vangnet
  slaagde).
- Dit is **geen "de cap omhoog"**: de meting was fout, niet de drempel. De kosten zijn niet hoog → het is
  geen pricing-beslissing maar een bug.

## Consequenties

- **Betrouwbaarheid:** verificatie op 5 transcripten van uiteenlopende lengte (incl. de 3 die faalden) →
  **5/5 voltooid in één poging** (was 2/6), alle `unresolved=0`, coverage 99,2–100%, kost/min
  €0,0008–0,0043. `72c31275`/`5104026a` (oude recovery-fires) lopen nu door; `90281d7f` (oude
  `unresolved=1`) herstelde nu volledig (11 secties, unresolved=0).
- **Refund-tak ongewijzigd:** `test_summary_breaker.py` 7/7 groen — de breaker vuurt nog op een echte
  kost/min-breach + volledige teruggave (100→99→100, `credits_refunded=1` als INTEGER-aantal).
- **Nieuw risico:** de breaker vuurt nu minder vaak → als een leverancier-regressie de kwaliteit stil zou
  verlagen zonder `unresolved` te raken, mist de harde onderbreker dat. Vangnet: het `recovery_share`-
  health-signaal (paneel + rolling baseline) + `finish_reason`-verdeling blijven het vroege waarschuwings-
  signaal; die worden gemonitord, niet als abort gebruikt.
- **Observatie (niet gefixt, buiten scope):** veel stap-2-truncaties tonen `finish=max_tokens` — de
  per-sectie `max_tokens`-cap (`base_max`) kan voor sommige fragmenten te krap zijn, wat de herstelfrequentie
  opdrijft. Het vangnet vangt het en de kosten blijven laag; een ruimere `base_max` zou de herstelfrequentie
  kunnen verlagen (aparte afweging, kan kost verhogen).
