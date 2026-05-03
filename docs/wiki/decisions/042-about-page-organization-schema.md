# Beslissing 042: /about — Organization schema, geen Person schema

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/about/page.tsx`

---

## Context

Research 2 raadt Person + Organization schema aan voor solo-founder about pages, met expliciete naam, photo en social links voor trust-signaling en AI-citeability. INDXR-context: de founder kiest voor anonimiteit — persoonlijke identificatie past niet bij het ihsan-principe van focus op productkwaliteit boven personal branding.

---

## Beslissing

`/about` gebruikt uitsluitend Organization schema. Geen Person schema, geen founder photo, geen founder naam. Wel een eerlijke "waarom dit product bestaat"-story zonder persoonlijke identificatie.

---

## Rationale

- Ihsan-principe: focus op eerlijke kwaliteit van het product, niet op persoonlijke aanbidding
- Anonimiteit beschermt privacy zonder afbreuk te doen aan transparantie over het product
- Organization schema biedt nog steeds AI-citeability voor "wat is INDXR" queries
- Een contactadres (via `/contact`) compenseert voor de afwezigheid van founder-identificatie

---

## Consequenties

- `/about` heeft Organization schema met name, url en contactPoint
- Founder story is geschreven in eerste persoon meervoud ("we") of bedrijfsnaam ("INDXR.AI")
- Geen LinkedIn/Twitter/GitHub founder links op `/about`
- Geen photo, geen "About the founder" sectie
- Mogelijk lagere AI-citation-score voor "who built X" queries — geaccepteerde trade-off
