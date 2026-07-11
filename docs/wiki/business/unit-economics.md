# Unit Economics — kostenbasis per credit

**Laatst geverifieerd:** 2026-07-06
**Bron:** live provider-dashboards + gemeten job-logs (o.a. de 254-min AI-job `JuU8cbz8TYI`, zie [test-reports.md](../operations/test-reports.md)).

> **1 credit = 1 minuut AI-transcriptie** (AssemblyAI-route). Caption-extractie kost 0 credits. Dit document dekt de **variabele** kosten van de AI-route + de vaste infra-kosten. Prijszetting is beslist in **[ADR-052](../decisions/052-pricing-restructure-4-tiers.md)** (4 tiers, worst-case-geprijsd) — zie ook [pricing.md](pricing.md).

> **⚠️ Reconciliatie met de pricing-basis (2026-07-09).** Het cijfer **€0,0054/credit** hieronder is een **gunstig één-meting-gemiddelde** (video `JuU8cbz8TYI`, 0,73 MB/min). Voor de prijszetting rekent ADR-052 **conservatiever**: AssemblyAI **€0,0031/cr** + Decodo **~€0,0034/cr** bij een voorzichtiger **~1 MB/min** → **marginaal realistisch ~€0,0065/cr**, **worst-case ~€0,010/cr**. De tiers zijn tegen **worst-case** geprijsd. Behandel €0,0054 als optimistische ondergrens, niet als ontwerpbasis.

---

## Variabele kosten per AI-credit (1 minuut)

| Component | Tarief (geverifieerd) | Kost per credit (EUR) |
|---|---|---|
| **AssemblyAI** Universal-3.5 Pro | **$0,21/uur** = $0,0035/min | **~€0,0031** |
| **Decodo** residentiële proxy (PAYG) | **$3,25/GB**, ~1 MB/min (conservatief) | **~€0,0034** |
| **Marginaal — realistisch** | — | **~€0,0065/cr** (= €0,65/100cr) |
| **Marginaal — worst-case (pricing-basis)** | zware audio / ongunstige proxy-route | **~€0,010/cr** (= €1,00/100cr) |
| *Optimistische ondergrens (1 meting, 0,73 MB/min)* | — | *~€0,0054/cr* |

### AssemblyAI
- Universal-3/3.5 Pro, pay-as-you-go **$0,21/uur = $0,0035/min**.
- ⚠️ **Free-tier bijna op** ($23,57 resterend op 2026-07-06). **Reken vanaf nu met volle pay-as-you-go** — de free-tier is geen buffer meer voor launch-volume.

### Decodo proxy
- Pay-as-you-go **$3,25/GB**.
- **Gemeten** (254-min video `JuU8cbz8TYI`): **185,51 MB** download over 254 min = **0,73 MB/min** → $3,25 × (185,51/1024) = **$0,589 voor de hele video** = **~$0,0023/min**.

### DeepSeek (AI-samenvatting) — aparte kostenpost

**In gewone taal (hoe de kost werkt):** de DeepSeek-response geeft **alleen tokens terug, geen bedrag**. Wij rekenen de kost zelf uit: **kost = tokens × tarief**, waarbij het tarief in `cost_config` staat. DeepSeek splitst de input-tokens in **cache-hit** (goedkoop — herhaalde tekst) en **cache-miss** (duur — nieuwe tekst); daarom loggen we die splitsing per samenvatting, zodat **onze** berekening klopt in plaats van alles als "duur" te rekenen. Een tarief wijzigen = **één rij in `cost_config` bijwerken, geen deploy**. Tijd-afhankelijke pricing (piekuren) staat nu **uit** (`deepseek_peak_multiplier = 1,0`); mocht DeepSeek dat ooit invoeren, dan vul je alleen de vensters + multiplier in `cost_config` in — de piekuren staan dus in config, nooit in de code.

**Precisie-regel (hard):** kost-bedragen worden op **volle precisie** berekend en gesommeerd — **nooit** tussentijds afronden naar centen; afronden **alleen** bij weergave, en dan met genoeg decimalen om sub-cent zichtbaar te houden. `cost_config` staat daarom op hoge precisie (cache-hit-tarief `numeric(18,10)`). Er is op dit moment **nog geen EUR-kostberekening in code** (het admin-kost-dashboard is nog niet gebouwd) → er is dus nergens een premature `round()`/cent-cast in een kost-pad (geverifieerd 2026-07-12; de enige money-`round` is `checkout/route.ts` die de **verkoopprijs** naar Stripe-centen zet — geen kost). Bouw je later de kost-som: sommeer op `numeric`, geen per-rij afronding.

