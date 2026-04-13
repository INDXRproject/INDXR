# Beslissing 006: Credit Model — 1 Credit = 10 Minuten

**Status:** Geaccepteerd  
**Datum:** 2025-02 (Phase B)  
**Gerelateerde code:** `backend/credit_manager.py`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`

---

## Context

INDXR.AI verkoopt transcript-extractie als dienst. De vraag was: hoe factureren we gebruikers op een eerlijke, begrijpelijke manier die tegelijk de daadwerkelijke kosten dekt?

Opties:
- Per video (flat fee)
- Per woord/karakter van het transcript
- Per minuut video
- Abonnementsmodel

---

## Beslissing

**Credits als tussenvaluta**, waarbij **1 credit = 10 minuten video** (600 seconden).

Formule (in `backend/credit_manager.py:35-55`):
```python
credits = math.ceil(duration_seconds / 600.0)
minimum = 1  # altijd minimaal 1 credit
```

Credits worden gekocht in pakketten via Stripe (eenmalige betaling, geen abonnement).

**Credit kosten per functie:**
- Caption-extractie (YouTube captions beschikbaar): **0 credits** — gratis
- Audio-transcriptie (geen captions, AssemblyAI): **1 credit per 10 min**
- AI samenvatting (DeepSeek): **1 credit per samenvatting**
- Welcome bonus: **5 gratis credits** bij registratie

---

## Rationale

**Waarom credits en niet directe betaling per video?**
- Credits verlagen de psychologische drempel: gebruikers kopen een bundel en "vergeten" de kosten per transactie
- Vooruitbetaling elimineert chargebacks en facturatie-overhead
- Flexibel voor toekomstige features (nieuwe feature kost X credits)

**Waarom 10 minuten per credit?**
- Begrijpelijk voor gebruikers: een 10-minuten video = 1 credit
- Dekt de AssemblyAI-kosten met marge (AssemblyAI: ~$0.37/uur = ~$0.06/10min; een credit kost de gebruiker ~€0.07-0.10)
- Simpel te communiceren op de pricing-pagina

**Waarom gratis caption-extractie?**
- YouTube captions zijn gratis voor ons (geen API-kosten)
- Gratis laagdrempel verlaagt conversiedrempel: gebruikers proberen INDXR zonder risico
- De waarde zit in AI-features (transcriptie, samenvatting) die credits kosten

**Atomic deduction via PostgreSQL RPC:**
De deductie gebruikt een PostgreSQL stored procedure (`deduct_credits_atomic`) met row-level locking. Dit voorkomt race conditions bij parallelle requests (bijv. twee tabbladen tegelijk een samenvatting starten). Implementatie in `backend/credit_manager.py:91-150`.

**Refund mechanisme:**
Bij mislukte AI-operaties wordt 1 credit teruggestort via `add_credits()`. Gebruikers betalen nooit voor een fout.

---

## Consequenties

**Voordelen:**
- Transparant en voorspelbaar voor gebruikers
- Geen abonnementsverplichtingen
- Credits verlopen niet (loyaliteitsincentief)
- Atomic deduction voorkomt over-gebruik

**Trade-offs:**
- Credit-waarde is indirect (gebruikers moeten de conversie onthouden)
- Minimaal 1 credit voor een 30-seconden video voelt mogelijk duur
- Geen automatische refill (gebruiker moet handmatig bijkopen)

**Openstaand:**
- Starter en Power pakketten nog niet aangemaakt in live Stripe Dashboard (zie `known-issues.md`)
- Geen expiry-datum op credits — overweeg dit bij schaal om "slapende" credits te beheren
