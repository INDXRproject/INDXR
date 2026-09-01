# Beslissing 103: PostHog-identiteit over de OAuth-/verificatie-grens

**Status:** Geaccepteerd
**Datum:** 2026-09-01
**Gerelateerde code:** `packages/shared/src/lib/posthog-identity.ts`, `packages/shared/src/contexts/AuthContext.tsx`, `packages/shared/src/providers/PostHogProvider.tsx`, `packages/shared/src/providers/ConsentProvider.tsx`, `packages/shared/src/actions/auth-actions.ts`, `packages/shared/src/components/auth/GoogleSignInButton.tsx`, `apps/marketing/src/app/auth/callback/route.ts`, `apps/marketing/src/app/signup/page.tsx`, `apps/marketing/src/app/onboarding/page.tsx`, `apps/app/src/app/admin/users/*`, migratie `20260901120000_profiles_device_timezone.sql`

## Context

posthog-js draait op `persistence:'memory'` (cookieless by design, ePrivacy 5(3), roadmap 1.32). Dat
betekent dat élke *harde* page-load een nieuwe anonieme `distinct_id` genereert. De redirect naar
`accounts.google.com` en de klik op een e-mailverificatielink zijn zulke harde loads. Op de terugkeer
merged `identify(user.id)` alléén de post-reload anonieme id; de pre-signup id blijft wees.

Bewezen in de export van 2026-09-01: één echte gebruiker verscheen als **drie** PostHog-personen
(ad-klik op `/articles/video-to-text`, `/signup`, en na login). Nooit gemerged. Gevolg: 66 "personen"
voor ≤15 echte mensen; elke ad-klik→activatie-funnel las structureel nul.

Los daarvan: PostHog kent alleen `$geoip_time_zone` (IP-afgeleid → gespooft door VPN). De echte
device-tz zit als `$timezone` in elk event maar nergens op het *account* — terwijl credits/betalingen in
onze DB leven, niet in PostHog.

## Beslissing

**FIX A — anonieme id via de URL brugpen (werkt voor iedereen, ook zónder consent).** Lees
`posthog.get_distinct_id()` vóór de redirect, geef het mee als `ph_did` query-param op de callback-URL,
en roep op de terugkeer `posthog.alias(ph_did)` aan ná `identify(user.id)`. Niets op het apparaat — de
id reist alléén in de URL (5(3) gaat over opslag, niet URL-params). Guards: UUID-formaat +
`≠ huidige distinct_id`; param direct gestript na gebruik (`replaceState`), gelezen via lazy `useRef`
vóór enig effect. `alias` (niet bootstrap) omdat de terugkeer altijd al geïdentificeerd is — daardoor
kan de bootstrap-"genegeerd-als-er-al-opslag-is"-valkuil structureel niet optreden.

**FIX A — verzendkant dekt ALLE geïdentificeerde eindpunten (aanvulling 2e commit).** De eerste ronde
hing `ph_did` alleen aan de Google-knop en het signup-formulier; e-mail/wachtwoord-**login** miste het,
waardoor de terugkerende ad-bezoeker (heeft account, logt in) alsnog brak. Nu draagt ook `loginAction`
de id: `appendPhDid()` (in `posthog-identity.ts`, padonafhankelijk) hangt hem aan de post-login-redirect
(zowel de relatieve `/onboarding?next=…` als de absolute `${APP_URL}/dashboard`), en de login-pagina
leest `posthog.get_distinct_id()` bij submit. Bestemmingskant (AuthContext) is ongewijzigd — die is
padonafhankelijk. Geïnventariseerde eindpunten: **Google OAuth** ✓, **signup/verificatielink** ✓,
**login** ✓; **reset-password** eindigt in `signOut()`→`/login` (geen ingelogde staat) → de login-brug
dekt het, geen eigen brug nodig; **magic link** bestaat niet in deze codebase.

**FIX B — persistente opslag ná consent.** Default `'memory'`; ná expliciete consent →
`'localStorage+cookie'` + `cross_subdomain_cookie:true`; terug naar `'memory'` bij intrekking. De cookie
op `.indxr.ai` deelt de distinct_id over `indxr.ai ↔ app.indxr.ai` (localStorage doet dat niet).

**FIX C — device-tz op het account.** Eén person-property op de bestaande `identify`-call + één kolom
`profiles.device_timezone` (gevuld client-side bij onboarding) + tonen in de `/admin/users`-tabel. Geen
nieuwe tabel/service/event.

## Rationale

- **alias i.p.v. bootstrap:** bootstrap seed alleen als er niks opgeslagen staat; zodra FIX B iets
  opslaat, negeert de SDK de bootstrap → A en B zouden elkaar bijten. `alias` is persistence-agnostisch
  en werkt identiek onder `'memory'` en `'localStorage+cookie'`.
- **URL i.p.v. storage:** de brug moet óók zónder consent werken; een cookie/localStorage zou 5(3)
  raken. Een URL-param is geen opslag.
- **UUID-guard + strip:** voorkomt dat een gedeeld toestel, gekopieerde link of dubbel geopende
  verificatiemail twee vreemden merged.
- **Init leest consent-cookie:** `ConsentProvider` is een *child* van `PostHogProvider`, dus zijn
  mount-effect draait vóór `posthog.init`. De returning-consented-case hoort daarom in `init` (dat de
  cross-subdomein `indxr_consent`-cookie leest), niet in het provider-effect.

## Consequenties

- Met consent: volledige artikel→signup→activatie-funnel meetbaar. Zonder consent: de OAuth/verificatie-
  hop is gebrugd, maar een eerdere artikel-klik die zelf een harde load was kan als losse persoon blijven.
- **Bekende meet-beperking (posthog-js #3130, open):** `set_config` dat `persistence` wisselt mint een
  nieuwe `session_id` → pre/post-consent-activiteit telt als aparte *sessies* (de persoon blijft intact).
  Bewust geen workaround; gedocumenteerd in `monitoring.md`.
- **Verificatiestatus.** Bewezen: build 2/2 groen, migratie toegepast, en de plumbing-guard
  (`posthog-identity.test.ts`: UUID-guard weigert getrunceerd/injectie/non-UUID; `appendPhDid` threadt
  geldig, dropt ongeldig; strip behoudt andere params). Een volledig geautomatiseerde E2E-harness die de
  echte server-side merge bewijst — zonder Google, via admin `createUser` + `generateLink` + Playwright +
  de PostHog persons-API — staat klaar in `scripts/verify-posthog-bridge.mjs` (login granted/denied,
  ongeldige ph_did, verificatielink; met cleanup van Supabase-user én PostHog-persoon). Die harness is
  **nog niet uitgevoerd**: hij is geblokkeerd op een PostHog **personal API key** (`phx_…`, scopes
  `person:read` + `person:delete`) die niet in de omgeving zit, plus bevestiging van de juiste
  API-regio-host (config is tegenstrijdig: `.env.local` = `us.i.posthog.com`, provider `ui_host` =
  `eu.posthog.com`). De harness gate't hierop en maakt zónder de key niets aan. Zie `monitoring.md`.
