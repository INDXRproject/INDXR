# Beslissing 087: Google Ads-meetlaag + consentmodel

**Status:** Geaccepteerd
**Datum:** 2026-08-02
**Gerelateerde code:** `packages/shared/src/lib/consent.ts`, `packages/shared/src/lib/gtag.ts`, `packages/shared/src/providers/ConsentProvider.tsx`, `packages/shared/src/components/consent/{ConsentBanner,CookieSettingsLink}.tsx`, `apps/{marketing,app}/src/app/layout.tsx`, `packages/shared/src/components/Footer.tsx`, `apps/app/src/components/app-sidebar.tsx`, `apps/app/src/app/dashboard/credits/success/page.tsx`, `apps/marketing/src/app/onboarding/page.tsx`, `packages/shared/src/lib/pricing.ts` (`eurForCredits`), `apps/marketing/src/app/privacy/page.tsx`

## Context

We willen Google Ads-conversies meten. De Ads-tag zet een first-party cookie `_gcl_au`. De site zet vandaag **nul** cookies (PostHog `persistence:'memory'`, IP genulld) en `/privacy` claimt "cookieless analytics". Onder de NL Telecommunicatiewet/ePrivacy vereist `_gcl_au` **voorafgaande toestemming** (EEA/UK/CH); Google eist **Consent Mode v2** voor EEA-verkeer. Tag, consent-banner en privacytekst horen daarom in **één deploy** — los deployen maakt de /privacy-claim onwaar.

## Beslissing

**Consent Mode v2 in BASIC mode**, eigen consent-laag in `packages/shared`, gemount in beide root-layouts. Geo-gesplitst via `x-vercel-ip-country` (gelezen in de al-dynamische layout): EEA/UK/CH → default *denied* + banner met gelijkwaardige Accept/Decline; ROW → default *granted* zonder banner, met zichtbare opt-out (footer "Cookie settings" + /privacy-cookietabel = notice-at-collection). Keuze in `localStorage` (primair) + een strikt-noodzakelijk `.indxr.ai`-cookie `indxr_consent` als **synclaag** tussen `indxr.ai` en `app.indxr.ai` (draagt alleen de keuze — geen identifier; nieuwste-wint bij conflict). Tag laadt imperatief pas ná toestemming (geen enkele request/ping naar Google daarvoor). `cookie_domain:'auto'` → `_gcl_au` op `.indxr.ai`, leesbaar op de app-host waar de purchase-conversie vuurt. Conversies: `purchase` (successtate, value = `eurForCredits`, transaction_id = Stripe-session-id) + `signup_completed` (onboarding). Intrekken via de footer-link wist `_gcl_*` op beide hosts. PostHog blijft volledig buiten de gate en ongewijzigd.

### Vier vastgelegde keuzes (met rationale)

- **(a) Geen GA4.** De Ads-tag meet zelf (`AW-…` conversion linker); PostHog doet product-analytics. Een tweede vendor (GA4) voegt cookies én een subverwerker toe zónder meerwaarde. *(Supersedet de GA4-regel in ADR-023.)*
- **(b) Basic i.p.v. Advanced consent mode.** Advanced stuurt cookieless *pings* naar Google bij weigering — dat botst met de belofte op /privacy ("geen request vóór toestemming"). Basic laadt de tag simpelweg niet tot consent.
- **(c) Geen enhanced conversions.** Geen gehashte e-mail naar Google — buiten scope, bewust niet.
- **(d) Eigen banner i.p.v. gecertificeerde CMP.** Google's TCF-certificeringseis geldt voor **publishers** (AdSense/Ad Manager/AdMob), niet voor **adverteerders**; Google's eigen documentatie staat een eigen banner expliciet toe.

## Rationale

- **Één deploy** houdt de /privacy-claim waar op elk moment.
- **Basic mode + imperatieve load** geeft een hard, toetsbaar criterium: nul requests + nul `_gcl_*` vóór toestemming (headless geverifieerd, zie Consequenties).
- **`.indxr.ai`-synccookie** lost het per-origin-localStorage-gat op zodat een keuze op marketing ook de purchase-conversie op de app-host dekt, zonder een trackbare identifier te introduceren.

### Waarom Ads-omzet niet gelijk is aan Finance-omzet

De conversiewaarde naar Google is het **gechargede bruto bedrag incl. BTW** (`pricing.ts`, BTW-inclusief per ADR-058) — dus ~17–21% hoger dan `revenue_ex_vat` in het Finance-dashboard. Tweede afwijking dezelfde klasse: **Stripe Adaptive Pricing** kan een koper een gelokaliseerde prijs in een andere valuta rekenen (tot −20%, ADR-052/058); `eurForCredits()` geeft de **EUR-lijstprijs**, niet het werkelijk betaalde bedrag. Beide zijn **bewuste benaderingen** voor ROAS-sturing, geen finance-cijfers — een toekomstige vergelijking Ads↔Finance is dus géén bug.

## Consequenties

- **Geverifieerd (headless, Playwright, lokaal):** vóór consent (EEA-default) 0 requests naar google-analytics/googleadservices/googletagmanager + 0 `_gcl_*`; na Accept laadt `gtag.js`, verschijnt `_gcl_au`, wordt `indxr_consent` (4 signalen + versie + timestamp, geen id) geschreven; reload toont de banner niet opnieuw; ROW (US-header) = geen banner + tag laadt direct; intrekken (Decline) wist `_gcl_*` en zet de keuze op denied.
- **Nog niet live getest:** de purchase-conversie end-to-end (vereist een echte Stripe-aankoop → webhook → `add_credits`; Khidr doet de aankoop). Het code-pad is af en dedupt op session-id (localStorage-guard + `transaction_id`).
- `gclid` overleeft de auth-URL-keten niet (`/login` + `/auth/callback` whitelisten alleen `code`+`next`); dat is niet nodig — `_gcl_au` op `.indxr.ai` is het cross-subdomein-mechanisme. Auth-flow ongemoeid.
- Ontbrekende `NEXT_PUBLIC_GOOGLE_ADS_ID` → tag laadt nooit; geen crash, geen console-error.
- `LEGAL_VERSION` + zichtbare /privacy-datum + sitemap-lastmod bewogen mee naar 2026-08-02 (bundelversie, ADR-069). `/terms` blijft 2026-07-20.
