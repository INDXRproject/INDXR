# Beslissing 023: Observability Stack — Sentry + PostHog + BetterStack + Crisp + Axiom

**Status:** Geaccepteerd
**Datum:** 2026-04-26
**Gerelateerde code:** Frontend Sentry init in Next.js root layout (`src/app/layout.tsx`), backend Sentry init in `backend/main.py`, Crisp embed in layout, BetterStack monitor-config (extern), Axiom Vercel-integratie

---

## Context

Pre-launch heeft INDXR.AI alleen **PostHog** (product analytics, al actief) en **Railway-logs** (~7 dagen retentie, beperkte search). Voor een betaald commercial product is dit onvoldoende:

- Geen error tracking buiten ruwe logs
- Geen uptime monitoring of status-page
- Geen support-channel voor users
- Geen bug-report flow gekoppeld aan errors

Zonder dit ontdek je productie-bugs via support tickets (lees: refund-aanvragen) in plaats van proactief, en users die vastlopen hebben geen escalatie-route.

---

## Beslissing

**Observability stack volgens industry-standaard voor bootstrapped Next.js + Python SaaS:**

| Tool | Rol | Tier pre-launch | Tier bij 10k users |
|---|---|---|---|
| **PostHog** | Product analytics, web vitals, funnels, session replay (al actief) | Free | ~€45/mnd |
| **Sentry** | Error tracking, source maps, performance, user feedback | Developer (free) | Team (~€26/mnd) |
| **BetterStack** | Uptime monitoring, status-page | Free (10 monitors) | Free of Pro indien status-page premium nodig |
| **healthchecks.io** | Cron/queue heartbeats | Free (20 checks) | Free |
| **Crisp** | Customer support chat | Free (2 operators) | Free |
| **Axiom** | Centrale logs, 30 dagen retentie | Free (500GB/mnd ingest) | Free |
| **Google Analytics 4** | Google Ads attributie ALLEEN | Free | Free |

---

## Rationale

### Waarom Sentry naast PostHog (niet vervangen)

PostHog heeft sinds 2026 ingebouwde error tracking, maar mist op punten die voor INDXR.AI relevant zijn:

- **Source maps voor Next.js**: Sentry's `@sentry/nextjs` heeft first-class source-map upload via build-step. PostHog ondersteunt dit functioneel maar gebruikers melden frequente issues bij Next.js builds.
- **Distributed tracing**: Sentry heeft waterfall-views over frontend → API → backend → AssemblyAI/DeepSeek calls. PostHog niet.
- **Error fingerprinting en grouping**: Sentry's algoritme groepeert vergelijkbare errors slim. PostHog's grouping is basaler.
- **Breadcrumbs en setContext**: voor payment-flow audits (refund-disputes, fraud-onderzoek) wil je rijke context per Stripe-call. Sentry's `setContext('payment', {...})` plus breadcrumbs zijn hier sterk in.
- **Release tracking**: Sentry koppelt errors aan specifieke deploys/commits voor crash-free-rate metrics.

PostHog blijft onmisbaar voor product-analytics, session replay, feature flags en funnel-tracking. Het is geen of/of-keuze.

### Waarom Crisp en niet Intercom of HelpScout

- **Free tier ondersteunt solo-developer volledig** (Khidr alleen): 2 operators, onbeperkte chats, email-fallback
- **30-min setup**: één snippet in Next.js layout, klaar
- **Custom fields voor authenticated users** (credits remaining, plan-tier, recent jobs) — zichtbaar in chat-inbox-context zodat support direct context heeft
- **Crisp bestaat sinds 2015**, profitable, geen migratie-risico
- **Intercom**: te duur (~€74/mnd minimum) en volume-prijzen schalen agressief
- **HelpScout**: prima maar overkill — Crisp's chat-first model past beter bij INDXR's user-base

### Waarom Sentry User Feedback widget náást Crisp (geen overlap)

Verschillende doelen:

- **Sentry User Feedback** = "ik kreeg een error, hier is wat ik aan het doen was" — gekoppeld aan stack-trace, automatisch context van de error
- **Crisp** = "ik heb een vraag of begrijp iets niet" — algemene support, geen error vereist

Een user die op een error stuit gebruikt de Sentry-widget (drie clicks vanaf de error). Een user met een algemene vraag opent de Crisp-bubble. Twee verschillende workflows, geen overlap.

### Waarom BetterStack en niet UptimeRobot

UptimeRobot's gratis tier is **non-commercial only** — onbruikbaar voor INDXR.AI. BetterStack staat commercieel gebruik toe op gratis tier (10 monitors, 10 heartbeats, ingebouwde status-page).

