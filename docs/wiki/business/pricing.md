# Pricing

**Herzien: 2026-07-09.** 4-tier-model, BTW-inclusief, worst-case-geprijsd. Vervangt het 5-tier-model (Try/Basic/Plus/Pro/Power). Zie [ADR-052](../decisions/052-pricing-restructure-4-tiers.md) voor de volledige rationale; [ADR-012](../decisions/012-pricing-tiers.md) is hierdoor superseded.

INDXR.AI verkoopt credits als **eenmalige** aankopen (geen abonnement). **Credits verlopen nooit** — dit is een bewust *ihsaan*-principe (geen verval-druk, geen "use it or lose it"). Behoud dit; het is een expliciet verkoopargument.

---

## Credit-pakketten (4 tiers)

Alle prijzen zijn **BTW-inclusief** (EU B2C, 21% NL-tarief als referentie; OSS regelt het werkelijke per-land-tarief — zie Tax).

| Tier | Prijs (incl. BTW) | Credits | Bruto €/cr | Netto €/cr (÷1,21) | UI-rol |
|------|-------------------|---------|-----------|--------------------|--------|
| **Test** | €3,49 | 100 | €0,03490 | €0,02884 | Instap / "even proberen" |
| **Starter** | €9,99 | 400 | €0,02498 | €0,02064 | Primaire kaart |
| **Plus** ★ | €24,99 | 1.300 | €0,01922 | €0,01589 | **Anker** (featured, "Meest populair") |
| **Power** | €49,99 | 3.100 | €0,01613 | €0,01333 | Volume / zware gebruikers |

★ = center-stage anker in de UI.

**BTW is doorstroom, geen marge.** De klant betaalt de lijstprijs incl. BTW; wij dragen de BTW af. De **netto omzet = prijs ÷ 1,21**. Alle marge-/winstberekeningen hieronder rekenen op de **netto** €/cr, nooit op de bruto lijstprijs. Input-BTW is verwaarloosbaar: onze zwaarste leveranciers (AssemblyAI, Decodo) zijn US-bedrijven → **reverse-charge**, geen NL-input-BTW om te verrekenen.

---

## Kostenbasis (juli 2026)

Geprijsd tegen **worst-case**, niet gemiddeld — zo blijft elke tier winstgevend ook op de duurste video's en met korting.

| Component | Kost/credit | Bron / aanname |
|-----------|-------------|----------------|
| AssemblyAI (Universal-3.5 Pro) | €0,0031/cr | Transcriptie-minuut; 1 cr = 1 min |
| Decodo (residentiële proxy, PAYG) | ~€0,0034/cr | ~1 MB/min-schatting; varieert per video |
| **Marginaal — realistisch** | **~€0,0065/cr** | = **€0,65 / 100 cr** |
| **Marginaal — worst-case** | **~€0,010/cr** | = **€1,00 / 100 cr** (grote/zware audio, ongunstige proxy-route) |

> De proxy-kost is de grootste variabele en de minst voorspelbare (bytes per video verschillen sterk). Daarom: worst-case als ontwerpbasis. Per-job meten blijft nodig zodra de capture-laag er is (zie known-issues — launch-blocker).

### Vaste infra bij launch (~€70–90/maand)

| Dienst | Plan | Waarom |
|--------|------|--------|
| Railway | Pro | Worker + API, container-Redis voor ARQ |
| Vercel | Pro | Twee projecten (marketing + app) |
| Supabase | Pro | Backups + 8 GB DB (los van Railway — backup-onafhankelijkheid) |
| Resend | Free | Transactioneel + broadcast; Pro pas nodig bij >3.000/mnd of 100/dag-piek |
| Cloudflare R2 | Free tier | Audio/transcript-opslag; **egress gratis** → verwaarloosbaar |
| Upstash | PAYG | Rate-limiter + caption-cache (sporadische serverless calls) |

Vaste infra wordt gedekt door de marge, niet per credit doorbelast. Zie [unit-economics.md](unit-economics.md).

