# Beslissing 088: YouTube's interface niet in marketingmateriaal tonen

**Status:** Geaccepteerd
**Datum:** 2026-08-07
**Gerelateerde code:** `tests/playwright/capture/core-flow-video.spec.ts`, `docs/wiki/content/screenshot-machine.md` (video-opnamestandaard)

## Context

Voor de homepage-conversieronde nemen we bewegende opnames van het echte product op (Playwright `recordVideo`). De kernvraag vóór het filmen: mogen we YouTube's interface (de youtube.com-pagina, de speler, het logo) in ons eigen marketingmateriaal in beeld brengen?

Read-only research tegen officiële bronnen (2026-08-07):

- **YouTube Brand Resources** (`youtube.com/howyoutubeworks/resources/brand-resources/` → `brand.youtube`): *"all product placements that show the YouTube logos, icons or elements of the UI (e.g. buttons, pages, mobile screenshots, etc.) in any media … must be approved by YouTube."* Third-party content op de pagina moet apart geklaard worden bij de rechthebbende.
- **Google/YouTube Brand Use Guidelines and Permissions** (PDF, aug 2021): *"If your production plans to feature or use Google or YouTube products, logos or user interfaces …, you must secure permission in advance … DO NOT ASSUME YOUR USAGE REQUEST WILL BE APPROVED."*
- **YouTube API Services Branding Guidelines** (onderdeel van de API ToS, wij zijn API-client): *"You must never use YouTube branding images in conjunction with the overall name or description of your application, product, or service."* Nominatief tekstgebruik ("transcribe YouTube videos") is wél toegestaan.

Conclusie: YouTube's UI prominent tonen in een marketingclip is **restrictief** — het vereist voorafgaande goedkeuring via de Brand Use Request Form (~1–2 weken, niet gegarandeerd). Nominatieve tekstverwijzing blijft toegestaan.

## Beslissing

De marketingopnames tonen de **youtube.com-pagina, -speler of het -logo niet**. De clip begint in ons **eigen invoerveld** waar de gebruiker de YouTube-link plakt; daarna is uitsluitend ons eigen product in beeld. De link zelf (een `watch?v=…`-URL als tekst in ons veld) mag, want dat is nominatief gebruik, geen weergave van YouTube's interface.

In tekst/voice-over blijft nominatieve verwijzing ("transcribe any YouTube video") toegestaan; we zetten de YouTube-woordmerk/-logo niet in onze productnaam of lockups en suggereren geen partnerschap/endorsement.

## Rationale

- Meerdere officiële documenten convergeren: UI/pagina's/screenshots/speler in media vereisen voorafgaande goedkeuring, en goedkeuring is niet gegarandeerd.
- We hebben geen prominente YouTube-UI-shot nodig — het verhaal is wat óns product doet met de link, niet hoe YouTube eruitziet.
- Sluit aan op de bestaande beeldmachine, die ook al op `/dashboard/transcribe` begint zonder de YouTube-pagina te tonen.

## Consequenties

- De video-opnamestandaard (`screenshot-machine.md`) legt vast: geen youtube.com in beeld; start bij het invoerveld.
- Wil een toekomstige clip tóch een prominente YouTube-UI-shot, dan is de compliant route de **Brand Use Request Form** vóór publicatie — niet stilzwijgend filmen.
- Nominatieve tekst ("YouTube captions", "transcribe YouTube videos") blijft overal toegestaan en ongewijzigd.
