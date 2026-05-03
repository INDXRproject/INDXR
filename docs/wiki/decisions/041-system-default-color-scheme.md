# Beslissing 041: Marketing/content design language — system default (light + dark first-class)

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/globals.css`, `docs/wiki/design/tokens.css`

---

## Context

Research 2 noemt dat moderne SaaS-sites verschillende defaults kiezen:

- **Dark default:** developer-targeted producten (Linear, Vercel, Resend)
- **Light default:** consumer-adjacent producten (Stripe, Notion)

INDXR.AI zit qua audience tussen beide groepen in: RAG-gebruikers en developers enerzijds, onderzoekers, studenten, journalisten en content creators anderzijds.

---

## Beslissing

System default — light én dark mode zijn beide first-class. De browser/OS-voorkeur van de gebruiker bepaalt de initiële weergave. Geen forced design-language signaal.

---

## Rationale

- INDXR's audience is geen homogeen developer-segment
- Een forced dark default zou een implicit signaal zijn dat het product developer-only is — niet accuraat
- User preference primair — ihsan-principe: eerlijk zijn over wie de tool gebruikt
- Design tokens (OKLCH) ondersteunen al beide modes

---

## Consequenties

- Elk component in het design system moet getest worden in beide modes
- Claude Design rondje 2 valideert beide modes vóór launch
- Dark-mode toggle blijft beschikbaar (al geïmplementeerd via `next-themes`)
- Geen "forced dark" landing page als marketing-statement
