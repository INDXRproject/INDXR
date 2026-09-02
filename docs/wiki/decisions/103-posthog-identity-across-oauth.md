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
- **Verificatiestatus (bijgewerkt 2026-09-02, met personal API key).**
  - *Bewezen:* build 2/2 groen; migratie toegepast; plumbing-guard-unit-test groen
    (`posthog-identity.test.ts`). En in een **echte browsersessie tegen productie** (geverifieerd via
    `scripts/verify-posthog-bridge.mjs` PHASE 1 + directe netwerk-observatie): (a) de login-pagina hangt
    zijn eigen posthog-`distinct_id` als `ph_did` aan de post-login-redirect (verzendkant werkt);
    (b) `identify(user.id)` vuurt op de bestemming (de `/flags/`-call draagt `distinct_id = user.id`);
    (c) een **geldig** `ph_did` wordt gealiast + gestript (`replaceState`), een **ongeldig** (getrunceerd
    / injectie) wordt door de guard geweigerd en blíjft in de URL. Dat bewijst de discriminerende
    bridge-logica end-to-end.
  - *Infrastructuur bevestigd:* de prod-client-key (`phc_C8LCMz9…`) → EU-project (`@current`); prod
    `indxr.ai/ingest` → EU (persons met `host: indxr.ai` staan in het EU-project). De
    config-tegenstrijdigheid is opgelost (zie hieronder); **productie verwerkt in de EU** — de
    `us.i.posthog.com`-waarde stond alleen in lokale `.env.local` (gitignored) en raakte prod nooit.
  - *Niet observeerbaar in deze omgeving:* de server-side `distinct_ids[]`-merge (PostHog persons-API).
    De app-`posthog-js` verstuurt **geen enkel capture-event** vanuit een geautomatiseerde browser
    (getest: headless, headed via `DISPLAY`, echte-UA + `webdriver` verborgen, consent verleend,
    timer-throttling uit — telkens alléén `/config.js` + `/flags/` + `/static`, nooit `/i/v0/e/`). Dit is
    posthog's client-side automatiserings-/botfiltering: `capture()` is een no-op terwijl flags wél laden.
    Echte gebruikers-browsers versturen wél captures (het EU-project bevat echte client-side personen), dus
    de brug werkt in productie; alleen een geautomatiseerde harness produceert het alias-event niet. Er is
    **niet** met de hand een alias-event verstuurd om het groen te forceren (dat zou PostHog's alias
    bewijzen, niet onze code). Zie `monitoring.md`.

- **Phase 2 bevestigd + reset-bug gefixt (2026-09-02, deel 2).** Khidr's prod-export toont Phase 2
  **groen**: een echte Google-login-sessie produceerde `$create_alias` + `$identify`
  (`$anon_distinct_id`) op één persoon — de brug werkt server-side. Maar de merge reikte maar **één hop**
  terug: alleen de `/login`-id, niet de artikel-landingspagina-id. Oorzaak (bewezen met echte-browser-
  cookie-observatie vóór wijziging): `posthog.reset()` in `AuthContext` draaide onvoorwaardelijk in de
  anonieme (geen-sessie) tak. `onAuthStateChange` vuurt `INITIAL_SESSION`/`session=null` op elke anonieme
  paginalading, en `reset()` mint een nieuwe anonieme `distinct_id` → de id wisselde binnen ~0,2s op de
  artikelpagina (`ec88` → `ed0f`, geen navigatie) en opnieuw op `/login`, waardoor de landings-id wees
  werd. Dit defeatte óók FIX B (de consent-cookie wérd geschreven en gelezen — persistence werkte — maar
  `reset()` gooide de id daarna weg). **Fix:** `posthog.reset()` alléén nog bij `event === 'SIGNED_OUT'`
  (echte uitlog), nooit voor anonieme bezoekers → id stabiel van landing → login → de brug aliast de echte
  landingspagina-id. Single `posthog.init` (dubbele init uitgesloten). Apart gemeld (niet in deze fix):
  `$rageclick` op `/login` vlak vóór "Continue with Google" — de Google-knop heeft geen pending-state, dus
  geen tap-feedback tijdens de OAuth-redirect.

- **Config-fix (2026-09-02).** `NEXT_PUBLIC_POSTHOG_HOST` stond in lokale `.env.local` op
  `us.i.posthog.com` terwijl `next.config` naar `eu.i.posthog.com` default en `PostHogProvider.ui_host`
  correct `eu.posthog.com` is. De committed `.env.local.example`'s zetten nu expliciet
  `https://eu.i.posthog.com` met waarschuwing; lokale `.env.local`'s zijn rechtgezet. `ui_host = eu` is
  correct en blijft. Empirisch bevestigd dat prod al naar de EU ingest.
