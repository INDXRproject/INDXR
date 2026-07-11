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
- Model **`deepseek-v4-flash`** (per 2026-07-11; `deepseek-chat` gedeprecieerd 2026-07-24). Echte pricing (cache-miss): **input $0,14/M, output $0,28/M** → ×0,92 EUR = **€0,000129/1k input**, **€0,000258/1k output** (in `cost_config`, apart in/out zodat kost = in-tokens×rate_in + out-tokens×rate_out). Bron: officiële DeepSeek pricing-pagina, geverifieerd 2026-07-11.
- Samenvatting wordt **flat 3 credits** gerekend (ontkoppeld van tokens); de tokens zijn puur voor kost-inzicht. Werkelijke tokens/samenvatting nu gelogd in `transcripts.ai_summary_usage` (ADR-054). Een typische samenvatting (paar duizend tokens in/uit) kost ruim onder €0,001 → 3 credits dekt dit ruimschoots.

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
