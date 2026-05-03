# Beslissing 043: Author byline — "INDXR Editorial" als enige author

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/articles/`, `src/lib/authors.ts` (toekomstig)

---

## Context

Research 2 noemt EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) als kritieke factor voor AI-citaties en SEO-ranking. Author bylines met echte personen en bio-links verhogen het trust-signaal. INDXR-context: de founder is anoniem (ADR-042). Opties waren een fake persona creëren, de founder toch te identificeren, of een redactioneel label gebruiken.

---

## Beslissing

Alle articles gebruiken een AuthorCard met "INDXR Editorial" als author. Eén redactie-bio die op alle articles wordt hergebruikt.

---

## Rationale

- Ihsan: geen hallucinated author personas ("Sarah from Marketing") — expliciet aangemerkt als anti-pattern in Research 2
- "INDXR Editorial" is eerlijk: het omschrijft de werkelijke herkomst van de content (WO-research achtergrond, AI-augmented research methodology, kwaliteitscontrole door de maker)
- Bio kan kwalificaties en methodologie noemen zonder persoonsnamen — biedt alsnog EEAT-signaal
- Vermijdt de consistentieproblemen van meerdere (fictieve) auteurs

---

## Consequenties

- AuthorCard component bestaat; "INDXR Editorial" is de enige author-entry
- Author bio is een korte paragraph: research-aanpak, AI-augmented methodologie, kwalificaties (zonder persoonsnamen)
- Geen variabele author per article
- Geen persoonsgebonden photo; placeholder of brand mark als avatar
- `src/lib/authors.ts` bevat één entry: `indxr-editorial`