---

## Netto winst per 100 credits

Netto omzet per 100 cr = (bruto €/cr ÷ 1,21) × 100. Winst = netto omzet − kost. Bij **−20% korting** schaalt de netto omzet mee met 0,8 (BTW is proportioneel).

| Tier | Netto omzet /100cr | **Realistisch** (−€0,65) | idem **−20%** | **Worst-case** (−€1,00) | idem **−20%** |
|------|--------------------|--------------------------|---------------|-------------------------|---------------|
| Test | €2,884 | +€2,234 | +€1,657 | +€1,884 | +€1,307 |
| Starter | €2,064 | +€1,414 | +€1,001 | +€1,064 | +€0,651 |
| Plus | €1,589 | +€0,939 | +€0,621 | +€0,589 | +€0,271 |
| Power | €1,333 | +€0,683 | +€0,416 | +€0,333 | **+€0,066** |

**Kernclaim:** elke tier houdt winst in **élk** scenario — óók de duurste tier (Power), tegen worst-case kost, mét de maximale korting. Power worst-case −20% = **+€0,07/100cr**, de dunste cel in de hele matrix en nog steeds positief. Dat is de bewuste ontwerpvloer.

Netto-marge% op lijstprijs, worst-case kost: Test ~65% · Starter ~52% · Plus ~37% · Power ~25%. Op realistische kost: ~78% / ~69% / ~59% / ~51%.

---

## Kortingsbeleid

- **Maximaal −20%**, **uniform over alle tiers**. Nooit dieper.
- **Zeldzaam** ingezet (gerichte campagne, win-back). **Stabiele prijs is de norm** — geen permanente "sale"-sfeer.
- −20% is veilig by design: in élk scenario blijft de winst positief (zie matrix; Power worst-case −20% = +€0,07/100cr).
- **Geen −30%.** Elke −30%-referentie in oudere docs is achterhaald en moet weg.

---

## Valuta & internationale betalingen

- **EUR** is zowel integration- als settlement-currency. Eén valuta, geen handmatige multi-currency-tabellen.
- **USD en overige valuta lopen via Stripe Adaptive Pricing:** de klant ziet en betaalt in de eigen valuta; Stripe rekent de **2–4% conversie door aan de klant**, niet aan ons. Onze **marge blijft 100% intact** in EUR.
- Geen handmatig onderhouden prijzen per land/valuta.

---

## Tax (Stripe Tax)

- **Categorie:** "General – Electronically Supplied Services" (`txcd_10000000`).
- **Prijzen zijn inclusief** belasting ingesteld — de klant ziet de all-in prijs.
- **Stripe Tax OSS** (One-Stop-Shop) regelt automatisch het **per-land-BTW-tarief** binnen de EU; wij dragen via één OSS-aangifte af.
- BTW blijft **doorstroom** (zie boven): netto omzet = lijstprijs ÷ (1 + lokaal tarief). De marges hierboven gebruiken 21% als conservatieve referentie.

---

## Credit-formule (per feature)

```
AI-transcriptie:        ⌈video_duur_seconden / 60⌉ credits, minimum 1   (1 credit = 1 minuut)
Playlist (auto-caption): 1 credit per video, ná de eerste 3 gratis
Playlist (Whisper-video): ⌈duur / 60⌉ credits, min 1, GEEN gratis-korting
AI-samenvatting:         3 credits flat
RAG JSON-export:         ⌈video_duur_seconden / 900⌉ credits, min 1 (1 cr / 15 min), eerste 3 exports gratis
Caption-extractie (los): 0 credits — altijd gratis
```

| Video-duur | AI-transcriptie (cr) | RAG-export (cr) |
|-----------|----------------------|-----------------|
| 0–1 min | 1 | 1 |
| 5 min | 5 | 1 |
| 15 min | 15 | 1 |
| 30 min | 30 | 2 |
| 1 uur | 60 | 4 |

