# Beslissing 062: Markt-scope + Stripe Radar landguard

**Status:** Geaccepteerd
**Datum:** 2026-07-15
**Gerelateerde code:** Stripe Radar-regel (alleen in het Stripe-dashboard), `apps/app/src/app/api/stripe/webhook/route.ts` (payment_attempts-logging), `supabase/migrations/20260715151000_payment_attempts_and_radar_rate.sql`, `docs/wiki/business/tax-jurisdictions.md`

## Context

INDXR is BTW-geregistreerd in Nederland en heft EU-BTW af via de Unieregeling (OSS). Buiten de EU zijn er landen die van een niet-gevestigde verkoper een **lokale** BTW/GST-registratie eisen **vanaf de eerste verkoop, zonder drempel** (bijv. VK via het HMRC NETP-regime, 20% vanaf sale 1). Zolang die registraties er niet zijn, is elke verkoop naar zo'n land een verkoop die we **fout** afdragen. De prijs is gelijk (alles €-inclusief, ADR-052/058), maar de fiscale verplichting verschilt per land — zie de jurisdictie-tabel.

We willen niet verkopen wat we niet correct kunnen afdragen, en dat **vóór** de charge afvangen (niets om te refunden), niet erna.

## Beslissing

**1. Blokkeer op landniveau met een Stripe Radar-regel** (letterlijke regeltekst — bestaat alleen in het Stripe-dashboard, in geen enkele repo, dus hier vastgelegd):

```
Block if :billing_address_country: in ('GB','CH','KR','TR','IN','BR','UY','OM','RS')
Category: Other
```

**2. Log elke betaalpoging** (`payment_attempts`-tabel) uit de webhook: `outcome.type/reason/rule`, `billing_address_country`, `payment_method_type`, `risk_level`, timestamp. Bij een block verwachten we `outcome.type='blocked'`, `outcome.reason='rule'` en de matchende rule-id in `outcome.rule`. Dit is het bewijs dát de regel werkt — Radar draait alleen op echte pogingen, dus simuleren kan niet.

**3. Radar-kosten als gemeten OPEX** ("Fraud screening (Radar)"): elke gescreende poging (successful + declined + blocked) kost €0,02 (RfFT standaard-pricing; gratis t/m free-trial-einde). Tarief in `cost_config.radar_eur_per_screen` + `radar_free_until`.

## Rationale

- **Waarom `billing_address_country` en niet `card_country`?** `billing_address_country` is exact het veld dat Stripe Tax gebruikt om het BTW-tarief te bepalen (place of supply = land van de consument). Door op hetzelfde veld te blokkeren dat we belasten, is er **geen gat** tussen "wat we weigeren" en "wat we belasten". `card_country` (waar de kaart is uitgegeven) kan afwijken van het facturatieland en zou dat gat juist openen.
- **Waarom geen EU-landen in de lijst?** De EU **Geo-blocking Regulation** (2018/302) verbiedt het weigeren van klanten op grond van hun EU-lidstaat. Bovendien dekt de OSS-Unieregeling de hele EU al — er is geen fiscale reden om een EU-land te blokkeren.
- **Waarom een blocklist en geen allowlist?** Een allowlist zou nieuwe/onschuldige landen standaard blokkeren en vereist onderhoud bij elke marktuitbreiding. De blocklist bevat precies de landen met een bekende drempelloze registratieplicht (of onduidelijk regime dat we nog niet hebben uitgezocht); alle andere landen mogen kopen. GB staat er expliciet in — na Brexit valt het VK buiten de OSS en heeft het NETP-regime een €0-drempel.
- **Waarom geen webhook-guard of frontend-blokkade?** Radar weigert **vóór** de charge tot stand komt → er is niets om te refunden en de klant wordt niet belast. Een frontend-block zou omzeilbaar zijn (API direct) en een webhook-guard komt te laat (charge is dan al gelukt → refund nodig). De **enige** benodigde detectie is dat de regel blíjft werken: dat lezen we af aan de landen-bij-naam in de Revenue-per-regio-uitsplitsing (Finance-tab) — verschijnt daar een geblokkeerd land, dan blokkeert de regel niet meer. Glipt er ooit één door, dan refunden we handmatig.

## Consequenties

- **Verloren omzet uit 9 landen** zolang we daar niet registreren — bewust, want fout afdragen is erger dan niet verkopen.
- **Detectie hangt aan één UI-signaal** (landen-bij-naam in Finance → Revenue by region). Geen alarm, geen dubbele guard. Aanvaard risico: bij de eerste doorglipper is het een handmatige refund, geen structureel lek.
- **Heroverwegen wanneer:**
  - Er komt aantoonbare **échte vraag** uit een geblokkeerd land (via de FAQ-mailto) → dan dat land registreren en uit de lijst halen.
  - **CH specifiek:** de CHF 100k-drempel slaat op **wereldomzet** (ESTV, geverifieerd — zie jurisdictie-tabel), niet op Zwitserse omzet. Zodra onze **globale** omzet ~CHF 100k (~€107k) nadert, ontstaat een Zwitserse registratieplicht ook zonder veel Zwitserse sales → dan CH heroverwegen ongeacht vraag.
- **Reconcile:** de Radar-fee is te controleren tegen Stripe's Fees report (Reports → All Fees), dat data toont 96u na balans-impact. We bouwen die reconcile niet; het staat als controlemogelijkheid in de provenance.
