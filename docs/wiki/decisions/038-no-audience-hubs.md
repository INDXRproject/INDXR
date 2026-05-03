# Beslissing 038: Geen audience hubs (pre-launch)

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** —

---

## Context

Veel SaaS-sites hebben aparte secties per audience-segment: `/for/researchers`, `/for/educators`, `/for/podcasters`. Dit creëert meer indexeerbare content en personaliseert de boodschap per doelgroep. De buyer persona's voor INDXR.AI zijn geïdentificeerd maar nog niet bewezen door echte gebruikersdata.

---

## Beslissing

Geen audience-hub secties bouwen voor launch. Audiencegerichte copy wordt verwerkt in de generieke marketing-pagina's en articles.

---

## Rationale

- Buyer persona's zijn nog niet bewezen door PostHog-data
- Audience hubs vereisen aparte content per segment — versnippert schrijfinspanning pre-launch
- Bestaande tool-pagina's bereiken al specifieke use-cases zonder expliciete audience-labeling

Overwogen alternatieven: audience landing pages via `/lp/*` routes per campagne (mogelijk post-launch, maar niet als permanente sitemap-structuur).

---

## Consequenties

- Minder content op launch, maar alle geschreven content is volledig en van kwaliteit
- PostHog-data na launch bepaalt welke segmenten prioriteit krijgen
- Herzien wanneer: PostHog toont dat één specifiek segment disproportioneel converteert, én dedicated landing pages aantoonbaar beter zouden presteren dan generieke copy
