# Pricing

## Credit Pakketten

INDXR.AI verkoopt credits als eenmalige aankopen (geen abonnement). Credits verlopen niet.

### Weergave op pricing-pagina (3 primaire tiers + 2 quiet links)

| Pakket | Prijs | Credits | €/credit | UI-behandeling |
|--------|-------|---------|----------|----------------|
| **Starter** | €2.99 | 150 | €0.01993 | Quiet tekst-link ("Need fewer?") |
| **Basic** | €6.99 | 500 | €0.01398 | Primaire kaart |
| **Plus** ★ | €13.99 | 1.200 | €0.01166 | Primaire kaart, featured |
| **Pro** | €27.99 | 2.800 | €0.00999 | Primaire kaart |
| **Power** | €54.99 | 6.000 | €0.00916 | Quiet tekst-link ("Larger volumes?") |

★ = "Meest populair" badge in UI (center stage pricing)

**Valuta:** EUR. Europese primaire doelgroep; EUR-pricing voelt psychologisch lager aan dan USD.

> ⚠️ **Stripe backend discrepantie:** De `PACKAGES` in `src/app/api/stripe/checkout/route.ts` bevat nog de oude prijzen (Try €2.49/200cr, Basic €5.99/500cr, Plus €11.99/1100cr, Pro €24.99/2600cr, Power €49.99/5500cr). De plan-strings ('try'→Starter, 'basic', 'plus', 'pro', 'power') zijn hetzelfde, maar bedragen en credits moeten bijgewerkt worden vóór launch. Dit staat op de pre-launch checklist.

Zie [ADR-012](../decisions/012-pricing-tiers.md) voor de volledige rationale.

---

## Credit Formule

```
AI-transcriptie: ⌈video_duur_seconden / 60⌉ credits, minimum 1
Playlist captions: 1 credit per video (na de eerste 3 gratis)
AI samenvatting: 3 credits flat
```

| Video duur | Credits (AI-transcriptie) |
|-----------|--------------------------|
| 0–1 min | 1 |
| 5 min | 5 |
| 12 min | 12 |
| 30 min | 30 |
| 1 uur | 60 |

**Caption-extractie is gratis** — geen credits voor enkelvoudige video's met YouTube-captions (~90% van video's).

**Eerste 3 playlist-video's altijd gratis** — auto-captions, automatisch geselecteerd, gelabeld "FREE" in UI.

---

## Gratis Tier

- **25 gratis credits** bij registratie (Welcome Reward) — genoeg voor een kleine playlist of 25 minuten AI-transcriptie
- Caption-extractie (enkelvoudige video): onbeperkt gratis (ook anoniem, 10/dag)
- Playlist metadata preview: onbeperkt (ook anoniem)
- Playlist extractie, AI-transcriptie, audio upload: vereisen account + credits

**Paid user status:** Gratis credits verlenen GEEN paid user status. Betaalde status is permanent na eerste Stripe-aankoop. Zie [ADR-013](../decisions/013-welcome-credits-freemium.md).

---

## Reële gebruikswaarde per pakket

| Pakket | Playlist-video's | AI-transcriptie | Audio uploads | AI samenvattingen |
|--------|----------------|----------------|---------------|------------------|
| Starter (150) | 150 video's | 2,5 uur | 2,5 uur | 50 |
| Basic (500) | 500 video's | 8,3 uur | 8,3 uur | 166 |
| Plus (1.200) | 1.200 video's | 20 uur | 20 uur | 400 |
| Pro (2.800) | 2.800 video's | 46,7 uur | 46,7 uur | 933 |
| Power (6.000) | 6.000 video's | 100 uur | 100 uur | 2.000 |

---

## Kosten & Marges

### COGS per actie (verified)

| Actie | COGS | Bron |
|-------|------|------|
| Auto-caption extractie | ~€0.002 | Proxy (~515 KB) + compute + storage |
| AI-transcriptie 10 min (geoptimaliseerd, Opus 249) | ~€0.045 | AssemblyAI $0.0035/min + proxy ~3.7 MB |
| AI-transcriptie 10 min (huidig, Opus 251) | ~€0.061 | AssemblyAI $0.0035/min + proxy ~10 MB |
| Audio upload AI 10 min | ~€0.036 | AssemblyAI $0.0035/min, geen proxy |
| AI samenvatting | ~€0.001 | DeepSeek V3 ~2K tokens in, ~500 out |

**Aanname:** $2.50/GB voor IPRoyal residentiële proxy is de **schaalprijs**. Huidige testkosten zijn hoger (€12.50/2GB, €18.75/3GB). Margeberekeningen zijn gebaseerd op de schaalprijs — herbereken niet op basis van testkosten.

### Bruto marges per tier (geoptimaliseerde audio)

