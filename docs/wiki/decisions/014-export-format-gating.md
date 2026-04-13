# Beslissing 014: Export Format Gating

**Status:** Geaccepteerd (pending implementatie)
**Datum:** 2026-04-14
**Gerelateerde code:** `src/components/TranscriptViewer.tsx` (of equivalent exportcomponent)

---

## Context

INDXR.AI exporteert transcripten in meerdere formaten (TXT, SRT, VTT, JSON, CSV). De vraag was: welk formaat is beschikbaar voor welke gebruikersklasse?

---

## Beslissing

Twee-tier export gating:

| Gebruikersklasse | Beschikbare formaten |
|-----------------|---------------------|
| Anoniem (niet ingelogd) | TXT alleen |
| Ingelogd (free én paid) | Alle formaten: TXT, SRT, VTT, JSON, CSV |

**Anoniem = TXT only.** Zodra een gebruiker inlogt (ook met een gratis account), heeft die toegang tot alle formaten.

---

## Rationale

**Waarom niet credits aanrekenen per export:**
Export is een bijzaak, geen primair waardemoment. Concurrenten (TubeText, Glasp, YouTube-Transcript.io) bieden meerdere formaten gratis aan. Credits aanrekenen per export voelt "nickel-and-dime" en vergroot de friction zonder substantiële opbrengst.

**Waarom TXT-only voor anoniem:**
TXT is voldoende om de kernwaarde te demonstreren (je kunt het transcript lezen/kopiëren). SRT/VTT/JSON vereisen meer context en zijn typisch voor power-gebruikers die al weten wat ze willen. De formaat-beperking is een zachte gate die e-mailadressen verzamelt.

**Kanttekening over JSON/RAG achter paid:**
Oorspronkelijk overwogen: JSON/RAG-geoptimaliseerde export achter paid user status plaatsen. Beslissing: niet prioriteit nu. Als het RAG-export feature (ADR-016) live gaat, heroverweeg dan of de RAG-toggle specifiek achter paid geplaatst moet worden. Vooralsnog: alle formaten beschikbaar voor ingelogde gebruikers.

---

## Rate limiting anoniem

Anonieme gebruikers: **10 extractions/dag** per IP (niet 5 zoals eerder geconfigureerd in `src/lib/ratelimit.ts`).

---

## Consequenties

- [ ] Export component: TXT als enige optie voor niet-ingelogde gebruikers
- [ ] `src/lib/ratelimit.ts`: anoniem limiet aanpassen naar 10/dag
- [ ] UI: "Log in voor alle exportformaten" melding bij anonieme gebruikers
- [ ] Toekomstig: heroverweeg RAG-JSON achter paid als de feature live gaat