### Waarom healthchecks.io náást BetterStack

BetterStack monitort **HTTP-endpoints** (frontend reachable, backend health). Healthchecks.io monitort **dat een job daadwerkelijk gedraaid heeft** (dead-man's-switch). Verschillende failure-modes:

- BetterStack detecteert: "backend reageert niet meer" (HTTP 5xx of timeout)
- Healthchecks.io detecteert: "ARQ queue heeft 24u geen job verwerkt" of "Stripe webhook handler heeft geen heartbeat gestuurd in 1u" — dingen die HTTP-uptime-checks niet kunnen zien.

Voor INDXR.AI met queue-architectuur (zie ADR-019) is healthchecks.io structureel nodig, niet optioneel.

### Waarom Axiom voor logs

Railway logs zijn beperkt: ~7 dagen retentie, beperkte search-functionaliteit. Voor payment-flow audits (refund-disputes, fraud-onderzoek waarbij je drie weken terug moet kijken) is centralized logging vereist.

Axiom's free tier (500GB ingest/maand, 30 dagen retentie) is in 2026 het meest genereuze aanbod in de markt. INDXR.AI's logvolume schat ik op 5–20GB/maand bij 1k users en 50–200GB bij 10k users — ruim binnen free tier.

Vercel-integratie is one-click. Backend OTLP-export configureerbaar via `sentry-sdk[fastapi]` of standalone OpenTelemetry SDK.

### ~~Waarom GA4 ALLEEN voor Google Ads attributie~~ — ACHTERHAALD (ADR-087, 2026-08-02)

> **Deze sectie is achterhaald.** We doen **geen GA4**. De Google Ads-tag (`AW-…`) meet conversies zelf; PostHog doet product-analytics. Een tweede vendor (GA4) voegt cookies + een subverwerker toe zonder meerwaarde. Zie [ADR-087](087-google-ads-measurement-and-consent.md). De Ads-tag zit achter een eigen Consent Mode v2-banner (Basic mode) — de aanname elders in deze ADR dat "cookieless ⇒ geen consent-banner nodig" geldt niet meer voor advertentiemeting.

_Oorspronkelijke tekst (historisch):_ PostHog dekt UTM-tracking, funnels, web analytics en conversies beter dan GA4 voor product-gebruik. GA4 zou alleen op de Ads-launch-dag geactiveerd worden — dat is vervangen door de eigen Ads-tag + consent-laag van ADR-087.

---

## Geprojecteerde maandkosten

| Schaal | Pre-launch | 1k users | 10k users |
|---|---|---|---|
| PostHog | €0 (al actief) | €0 (free) | ~€45 |
| Sentry | €0 (Developer free) | €0 | ~€26 (Team) |
| BetterStack | €0 | €0 | €0 |
| healthchecks.io | €0 | €0 | €0 |
| Crisp | €0 | €0 | €0 |
| Axiom | €0 | €0 | €0 |
| GA4 | €0 | €0 | €0 |
| **Totaal** | **€0** | **€0** | **~€71/maand** |

Ruim binnen het door Khidr gestelde budget van €20–100/maand bij 10k users.

**PostHog volume-mitigatie (kritiek):**
Smart polling + Realtime is polling-zwaar. Zonder mitigatie eet INDXR's polling-events de PostHog free tier rond 3k–5k users. Concrete maatregelen:

- `capture_pageview: false` op alle polling-endpoints in `posthog-js` config
- Geen `capture()` call binnen polling-loops
- Stuur alleen heartbeat-events op `job_started`, `job_completed`, `job_failed`

Met deze instelling blijft PostHog binnen free tier tot 5–8k actieve users.

---

## Self-hosted fallback (toekomst)

Bij 25k+ users wordt self-hosting economisch — relevant voor Fase 3 (priorities.md), niet voor launch:

- PostHog cloud > €100/mnd → self-host op Hetzner CCX23 (€28/mnd, 4 vCPU/16 GB)
- Sentry cloud > €80/mnd → switch naar GlitchTip (Sentry-API-compatible, €15/mnd cloud of CX22 self-host €4,50/mnd)
- Axiom > 500GB/mnd → Loki self-host op CCX13 (€14/mnd)

Deze paden zijn beschikbaar omdat alle gekozen tools open formats hebben (PostHog en Sentry zijn beide self-hostbaar; GlitchTip is Sentry-API-compatible).

---

## Implementatie-volgorde (priorities.md)

- **1.1** Sentry frontend + backend (eerste taak van Fase 1, vangt eigen wijzigingen op)
- **1.2** Sentry User Feedback widget (direct daarna)
- **1.14** BetterStack uptime + healthchecks.io heartbeats
- **1.15** Crisp chat widget
- **Axiom + GA4-pre-launch**: parallel met andere Fase 1 taken (Axiom is one-click Vercel-integratie, GA4-tag pas inschakelen bij Google Ads launch)

---

## Consequenties

**Voordelen:**
- Volledige observability voor €0/mnd pre-launch
- Industry-standard stack — vergelijkbaar met wat Cal.com, Plausible, Castmagic en andere bootstrapped SaaS draaien
- Geen vendor lock-in op kritieke laag (PostHog en Sentry hebben self-hosted paden, Axiom en BetterStack zijn vervangbaar)

**Trade-offs:**
- Zes accounts om te beheren in plaats van één super-platform
- Iedere tool heeft eigen dashboard (admin-dashboard moet deeplinks bieden in Fase 2 — zie priorities.md taak 2.6)
- PostHog volume-monitoring vereist actieve hygiëne (polling-events filteren, anders kost PostHog te veel rond 5k users)

**Wat NIET in deze stack zit:**
- **Datadog, New Relic, SigNoz Cloud** — te duur voor solo-bootstrap (~€190+/mnd minimum), premature voor deze schaal
- **Volledige APM voorbij Sentry Performance** — Sentry's tracesSampleRate 0.1 is voldoende voor launch; full APM is een Fase 3-overweging

---

## Addendum 2026-07-18: PostHog privacy-by-design (roadmap 1.32)

**Aanleiding:** het privacy-beleid gaat "cookieless analytics, EU-hosted, geen tracking over sessies" claimen. Diagnose (`business/privacy-facts.md`, commit 0d5a6f1) toonde dat PostHog toen US-hosted, niet-cookieless (localStorage+cookie), met e-mail in `identify()` en zónder IP-onderdrukking draaide. Deze fix maakt het product waar aan de belofte. Geen data-migratie — de US-instance bevatte alleen pre-launch testverkeer (schone start op EU).

**Config-keuzes (in `packages/shared/src/providers/PostHogProvider.tsx`), geverifieerd in een live browser:**

| Keuze | Instelling | Waarom |
|---|---|---|
| **EU-host** | `api_host` → `https://eu.i.posthog.com` (via `NEXT_PUBLIC_POSTHOG_HOST`) | Data blijft in de EU (AVG). Eén env-var stuurt zowel client als de server-side `posthog-node` in de Stripe-webhook. |
| **Cookieless** | `persistence: 'memory'` | Geen cookie/localStorage device-id → geen herkenning over sessies. Geverifieerd: 0 PostHog cookies/localStorage/sessionStorage. Maakt cookie-consent voor analytics overbodig (1.18). |
| **Geen session replay** | `disable_session_recording: true` | Vervangt de field-masking uit 1.32: geen DOM-opname = geen PII-lek, sterker dan `maskAllInputs`. |
| **Geen PII in profiel** | `identify(user.id, { source, created_at })` — e-mail verwijderd | Alleen pseudoniem `user.id`; `source`/`created_at` zijn geen persoonsgegeven. |
| **Geen IP** | `before_send` zet `event.properties.$ip = null` | In-code (robuuster dan de org-level toggle). Geverifieerd: input-IP `203.0.113.5` → output `null`. Server-side: `disableGeoip: true`. |

**Admin-deeplinks** (`admin/users`, `admin/paid-users`) → `eu.posthog.com`.

**Ongewijzigd:** ~~GA4 blijft zoals besloten~~ → **achterhaald door [ADR-087](087-google-ads-measurement-and-consent.md): geen GA4; de Google Ads-tag meet zelf, achter een eigen Consent Mode v2-banner (Basic).** De PostHog-cookieless-config blijft ongewijzigd, maar de eerdere gevolgtrekking "cookieless ⇒ geen consent-banner nodig" geldt niet meer voor de Ads-cookie `_gcl_au` (die vereist wél toestemming; PostHog blijft eronderuit). **Sentry** blijft actief — let op: **Sentry is óók een subverwerker** die IP's en (bij replay) DOM kan bevatten; die hoort in de subverwerkers-alinea van het privacy-beleid (1.18). Crisp is (nog) niet in de code aanwezig → niet noemen in het beleid tot het er is.

**Khidr-actie:** verse EU-projectkey aanmaken op `eu.posthog.com`, `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST`/`_PROJECT_ID` op Vercel (beide projecten) + lokaal zetten, en de **US-instance opzeggen zodra de EU-instance events ontvangt**.