# Beslissing 040: Audience-aware article pattern — mix van beide patterns

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/articles/`

---

## Context

Research 2 (Modern SaaS Web Architecture Best Practices 2026) identificeerde twee patterns voor audience-aware articles zonder audience hubs (ADR-038):

- **Pattern 1:** generieke H1, single named audience throughout (Loom, Stripe Guides)
- **Pattern 2:** generieke H1, multiple audiences in delineated body sections (AssemblyAI)

Vraag: welk pattern hanteren we voor `/articles/*` content?

---

## Beslissing

Mix van beide patterns, per artikel beslist op basis van topic.

---

## Rationale

- Sommige topics raken één specifieke audience (RAG/JSON export = developers) — Pattern 1 past
- Andere topics raken meerdere audiences (transcript-not-available = iedereen die YouTube content gebruikt) — Pattern 2 past
- Pragmatisch en niet dogmatisch: template mag de inhoud niet forceren
- Past bij ihsan-principe: het artikel moet eerlijk doen wat het belooft, niet kunstmatig audiences benoemen die niet bij de content passen

Uniform over alle articles: AuthorCard ("INDXR Editorial"), definition-led opening, Article + BreadcrumbList schema. Alleen de audience-behandeling verschilt per artikel.

---

## Consequenties

- Schrijfproces per artikel vereist een bewuste keuze: "één audience of meerdere?"
- Geen rigid template forcing — content bepaalt structuur
- Geen aparte templates voor de twee patterns; het onderscheid zit in de body-schrijfstijl, niet in JSX-structuur
