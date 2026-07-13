# Beslissing 056: Admin control-center herontwerp (tabs + Growth/Operations + auto-flag)

**Status:** Geaccepteerd
**Datum:** 2026-07-13
**Gerelateerde code:** `apps/app/src/app/admin/*` (AdminNav, adminTypes, finance/, growth/, operations/, page.tsx), `supabase/migrations/20260713141556_admin_growth_ops_and_autoflag.sql`, `api/admin/toggle-internal/route.ts`

## Context

Het admin-dashboard was één scherm met gemengde info (P&L, vanity-cijfers, tabellen door elkaar) en een NL/EN-mix. De geld-bedrading (ADR-055) werkte al; dit is een **presentatie-herontwerp** naar drie heldere blokken, plus enkele nieuwe capaciteiten die ontbraken (funnel, systeem-health, automatische test-account-detectie).

## Beslissing

- **Tabs**: nav = Overview · Finance · Growth · Operations · Users · Transcripts · Support · Announcements (tickets/broadcast hernoemd; Credits/Paid Users van de nav gehaald — hun data leeft in Finance/Growth). Active-state via client `AdminNav`.
- **Finance = resultatenrekening top-down**: Cash in → −VAT → Revenue (met **recognized|deferred** split-balk) → −COR (met **real|estimated** split + per-producttype badge-balk) → Gross profit+marge → −OPEX → Net profit+marge, met zichtbare operator-connectors. Test/intern verkeer achter een toggle (default dicht). Deferred (uitgestelde verplichting) is nu expliciet zichtbaar.
- **Growth = funnel**: Acquisition (signups/kanaal) → Activation (**definitie: eerste betaalde credit-besteding**, niet enkel signup) → Monetization (free→paid + LTV) → Retention (**≥2 aankoop-sessies**). CAC = ads ÷ nieuwe betalers (NULL tot `opex_expenses`-ads bestaan). Pre-launch: lege staat, structuur klaar.
- **Operations = systeem-health over ALLE jobs** (niet economie-gefilterd): success/failure-ratio, error-type-donut (dynamisch, nieuwe types verschijnen automatisch), capaciteit (queue-diepte, gem. wachttijd uit created→started, gem. verwerkingstijd).
- **Auto-flag test-accounts**: BEFORE INSERT-trigger op `profiles` zet `is_internal=true` voor `@indxr-test.com` + elk `+test`-adres. Plus handmatige "Mark internal/external"-toggle in Users. Interne accounts vallen uit **élk** echt-economie-cijfer (de `admin_*_summary`-RPC's filteren op `is_internal`).
- **Grant-reason enum**: Testing / Bug report / Billing / Feedback / Goodwill (gekoppeld aan ticketsoorten + goodwill). Welcome + Refund gebeuren automatisch, geen handmatige keuze.

## Rationale

- Drie blokken als tabs = minder cognitieve last dan één muur; grote cijfers > veel micro-tekst.
- Growth/Operations-logica in `admin_growth_summary()` / `admin_operations_summary()` (SECURITY DEFINER, REVOKE anon/authenticated, GRANT service_role) — consistent met ADR-055, auditeerbaar, geen data-lek.
- Auto-flag sluit het gat dat nieuwe testaccounts anders handmatig geseed moesten worden.

## Consequenties

- Elk net-geflagd/aangemaakt intern account verdwijnt bij de volgende load uit alle echte cijfers (reversibel geverifieerd tegen productie).
- Growth/Operations zijn pre-launch grotendeels leeg maar renderen een nette lege staat; CAC/LTV-kaarten bestaan en vullen zich zodra ads + betalende users bestaan.
- Credits/Paid Users pagina's bestaan nog (bereikbaar via URL) maar staan niet in de nav.
