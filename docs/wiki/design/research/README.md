# Research Naslagwerk

Deze map bevat de vier research-batches die ten grondslag liggen aan `wiki/design/system.md`. Niet voor dagelijks gebruik tijdens implementatie — wel als naslag wanneer je wilt weten *waarom* een beslissing zo is gemaakt.

## Inhoud

- **`batch-1-foundation.md`** — Typografie, default theme, color philosophy, type scale, hexagon level. Eerste research-batch, gebaseerd op de zeven ihsan-principes.

- **`batch-2-architecture.md`** — Token architectuur (OKLCH + Tailwind v4), spacing/layout systeem, mobile patterns voor SaaS dashboards, state patterns (loading/empty/error/success), Next.js conventions adoption matrix, accessibility (WCAG 2.2), 7-fasen rollout plan.

- **`batch-3a-ia-naming.md`** — Sitemap herstructurering met `/docs` umbrella, naming/terminologie alternatieven, missing pages analyse (Inbox/Messages, Changelog, Roadmap), URL-stabiliteit-strategie, kennisbank positionering.

- **`batch-3b-ux-aesthetic.md`** — Sidebar redesign met state machine, mobile UX patterns per route, Tiptap optimize-vs-replace beslissing, `/docs` vs `/articles` SEO onderzoek, beauty layer surface map (hexagon patterns), aesthetic direction triangulatie.

## Wanneer hier kijken

- **"Waarom IBM Plex en niet Inter?"** → batch-1
- **"Waarom 4 breakpoints en niet 6?"** → batch-2
- **"Waarom Account en Settings gesplit?"** → batch-3a (Khidr override van research recommendation)
- **"Waarom geen toasts?"** → Khidr's hard rule, geen research nodig
- **"Waarom Tiptap behouden?"** → batch-3b §3
- **"Waarom geen Changelog pre-launch?"** → batch-3a + Khidr's veto

## Wanneer NIET hier kijken

- **Tijdens implementatie** → gebruik `system.md` als referentie
- **Voor visuele beslissingen tijdens werksessies** → daar bouwen we beslissingen op het moment

## Status

Research-fase is afgesloten. Geen nieuwe batches gepland. Updates aan deze documenten zijn alleen van toepassing als research-uitkomsten achteraf onjuist blijken — in dat geval markeren met datum en reden bovenaan het document.

Updates aan implementatie-beslissingen gaan naar `wiki/design/decisions/` (architectural decision records) of `wiki/design/working-sessions/` (per-sessie outcomes), niet hier.
