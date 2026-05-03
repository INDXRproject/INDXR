# Beslissing 044: Gebruikersfeedback — drie aparte channels

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/dashboard/messages/`, `src/app/contact/`

---

## Context

Pre-launch SaaS heeft geen echte testimonials. Research 2 raadt expliciet af om testimonials te hallusineren of logo's te fabriceren. Khidr wil drie aparte feedback-channels onderscheiden die verschillende user intents bedienen.

---

## Beslissing

Drie aparte gebruikersfeedback-channels:

1. **Messages (in-app)** — algemene communicatie tussen INDXR en gebruikers: vragen, mededelingen, feedback. Bidirectioneel. Bestaat al als `/dashboard/messages`.

2. **Support / bug reports** — technische issues en bug reports. Adres: `/contact` (publiek). Post-launch eventueel een aparte support flow in-app.

3. **Testimonials (post-launch unlock)** — gebruikers krijgen na 30 dagen + betaald gebruik een prompt om een testimonial achter te laten, beloond met credits. Framing: "we waarderen je tijd om eerlijk te zijn", niet "betaal voor positieve review".

Pre-launch toont de homepage/pricing-pagina geen testimonials maar "stats from our testing" — echte WER-cijfers, accuracy data, throughput stats.

---

## Rationale

- Ihsan: geen fake testimonials, geen hallucinated trust-signalen
- Drie channels bedienen drie verschillende user intents — mengen veroorzaakt verwarring
- "Stats from testing" biedt een eerlijke vorm van trust-building pre-launch zonder misleiding
- Testimonial-unlock systeem beloont tijdsinvestering, niet positief sentiment

---

## Consequenties

- Pre-launch: homepage en pricing tonen een "stats from testing" component (te bouwen)
- Pre-launch: geen testimonials-sectie op marketing-pagina's
- Post-launch: testimonial-unlock flow in `/messages` of dedicated `/testimonials/submit` pagina
- Testimonial-rewards zijn transparant over de framing (geen smeergeld)
- `/messages` blijft bestaan voor algemene communicatie (niet samenvoegen met support)
- `/contact` absorbeert support totdat een dedicated support flow gebouwd wordt