- Model **`deepseek-v4-flash`** (per 2026-07-11; `deepseek-chat` gedeprecieerd 2026-07-24). Officiële pricing per 1M tokens (geverifieerd 2026-07-11, twee bronnen): **input cache-MISS $0,14/M, input cache-HIT $0,0028/M** (50× goedkoper), **output $0,28/M**. ×0,92 EUR in `cost_config`: `deepseek_eur_per_1k_input_tokens`=**€0,000129/1k** (= cache-miss), `deepseek_eur_per_1k_cache_hit_tokens`=**€0,000002576/1k** (cache-hit), `deepseek_eur_per_1k_output_tokens`=**€0,000258/1k**.
- Samenvatting wordt **flat 3 credits** gerekend (ontkoppeld van tokens); de tokens zijn puur voor kost-inzicht. Een typische samenvatting kost ruim onder €0,001 → 3 credits dekt dit ruimschoots.
- **Kost = ECHTE kost, niet tokens×vast tarief (Blok B, 2026-07-11).** De DeepSeek-response geeft de **cache-splitsing** terug (`usage.prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`, met `hit+miss=prompt_tokens`) maar **geen bedrag en geen piek-vlag**. `transcripts.ai_summary_usage` logt daarom nu de splitsing + `deepseek_created` (DeepSeek server-UTC). Echte kost = `hit/1000×hit_rate + miss/1000×miss_rate + completion/1000×out_rate`, daarna `×deepseek_peak_multiplier` als `deepseek_created` binnen een `deepseek_peak_windows_utc`-venster valt. **Live bewezen**: een herhaalde call gaf 512 cache-hit / 21 cache-miss van 533 prompt-tokens → echte kost €0,000030 vs naïef tokens×miss-rate €0,000095 (**3,15× overschatting** zonder de splitsing). Zonder deze fix zou elke cache-hit als volle miss tellen.
- **Tijd-tarief:** de officiële DeepSeek pricing-pagina toont per 2026-07-11 **géén** tijd-gebaseerde (piek/off-peak) pricing → `deepseek_peak_multiplier`=**1,0**, `deepseek_peak_windows_utc`=NULL. De eerdere "2× piek medio-juli"-caveat is **niet bevestigd** op de officiële pagina en vervangen door deze config-hook: activeert DeepSeek ooit tijd-pricing, dan is dat één `cost_config`-rij-update (multiplier + vensters), **geen deploy** — piekuren staan in config, nooit hardcoded in applicatiecode.

### ⚠️ Kost per job varieert — meten, niet schatten
De ~€0,0054/credit is een **gemiddelde uit één meting**. De werkelijke Decodo-kost hangt af van bitrate/bestandsgrootte van de bron-audio (verschilt sterk per video), en AssemblyAI rekent op audio-duur. **De kost per job moet per job gemeten worden** (AssemblyAI-minuten + werkelijk gedownloade Decodo-bytes), niet geëxtrapoleerd uit dit ene cijfer. Zie admin-financieel-dashboard-taak (kost-per-job vastleggen) in [priorities.md](../roadmap/priorities.md).

---

## Vaste maandkosten (infra)

| Dienst | Kost | Notitie |
|---|---|---|
| Vercel | **€20/mnd** | frontend hosting (app + marketing) |
| Railway | **~$6/mnd (Hobby)** → **$20/mnd (Pro)** | API + worker + Redis; Pro bij horizontaal schalen |
| Supabase | (plan-afhankelijk) | DB + auth + storage |
| Upstash Redis | (pay-as-you-go) | ARQ-queue + rate-limit + caption-cache |
| Resend | (plan-afhankelijk) | transactionele + broadcast-email |
| Domein | (jaarlijks) | indxr.ai |

Deze vaste kosten staan **los van** de per-credit variabele kost en moeten in de prijs verdisconteerd worden bovenop de directe API-kost (zie prijs-rationale, taak 1.21).

---

## Waarom prijs ≠ 2× kostprijs

De verkoopprijs per credit moet **méér** dekken dan de directe API-kost:
- **Directe API-kost** (AssemblyAI + Decodo) — realistisch ~€0,0065/credit, worst-case ~€0,010/credit (pricing-basis).
- **Vaste infra** (Vercel, Railway, Supabase, Upstash, Resend, domein) — amortiseren over volume.
- **Support-last** — tickets, refunds, gebruikersvragen.
- **Operationeel onderhoud** — proxy-rotatie, watchdog, yt-dlp/Node-upgrades, incident-respons.
- **Ontwikkelarbeid** — honderden uren bouw; moet terugverdiend worden.

**2× kostprijs is niet levensvatbaar voor een SaaS.** De prijszetting in [ADR-052](../decisions/052-pricing-restructure-4-tiers.md) is hierop gebaseerd: 4 tiers tegen worst-case kost, waarbij de goedkoopste tier de meeste vaste kosten draagt en de volumekorting (Power) de zwaarste gebruikers niet subsidieert — elke tier houdt winst in élk scenario, óók met −20% korting.

---

## Openstaande externe blocker

- [ ] **AssemblyAI-accountconcurrency-limiet ophalen** (Khidr, bij AssemblyAI). Bepaalt de hard-cap `max_jobs × replicas` vóór horizontaal schalen (zie taak 1.23). Niet uit code/config af te leiden — puur accountlimiet.