**Caption-extractie van één video is gratis** (~90% van video's heeft YouTube-captions), ook anoniem (10/dag). **Eerste 3 playlist-video's altijd gratis** (auto-captions, gelabeld "FREE" in UI).

---

## Reële gebruikswaarde per tier

| Tier | Credits | AI-transcriptie | Playlist-video's (captions) | AI-samenvattingen (3cr) |
|------|---------|-----------------|-----------------------------|--------------------------|
| Test | 100 | ~1,7 uur | 100 | 33 |
| Starter | 400 | ~6,7 uur | 400 | 133 |
| Plus | 1.300 | ~21,7 uur | 1.300 | 433 |
| Power | 3.100 | ~51,7 uur | 3.100 | 1.033 |

---

## Gratis tier

- **25 gratis credits** bij registratie (Welcome Reward) — genoeg voor ~25 min AI-transcriptie of een kleine playlist.
- Caption-extractie (losse video): onbeperkt gratis (ook anoniem, 10/dag).
- Playlist-metadata preview: onbeperkt (ook anoniem).
- Playlist-extractie, AI-transcriptie, audio-upload: vereisen account + credits.

**Paid-user-status:** gratis credits verlenen **geen** paid-status. Betaalde status is permanent na de eerste Stripe-aankoop. Zie [ADR-013](../decisions/013-welcome-credits-freemium.md).

---

## Stripe-configuratie

Geïmplementeerd als **Checkout Sessions** (niet Payment Links):
- Server-side prijs in `PACKAGES` (`checkout/route.ts`) — client stuurt alleen de pakket-naam.
- `mode: 'payment'` (eenmalig), `billing_address_collection: 'required'` (EU-factuurverplichting).
- Integration- + settlement-currency: **EUR**; internationale valuta via **Adaptive Pricing**.
- **Stripe Tax** aan, categorie `txcd_10000000`, prijzen inclusief, OSS.

> ⚠️ **Sync-taak (apart, niet deze documentatie-taak):** `PACKAGES` in `checkout/route.ts` **en** `packages/shared/src/lib/pricing.ts` bevatten nog het oude 5-tier-model (Try €2,49/150cr … Power €49,99/6000cr) en moeten worden vervangen door de 4 tiers hierboven vóór Stripe live-mode. De Stripe-producten worden in live mode toch opnieuw aangemaakt — stel de nieuwe prijspunten daar in één keer correct in. Zie ADR-052 (consequenties) en priorities 1.13.

---

## Marketing copy anchors (voor pricing-pagina)

| Angle | Copy |
|-------|------|
| Tijdsbesparing | "Extract een 50-video playlist in 60 seconden. Handmatig? Dat is 3+ uur kopiëren." |
| Per-unit framing | "Een uur AI-transcriptie kost minder dan €1 op Power." |
| No-subscription | "Koop credits eenmalig. Gebruik wanneer je wil. Ze verlopen nooit." |
| Nauwkeurigheid | "YouTube auto-captions: ~60% nauwkeurig. Onze AI-transcriptie: ~99%." |
| No-extension | "Werkt in elke browser. Geen extensie. Plak een URL, krijg een transcript." |
| Anchoring | "Een VA zou €50+ rekenen voor hetzelfde werk." |

Effectieve **bruto** prijs per minuut AI-transcriptie (= bruto €/cr, want 1 cr = 1 min): Test €0,035 · Starter €0,025 · Plus €0,019 · Power €0,016. Gebruik Plus/Power voor "vanaf"-copy.

---

## Openstaande vragen

1. **Storage-upgrades:** library-visibility-upgrades met credits of aparte Stripe-aankoop? (Otter.ai-model, ADR-020-toekomstig.)
2. **Referral:** "5+5 credits" waarschijnlijke structuur; wegwerp-email-abuse nog uit te werken.
3. **Rate limiting:** momenteel no-op in productie (Upstash vars verwijderd) — configureren vóór tier-gebaseerde limits. Zie priorities C.3.2 / 1.19.
