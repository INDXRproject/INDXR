# max_tokens-cap-meting — samenvatting-pijplijn (2026-09-12)

**Taak:** meet de `max_tokens`-cap op `backend/summary_pipeline.py:462`
(`max_tokens = min(16000, 1500 + max_sections * 400)`) over ≥10 echte runs; rapporteer
truncatie-frequentie + kost/min; pas de beslisregel toe (projected kost/min < €0.008 → cap
×1.5 + verifieer dat truncatie daalt; anders laten + rapporteren). Bron: `ai_summary_usage_log`
(productie, `is_test IS NOT TRUE`), 111 calls, 2026-07-11 → 2026-09-10.

## Kernbevinding — de genoemde cap (regel 462) truncateert NOOIT

`ai_summary_usage_log.chapter_index IS NULL` = stap-1 (structuur, regel 462); `IS NOT NULL` =
stap-2 (sectie-uitwerking, een **andere** cap op regel 667). Splitsing over alle echte runs:

| stap | cap-bron | runs | `finish_reason IN (length,max_tokens)` | truncatie-% |
|------|----------|------|----------------------------------------|-------------|
| **stap-1 structuur** | **regel 462** (de taak-cap) | 48 | **0** | **0.0 %** |
| stap-2 sectie | regel 667 `base_max` | 63 | 28 | 44.4 % |

Stap-1 `finish_reason`-verdeling: alleen `stop` (5) en `null` (43, oudere rijen vóór
finish_reason-capture). De 5 recente `stop`-runs eindigden op gemiddeld **69 %** van de cap
(hoogste completion 3319 tok vs cap 3660). Er is dus ruime marge; het model stopt natuurlijk
(`stop`) ruim onder de limiet. **De cap op regel 462 wordt in geen enkele geregistreerde run
geraakt.**

## Beslisregel toegepast op regel 462 → cap LATEN

- **Projected kost/min bij cap ×1.5:** onveranderd t.o.v. nu. De regel-462-cap wordt nooit
  geraakt, dus `min(16000, …)` verhogen naar `min(24000, 2250 + max_sections*600)` verandert het
  aantal daadwerkelijk gegenereerde output-tokens met ~0. Kost/min blijft de bewezen basislijn
  **€0.0016–0.0033/min** (bevestigd in-code op regel 881 en in de taakopdracht; breaker €0.02) →
  ruim onder de €0.008-drempel.
- **Maar de actie is zinloos:** de beslisregel schrijft bij "verhogen" voor om te *"verifiëren
  dat truncatie daalt"*. Truncatie is al **0** → kan niet dalen → dat verificatiecriterium is
  onvervulbaar. De regel is geschreven op de aanname dat regel 462 truncateert; die aanname is
  door de data **weerlegd**.
- **Conclusie:** cap op regel 462 **ongewijzigd gelaten**. Een cap verhogen die nooit wordt
  geraakt, levert nul voordeel en versoepelt alleen een veiligheids-/kostengrens. Geen
  code-wijziging.

## Waar truncatie WÉL zit — stap-2 (`base_max`, regel 667) — buiten deze taak

De 28 `max_tokens`-finishes zitten allemaal in stap-2, met cap `base_max =
_clamp(round(frag_words * 2), 1024, 8000)` (per fragment-woordtelling). Dit is **niet** de cap
die de taak noemt. Herstelpatroon (recovery-kolom):

| recovery | finish_reason | calls | avg completion / cap |
|----------|---------------|-------|----------------------|
| (initieel) | max_tokens | 17 | 1520 / 1524 (99.7 %) |
| (initieel) | stop | 15 | 1913 / 2479 |
| retry (zelfde model+cap) | max_tokens | 11 | 1489 / 1493 (99.7 %) |
| retry | stop | 6 | 1370 / 1725 |
| fallback (Haiku) | end_turn | 11 | 394 / 1451 |

Patroon: een fragment dat te lang is voor `base_max` truncateert op de eerste Gemini-call (17×)
→ de **retry gebruikt dezelfde cap + hetzelfde model** en truncateert daardoor opnieuw (11 van
de 17) → pas de Haiku-**fallback** rondt schoon af (11× `end_turn`, ~394 woorden). De ~11
retry-calls die opnieuw truncateren zijn verspilde tokens.

Dit is een **bekende, bewust geaccepteerde** kost: ADR-106 verwijderde de `recovery_share`-abort
en documenteert dat de recovery-kost binnen €0.0016–0.0033/min blijft (regels 875–884). Het
`_section_ok`-vangnet zorgt dat een getruncateerde sectie nooit als geldig wordt doorgelaten; de
langste kandidaat blijft behouden als geen enkele poging slaagt.

### Aanbeveling voor Khidr (NIET uitgevoerd — buiten scope + financieel-rakend)

Als de stap-2-recovery-verspilling teruggebracht moet worden, is de effectiefste, goedkoopste
ingreep **niet** de cap verhogen maar de **retry overslaan bij `finish_reason=max_tokens`**: een
retry met identieke cap + identiek model produceert deterministisch dezelfde truncatie (11/17
bewijst dat), dus ga direct naar de Haiku-fallback (die schoon afrondt). Alternatief: `base_max`
ophogen (bv. `frag_words * 2` → `* 3`, of de vloer 1024 → 1536). Beide raken de token-kost
(financieel) en de samenvattingskwaliteit → **bewust niet gewijzigd in deze taak**; hier
gerapporteerd zodat het een expliciete beslissing van Khidr blijft.

## Meetbasis

- Bron: `ai_summary_usage_log`, `is_test IS NOT TRUE`, 2026-07-11 → 2026-09-10 (111 calls).
- Recente typische samenvatting (sinds 2026-08-20, n=4 summaries): ~42.4k input-tok, ~24.8k
  output-tok, ~17 calls per samenvatting.
- Geen nieuwe runs gestart — de productie-log bevat ruim meer dan de vereiste ≥10 echte runs, en
  nieuwe runs zouden credits/tokens kosten zonder extra informatie.
- Ledger/refund-code niet aangeraakt.
