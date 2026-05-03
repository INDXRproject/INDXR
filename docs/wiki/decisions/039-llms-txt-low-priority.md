# Beslissing 039: llms.txt — low-priority, niet uitbreiden

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `public/llms.txt`

---

## Context

`public/llms.txt` bestaat als statisch bestand. Het is een emerging standard die AI-assistenten en LLMs helpt een site te begrijpen. Onderzoek (mei 2026) toont aan dat de standaard geen bewezen ROI heeft voor AI-citaties op dit moment.

---

## Beslissing

llms.txt blijft aanwezig maar is low-priority. We breiden het niet uit, bouwen geen automatische generator, en optimaliseren de content er niet voor. Onderhoud beperkt zich tot correctheidscheck (prijzen, routes) bij grote wijzigingen.

---

## Rationale

- Meeste LLMs gebruiken standaard sitemap en geïndexeerde content — llms.txt heeft geen bewezen extra effect
- Pre-launch engineering-capaciteit is schaars
- Bestand is correct gehouden (prijzen gesynchroniseerd 2026-05-03, verouderde routes gecorrigeerd)

Overwogen alternatieven: volledig uitbreiden met per-pagina llms.txt (geen bewezen ROI), verwijderen (verlies eventuele toekomstige voordelen bij spec-adoptie).

---

## Consequenties

- Geen engineering effort aan llms.txt
- Bestand blijft correct na elke grote wijziging (prijzen, routes)
- Herzien wanneer: bewijs dat llms.txt direct bijdraagt aan AI-citaties in ChatGPT Search, Perplexity of vergelijkbare tools, of significante update aan de llms.txt spec
