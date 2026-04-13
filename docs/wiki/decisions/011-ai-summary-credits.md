# Beslissing 011: AI Samenvatting Kost 3 Credits (was 1)

**Status:** Geaccepteerd (pending implementatie)
**Datum:** 2026-04-14
**Gerelateerde code:** `backend/main.py` (summarization), `src/app/api/ai/summarize/route.ts`

---

## Context

AI-samenvatting (DeepSeek V3) kostte 1 credit onder het oude model. Met de overgang naar 1 credit = 1 minuut (ADR-009) en nieuwe credit-pakketten (ADR-012) moest de summering-prijs opnieuw worden bepaald.

---

## Beslissing

AI-samenvatting kost **3 credits** per samenvatting (flat, ongeacht transcriptlengte).

---

## Rationale

**Waarom niet 5 credits (het eerste voorstel):**
5 credits naast 1 credit/video zou voelen als disproportioneel — gebruikers zouden vragen waarom één samenvatting net zoveel kost als 5 video-extracties. Dit ondermijnt de perceived value van samenvatting.

**Waarom 3 werkt:**
- Nog steeds een hoge-margeactie (~97% gross margin op alle tiers)
- Proportioneel naast andere acties (3× playlist-video prijs is verdedigbaar: "het is een AI-analyse, geen extractie")
- Genoeg om een "credit sink" te zijn die grotere pakketten stimuleert
- DeepSeek V3 COGS voor een samenvatting: ~€0.001. Revenue bij Try-tier: 3 × €0.01245 = €0.037. Marge: 97.3%

**Vereenvoudiging voor gebruiker:**
> "Captions zijn gratis. Playlists, AI-transcriptie en samenvattingen kosten credits — 1 credit per playlist-video, 1 credit per minuut AI-transcriptie, 3 credits per samenvatting."

---

## Consequenties

**Implementatie vereist:**
- [ ] `backend/main.py`: credit-deductie voor summarization aanpassen: `deduct_credits_atomic(..., amount=3, ...)`
- [ ] Frontend: UI toont "3 credits" op de Samenvatten-knop (was "1 credit")
- [ ] `backend/main.py`: refund bij fout ook 3 credits: `add_credits(..., amount=3, ...)`
- [ ] Tests: verify refund-mechanisme werkt correct voor 3 credits
