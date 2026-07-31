# Beslissing 084: `/dashboard/billing` → `/dashboard/credits` + Account/Credits-scheiding

**Status:** Geaccepteerd
**Datum:** 2026-07-31
**Gerelateerde code:** `apps/app/src/app/dashboard/credits/` (was `billing/`), `apps/app/src/app/dashboard/account/page.tsx`, `apps/app/src/app/api/stripe/checkout/route.ts`, `apps/app/next.config.ts`, `apps/app/src/components/{AppTopbar,AvatarDropdown}.tsx`, `apps/app/src/app/dashboard/page.tsx`, `apps/marketing/src/components/pricing/BuyButton.tsx`, `packages/shared/src/components/{TranscriptCard,PlaylistAvailabilitySummary,free-tool/VideoTab,free-tool/AudioTab}.tsx`

## Context

De pagina heette **Billing**. Dat suggereert abonnementen en facturen, terwijl INDXR losse
creditpakketten verkoopt en de pagina saldo, pakketten en aankoop-/transactiehistorie toont — dat zijn
alle drie *credits*. Bovendien stond "geld" verspreid: de transactiehistorie zat op **Account**, de
aankoophistorie deels op Billing (bare) en deels op Account (met factuur).

## Beslissing

1. **Route hernoemd** `/dashboard/billing` → `/dashboard/credits` (`git mv`, historie behouden), inclusief
   `success/` en `cancel/`. Uitgelogd blijft `/pricing` de marketingpagina.
2. **Geld op één plek — Credits** = de money-hub: saldo, pakketten (`BillingPurchaseGrid`, leest nog de
   `?checkout=`-deeplink), **credit-activiteit** (`TransactionHistoryCard`, verhuisd van Account) en
   **betaalhistorie met facturen** (`PurchaseHistoryCard`, nu met invoice i.p.v. bare).
3. **Account** houdt identiteit/beveiliging/opslag: `ProfileSettingsCard`, `StorageMeterCard`,
   `SentryFeedbackCard`. `TransactionHistoryCard` + `PurchaseHistoryCard` (+ hun fetches) zijn eruit.
4. **Stripe `success_url`/`cancel_url`** (`checkout/route.ts`) wijzen **direct** naar
   `/dashboard/credits/success` + `/cancel` (geen redirect-hop op de callback).
5. **Redirect** (permanent) in `apps/app/next.config.ts`: `/dashboard/billing` en
   `/dashboard/billing/:path*` → `/dashboard/credits(/:path*)`. Vangt oude bookmarks én een eventuele
   in-flight Stripe-sessie die nog de oude success-URL droeg.
6. **Alle in-app ko-routes → Credits:** topbar credit-pil (nu mét `+`-affordance, de enige koop-route op
   desktop én mobiel), dashboard "Buy more", avatar-menu (nieuw "Credits"-item), en de shared
   insufficient-credits-links (`TranscriptCard`, `PlaylistAvailabilitySummary`, `VideoTab`×3, `AudioTab`×2
   — `appHref('/dashboard/billing')` → `credits`). Marketing `BuyButton` deep-linkt naar de nieuwe route.

## Rationale

- "Credits" beschrijft wat de pagina werkelijk doet; "Billing" beloofde abonnementen die er niet zijn.
- Eén money-hub verlaagt de kans dat een saldo-/historie-vraag op de verkeerde pagina wordt gezocht.
- De redirect + directe Stripe-URL's samen maken de betaal-terugkeer keten onbreekbaar: de nieuwe route
  bestaat, en elke oude `/dashboard/billing/success`-URL wordt 308'd naar de nieuwe.
- De support-componentmap `apps/app/src/components/dashboard/billing/` is **niet** hernoemd (alleen
  import-paden verwijzen ernaar) — dat is churn zonder waarde.

## Consequenties

- Financieel-kritiek: `success_url`/`cancel_url` + de webhook-poll op `credit_transactions` (op de
  success-pagina) zijn onaangeroerd qua logica; alleen het pad verschoof. Geen Stripe-dashboard-wijziging.
- Marketing-impact (gemeld): 4 shared componenten + `BuyButton` wijzigen de koop-link-string.
- `docs/wiki`-vermeldingen van `dashboard/billing` als huidige route zijn achterhaald (bijgewerkt waar het
  huidige gedrag beschrijft; `LOG.md` blijft append-only historie).

## Verificatie

`pnpm build` groen (2/2); routes tonen `/dashboard/credits{,/success,/cancel}`, geen billing-routes meer.
Post-deploy: `/dashboard/billing` → 308 `/dashboard/credits` (+ success/cancel), de Credits-pagina
serveert saldo/pakketten/historie, en de checkout-sessie krijgt de nieuwe success-URL. Volledige
Stripe-test-mode-betaling (test-kaart) = handmatige stap vóór live gebruik; de routes + redirect zijn
zo gebouwd dat een terugkeer nooit op een 404 landt.
