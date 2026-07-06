# Unit Economics — kostenbasis per credit

**Laatst geverifieerd:** 2026-07-06
**Bron:** live provider-dashboards + gemeten job-logs (o.a. de 254-min AI-job `JuU8cbz8TYI`, zie [test-reports.md](../operations/test-reports.md)).

> **1 credit = 1 minuut AI-transcriptie** (AssemblyAI-route). Caption-extractie kost 0 credits. Dit document dekt de **variabele** kosten van de AI-route + de vaste infra-kosten. Prijszetting: zie taak 1.21 in [priorities.md](../roadmap/priorities.md) en [ADR-012](../decisions/012-pricing-tiers.md).

---

## Variabele kosten per AI-credit (1 minuut)

| Component | Tarief (geverifieerd) | Kost per minuut |
|---|---|---|
| **AssemblyAI** Universal-3/3.5 Pro | **$0,21/uur** = $0,0035/min | **$0,0035** |
| **Decodo** residentiële proxy (pay-as-you-go) | **$3,25/GB** | **~$0,0023** |
| **Directe kost per credit** | — | **~$0,0058 ≈ €0,0054** |

### AssemblyAI
- Universal-3/3.5 Pro, pay-as-you-go **$0,21/uur = $0,0035/min**.
- ⚠️ **Free-tier bijna op** ($23,57 resterend op 2026-07-06). **Reken vanaf nu met volle pay-as-you-go** — de free-tier is geen buffer meer voor launch-volume.

### Decodo proxy
- Pay-as-you-go **$3,25/GB**.
- **Gemeten** (254-min video `JuU8cbz8TYI`): **185,51 MB** download over 254 min = **0,73 MB/min** → $3,25 × (185,51/1024) = **$0,589 voor de hele video** = **~$0,0023/min**.

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
- **Directe API-kost** (AssemblyAI + Decodo) — ~€0,0054/credit.
- **Vaste infra** (Vercel, Railway, Supabase, Upstash, Resend, domein) — amortiseren over volume.
- **Support-last** — tickets, refunds, gebruikersvragen.
- **Operationeel onderhoud** — proxy-rotatie, watchdog, yt-dlp/Node-upgrades, incident-respons.
- **Ontwikkelarbeid** — honderden uren bouw; moet terugverdiend worden.

**2× kostprijs is niet levensvatbaar voor een SaaS.** De prijszetting in taak 1.21 (cheap tiers ~3× directe kost, Power ~2,2×) is hierop gebaseerd: een steilere, aantrekkelijke volumekorting die de zwaarste gebruikers niet subsidieert, met genoeg marge voor het bovenstaande.

---

## Openstaande externe blocker

- [ ] **AssemblyAI-accountconcurrency-limiet ophalen** (Khidr, bij AssemblyAI). Bepaalt de hard-cap `max_jobs × replicas` vóór horizontaal schalen (zie taak 1.23). Niet uit code/config af te leiden — puur accountlimiet.