| Tier | Playlist captions | AI-transcriptie | Audio upload | AI samenvatting (3cr) |
|------|------------------|----------------|-------------|----------------------|
| Try | 92.0% | 67.9% | 71.9% | 97.3% |
| Basic | 91.7% | 66.6% | 70.8% | 97.2% |
| Plus | 90.8% | 63.3% | 67.9% | 96.9% |
| Pro | 89.6% | 58.4% | 63.6% | 96.5% |
| Power | 89.0% | 56.0% | 61.5% | 96.3% |

*Minimum ≥56% marge op de duurste actie (AI-transcriptie, Power-tier) is het ontwerpdoel.*

**Verificatie Power-tier AI-transcriptie:** Revenue €0.00909/cr. COGS €0.004/cr. Marge = (€0.00909 − €0.004) ÷ €0.00909 = **56.0%** ✓

---

## Break-even analyse

Maandelijkse infrastructuurkosten: Railway ($5) + Vercel ($20) + Supabase ($25) = ~**€50/maand**.

| Scenario | Try (€2.49) | Basic (€5.99) | Plus (€11.99) |
|----------|------------|--------------|--------------|
| 100% AI-transcriptie (worst case) | ~30 klanten | ~14 | ~8 |
| Gemengd (40% captions, 50% AI, 10% summary) | ~22 | ~10 | ~5 |

---

## Stripe Configuratie

Geïmplementeerd als **Checkout Sessions** (niet Stripe Payment Links):
- Server-side prijs bepaald in `PACKAGES` object (`checkout/route.ts`) — client stuurt alleen pakket-naam
- `price_data` dynamisch aangemaakt per sessie (geen opgeslagen Stripe Price IDs)
- `mode: 'payment'` (eenmalig, geen subscription)
- `billing_address_collection: 'required'` (EU-factuurverplichting)
- Valuta: EUR

**Stripe metadata** per checkout session:
```json
{"userId": "uuid", "credits": "200"}
```

---

## Concurrentievergelijking

| Concurrent | Model | Effectief $/min |
|-----------|-------|----------------|
| TubeText | $3.99/500 credits (1 cr = 1 video) | ~$0.001/min (captions only) |
| YouTube-Transcript.io | $9.99/mo / 1.000 tokens | ~$0.001/min (captions only) |
| DownloadYouTubeTranscripts | $4.99/100 credits | ~$0.005/min (captions only) |
| TurboScribe | $10/mo onbeperkt | ~$0.02/min typisch gebruik |
| Sonix (PAYG) | $10/uur | $0.167/min |
| Otter.ai Pro | $16.99/mo / 1.200 min | $0.014/min |
| **INDXR.AI Try** | **€2.49/200 credits** | **€0.012/min (AI) of €0.012/video (captions)** |
| **INDXR.AI Power** | **€49.99/5.500 credits** | **€0.009/min (AI) of €0.009/video (captions)** |

INDXR.AI zit laag-tot-mediaan voor AI-transcriptie en hoger dan caption-only tools (gerechtvaardigd door AI-fallback, bibliotheek, en multi-format export).

---

## Marketing Copy Anchors (voor pricing-pagina)

| Angle | Copy |
|-------|------|
| Tijdsbesparing | "Extract een 50-video playlist in 60 seconden. Handmatig? Dat is 3+ uur kopiëren." |
| Per-unit framing | "Elk transcript kost minder dan €0.02." |
| Loss framing | "Stop met uren verspillen aan transcripten één voor één kopiëren." |
| Anchoring | "Een VA zou €50+ rekenen voor hetzelfde werk." |
| No-subscription | "Koop credits eenmalig. Gebruik wanneer je wil. Ze verlopen nooit." |
| Nauwkeurigheid | "YouTube auto-captions: 60% nauwkeurig. Onze AI-transcriptie: 99%." |
| No-extension | "Werkt in elke browser. Geen Chrome-extensie nodig. Plak een URL, krijg een transcript." |

---

## Openstaande Vragen

1. **Storage upgrades:** Moeten library-visibility upgrades (Otter.ai-model, zie ADR-020-toekomstig) met credits betaald worden of als aparte Stripe-aankoop? Mixing van consumable en permanent werkt als de UI dit duidelijk onderscheidt ("Gebruik Credits" vs. "Unlock Forever").

2. **Markdown export:** Content creators willen `## [00:05:30] Topic heading` stijl. Vereist keuze tussen AssemblyAI chapter detection of tijdsinterval-aanpak.

3. **Referral program:** "5 credits voor referrer + 5 voor referee" is de waarschijnlijke structuur, maar wegwerp-email abuse-preventie moet worden uitgewerkt.

4. **Upstash Redis:** Rate limiting is momenteel uitgeschakeld in productie (no-op limiter). Moet geconfigureerd worden vóór implementatie van de nieuwe tier-gebaseerde rate limits.
