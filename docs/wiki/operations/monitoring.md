# Monitoring

## PostHog Events

INDXR.AI gebruikt PostHog voor product analytics. Events worden getracked op zowel frontend als backend.

### Frontend Events (automatisch via PostHog JS)

- Paginaweergaven (automatisch)
- Navigatie / routewijzigingen
- User identify bij login: `{source, created_at}` — **géén e-mail/PII** (alleen het pseudonieme
  `user.id` als distinct_id; `AuthContext.tsx`). *(Correctie 2026-08-30: dit stond eerder als `{email,
  source, created_at}` — de code stuurt e-mail bewust niet mee.)*
- User reset bij logout
- `signup_source` is **geen PostHog-event** maar een `profiles`-kolom (acquisitie-attribuut, gezet via
  `AcquisitionCapture`/`auth-actions`). *(STATUS.md noemde het abusievelijk een event.)*

### Backend Events (handmatig getracked)

| Event | Trigger | Properties |
|-------|---------|------------|
| `premium_action_completed` | **Voltooide betaalde actie** (backend, `premium_actions.record_premium_action`): AI-transcriptie klaar, AI-samenvatting gegenereerd, of playlist-video voorbij de gratis drie. NIET bij signup/caption/pageview/gefaalde job. | `action_type` (`ai_transcription`/`ai_summary`/`playlist_video`), `source_minutes`, `credits_used`, `is_first_premium_action` |
| `whisper_started` / `whisper_completed` / `whisper_failed` | AssemblyAI submit / succes / fout (`transcription_pipeline.py`). `whisper_completed` draagt nu `playlist_id` (None = losse upload/YouTube, gezet = playlist-video) zodat losse vs playlist onderscheidbaar is. | `video_id`, `source_type`, `playlist_id`, `duration_seconds`, `credits_used`, … |
| `credits_purchased` | Stripe webhook `checkout.session.completed` (**gezaghebbend, server-side**). | `amount`, `credits_added`, `currency`, `session_id` |
| `credits_deducted` | *Legacy — vuurt in de praktijk (bijna) niet meer:* alleen op het niet-reservering-pad, en productie draait op reserve/settle (ADR-050). De echte aftrek is de settlement; geen actie nodig. | `amount`, `reason`, `balance_after` |

> **`is_first_premium_action` is de campagne-KPI.** Bepaald server-side, atomisch, via
> `mark_first_premium_action` (conditionele UPDATE op `profiles.first_premium_action_at IS NULL`); exact
> één call per account wint. De DB-kolom is de bron voor admin *cost per activation* + activatie→aankoop-cohort;
> het event spiegelt 'm. Waarom activatie i.p.v. aankoop: zie ADR-101.
>
> **Dubbeltelling `credits_purchased` opgeheven (2026-08-30):** de success-pagina vuurde 'm ook
> client-side (ongeguard → opnieuw bij reload, dunnere props). Verwijderd; alleen de webhook telt nu.

> **Geen `summarization_completed`-event (bewust, 2026-08-29).** Eerder stond hier een
> `summarization_completed`-regel ("na succesvolle DeepSeek samenvatting") — die was nooit
> geïmplementeerd én verwees naar het verwijderde DeepSeek-model (ADR-090). Niet alsnog gebouwd:
> de voltooiing van een samenvatting wordt al **rijker** vastgelegd in de DB-laag — `ai_summary_usage_log`
> (per gateway-call: model, tokens, `chapter_ms`, kosten, regio, finish_reason, `is_test`) voedt de
> admin-panelen *AI-summary cost* (`admin_summary_cost_panel`), *chapter duration* (`admin_chapter_duration_panel`)
> en *per-user COR* (`admin_summary_cost_per_user`), plus de rolling-baseline en de kosten-breaker. Een enkel
> PostHog-event zou een strikt armere duplicatie zijn; PostHog is hier bovendien cookieless/`identified_only`.

## Google Ads-conversies (ADR-087, ADR-101)

Drie conversieacties, alle client-side via `gtag` (`packages/shared/src/lib/gtag.ts`), Consent Mode v2
**Basic** (niets vuurt vóór toestemming; zonder toestemming laadt gtag.js niet → de push wordt gedropt,
geen fout). Labels in beide Vercel-projecten als env-var; lege var → stille no-op.

| Actie | Helper | Vuurpunt | Window | Waarde | Count | Categorie |
|-------|--------|----------|--------|--------|-------|-----------|
| **purchase** | `trackPurchase` | success-pagina, ná bevestigde Stripe-sessie (localStorage-guard + `transaction_id`=session) | 90 dagen | werkelijke bruto EUR-lijstprijs (`pricing.ts`, ADR-087) | Every | Purchase |
| **activation** | `trackActivation` | `useJobStatus.onComplete` als `job.first_premium_action===true` (server-truth), localStorage-guard per job | 30 dagen | **€1** (`value:1, currency:EUR`) — zodat de biedstrategie activatie (€1) vs aankoop (werkelijke waarde) kan wegen | One | Begin checkout |
| **signup** | `trackSignup` | onboarding-voltooiing, `event_callback`-redirect | secundair, observatie-only | geen | — | — |

**Enhanced Conversions staat bewust UIT** — zelfde reden als Consent Mode **Advanced** uit staat (ADR-087):
Enhanced Conversions hasht en uploadt e-mail/telefoon naar Google voor betere matching; dat is precies de
extra PII-deling naar Google die we vermijden. Basic + geen enhanced = minimale data naar Google.

**Bron vs conversie is bewust asymmetrisch (aanvulling op ADR-101):** de activatie-conversie vuurt
**client-side** terwijl de bron (`premium_action_completed`) **server-side** is. Google telt daardoor
**minder** activaties dan het admin-dashboard wanneer iemand zijn tab sluit tijdens een lange job (de
server voltooit + telt, de client vuurt nooit). Dat is geaccepteerd, niet weg te werken: de server-side
route (offline conversion import) bouwen we NIET, want Google ontdubbelt niet tussen een Website-actie en
een Import-from-clicks-actie → twee routes zou dubbeltellen. De **klik-ID's** (`gclid`/`gbraid`/`wbraid`
+ `click_id_at` op `profiles`, gezet bij signup via de acquisitie-trigger) worden nú opgeslagen zodat een
server-side upload later alsnog mogelijk blijft zonder dat vroege klikken onherstelbaar verloren zijn.

### PostHog Configuratie

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_API_KEY=phc_...      # Backend (Python)
```

PostHog Provider: `src/providers/PostHogProvider.tsx`  
Backend tracking: `backend/main.py:33-40` (`track_event()` functie)

**Fire-and-forget:** PostHog tracking blokkeert nooit de hoofdflow. Failures worden gelogd als warnings.

---

## Identiteit over de OAuth-/verificatie-grens (ADR-103)

**Probleem.** posthog-js draait standaard op `persistence:'memory'` (cookieless, ePrivacy 5(3)). Een
*harde* page-load genereert dan een **nieuwe** anonieme `distinct_id`. De redirect naar
`accounts.google.com` — en de klik op een e-mailverificatielink — is precies zo'n harde load. Zonder
maatregel merged `identify(user.id)` op de terugkeer alléén de *huidige* (post-reload) anonieme id; de
pre-signup id blijft wees. Eén echte gebruiker werd zo 3 losse PostHog-personen en elke
ad-klik→activatie-funnel las structureel nul.

**FIX A — id-brug via de URL (werkt voor IEDEREEN, ook zónder consent).** Bij de klik op "Continue with
Google" / bij het versturen van het signup-formulier lezen we `posthog.get_distinct_id()` en hangen we
het als `ph_did` aan de callback-URL (`buildCallbackUrl` in `actions/auth-actions.ts`). Supabase
appendt zijn eigen `?code=…` en behoudt onze param (bewezen door de bestaande `next`-param). De callback
(`apps/marketing/src/app/auth/callback/route.ts`) forwardt `ph_did` naar de login/signup-bestemmingen —
**nooit** naar de recovery-route. Op de bestemming leest `AuthContext.tsx` de param **één keer bij mount
in een lazy `useRef`** (vóór enig effect hem kan strippen) en roept ná `identify(user.id)`
`posthog.alias(ph_did)` aan. Daarna `history.replaceState` → param gestript, ref genulld (draait exact
één keer). Er wordt **niets op het apparaat opgeslagen** — de id reist alleen in de URL (5(3) gaat over
opslag, niet URL-params). Guards: alleen een geldig UUID-formaat (`isValidDistinctId`) en `≠` de huidige
distinct_id, zodat een gedeeld toestel / gekopieerde link / dubbel geopende mail nooit twee vreemden
merged. Volgorde klopt óók bij een koude load: de sessie komt uit de cookie → `onAuthStateChange` vuurt
`INITIAL_SESSION` → `identify` → `alias`, en de ref is bij first render al gevuld.

**FIX B — persistente opslag ná consent.** Default blijft `'memory'`. Bij expliciete consent
(`ConsentProvider.grantAll`) → `posthog.set_config({persistence:'localStorage+cookie',
cross_subdomain_cookie:true})`; bij intrekking (`denyAll`) → terug naar `'memory'`. Een terugkerende,
al-toestemming-gegeven gebruiker start meteen persistent: `PostHogProvider` leest bij init de
cross-subdomein `indxr_consent`-cookie (`analytics_storage==='granted'`). De **cookie** op `.indxr.ai`
(niet localStorage) is wat de distinct_id over `indxr.ai ↔ app.indxr.ai` deelt.

**Wat wél/niet meetbaar is:**
- *Met consent:* de distinct_id overleeft álle hops (artikel → signup → activatie) via de
  cross-subdomein cookie. Volledige funnel meetbaar.
- *Zónder consent:* FIX A brugt de OAuth/verificatie-hop (pre-signup-id → post-login), dus de
  pageview net vóór signup merged met de activatie. Een eerdere **artikel-klik** die zélf een aparte
  harde load was, kan als losse anonieme persoon blijven staan — die hop heeft geen `ph_did`-brug.

**Bekende meet-beperking (posthog-js #3130, open).** `set_config` dat `persistence` wisselt mint een
**nieuwe `session_id`**. Daardoor telt pre- vs. post-consent-activiteit als aparte *sessies* (de
*persoon*/distinct_id blijft wél intact). Bewust geen workaround gebouwd; documenteer het hier zodat
sessie-telling rond het consent-moment niet verkeerd geïnterpreteerd wordt.

**Verificatie (handmatig — niet headless automatiseerbaar).** Een echte person-merge-meting vereist een
interactieve Google-login (of een echte inbox voor de verificatielink) + prod-PostHog, en de
ad-klik→activatie-funnel vult zich pas over dagen. Recept: (1) schone browser, klik een ad-link →
artikel → signup via Google; (2) na login, in PostHog: open de persoon `= user.id` en controleer dat het
`$pageview`-event van vóór de signup én een `premium_action_completed` van erna op **dezelfde** persoon
staan. API: `GET /api/projects/:id/persons/?distinct_id=<user.id>` → `distinct_ids[]` moet de anonieme
pre-signup UUID bevatten. (3) Herhaal met consent geweigerd: de OAuth-hop merged nog steeds; een losse
artikel-klik-pageview kan apart blijven.

---

## Logging (Backend)

### Log Niveaus

Geconfigureerd via `LOG_LEVEL` env var in Railway (standaard: `INFO`).

```python
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("indxr-backend")
logger.setLevel(logging.INFO)  # expliciet noodzakelijk — zie waarschuwing hieronder
```

> **Waarschuwing: `basicConfig()` is een no-op onder uvicorn.** Python's `logging.basicConfig()` doet niets als de root logger al handlers heeft — en uvicorn configureert de root logger vóór applicatiecode laadt. Uvicorn zet de root logger op WARNING, waardoor `logger.info()` calls van de `indxr-backend` logger stil worden gefilterd (ze propageren naar root, maar root filtert ze weg). De `logger.setLevel(logging.INFO)` op de named logger bypast dit: het level wordt gecontroleerd op de logger zelf, vóór propagatie. Verwijder deze regel niet.

| Niveau | Gebruik |
|--------|---------|
| `DEBUG` | Gedetailleerde flow, bgutil-pot versie check |
| `INFO` | Normale operaties (credit deducties, job status) |
| `WARNING` | Niet-kritieke problemen (PostHog failure, geen credit record) |
| `ERROR` | Kritieke failures (credit deductie mislukt, DeepSeek fout) |

**In productie:** Gebruik `INFO` of `WARNING`. `DEBUG` geeft veel output.

### Wat je ziet in Railway logs

```
2026-04-13 12:00:00 - indxr-backend - INFO - Supabase client initialized
2026-04-13 12:00:01 - indxr-backend - INFO - Credit cost for 1234.56s: 3 credits
2026-04-13 12:00:01 - indxr-backend - INFO - Credits deducted: 3 from user abc123 (42 → 39)
2026-04-13 12:00:05 - indxr-backend - INFO - Summary generated and saved for transcript-xyz
```

---

## Frontend Logging

- `console.log` voor webhook events in `stripe/webhook/route.ts`
- `console.error` voor Supabase errors in `AuthContext.tsx`
- Sentry is geconfigureerd — zie sectie hieronder

---

## Sentry Error Tracking

Actief op backend (Railway) én frontend (Vercel).

### Backend

| File | Init | DSN env var |
|------|------|-------------|
| `backend/main.py` | Ja — `FastApiIntegration`, `HttpxIntegration` | `SENTRY_DSN_BACKEND` |
| `backend/worker.py` | Ja | `SENTRY_DSN_BACKEND` |

**Capture pattern:**
```python
with sentry_sdk.push_scope() as scope:
    scope.set_tag("task_name", "...")
    scope.set_tag("job_id", job_id)
sentry_sdk.capture_exception(e)
```

`push_scope()` zorgt dat tags niet lekken naar concurrent async jobs.

**Context-enrichment tags:**

| Tag | Waar gebruikt |
|-----|--------------|
| `task_name` | Alle worker tasks + pipeline |
| `pass` | Watchdog passes (1a / 1b / 2) |
| `job_id` / `playlist_job_id` | Job-identiteit |
| `video_id` | Per-video operaties |
| `user_id` | Credit- / auth-operaties |
| `endpoint` | main.py route handlers |
| `cascade_step` | yt-dlp cascade (step2_yt-dlp) |
| `error_type` | Geclassificeerd via `_classify_download_error` |

**Bewust NIET gecaptured** (comment in code toegevoegd):
- PostHog fire-and-forget failures (`track_event` warnings)
- `bot_detection`, `timeout`, `members_only`, `no_captions` extractie-uitkomsten — operationeel, geen bug
- YouTube Data API quota-fallthrough naar yt-dlp — by design
- Cache misses in `master_transcripts_read`

### Frontend

Geconfigureerd via:
- `instrumentation.ts` — routing naar server/edge configs
- `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`
- `next.config.ts` — `withSentryConfig` plugin

**Capture pattern:**
```typescript
import * as Sentry from '@sentry/nextjs';
Sentry.captureException(error, { tags: { route: 'api/...', step: '...' } });
```

**Geïnstrumenteerde API routes:**

| Route | Stappen |
|-------|---------|
| `api/extract` | `python_backend_call`, `request_parse` |
| `api/stripe/webhook` | `signature_verification`, `add_credits_rpc` (FINANCIEEL) |
| `api/ai/summarize` | `route` tag |
| `api/transcribe/preflight` | `route` tag |
| `api/playlist/info` | `python_backend_call`, `request_parse` |
| `api/video/metadata/[videoId]` | `route`, `video_id` tag |

### Sentry runtime vereisten

`export const runtime = 'nodejs'` is gedeclareerd op alle geïnstrumenteerde routes. Zonder deze declaratie defaultt Next.js 16 op Vercel naar edge runtime en runt `Sentry.init()` nooit.

`await Sentry.flush(2000)` staat na elke `captureException` call — vereist omdat Vercel het serverless process kan killen voordat de async transport de envelope verstuurt.

**Huidige beperking:** Server-side `captureException` werkt structureel niet op Vercel, ook met `runtime = 'nodejs'` en `flush`. Bekend probleem (Sentry issue #17604, closed-not-planned). Zie [known-issues.md](known-issues.md) voor volledige analyse. De code blijft staan — werkt zodra Sentry/Vercel het oplost.

**Workaround voor server-side debugging:** Vercel function logs (Dashboard → Functions → selecteer route).

---

## Gezondheidscheck

```bash
# Check of Railway backend healthy is
curl https://indxr-production.up.railway.app/health
# → {"status": "healthy"}
```

---

## Externe-service-gezondheid (F17, ADR-067)

Nachtelijke ARQ-worker-cron `fetch_service_metrics` (Railway, **02:00 UTC**, naast de snapshot-cron) haalt server-side op:
- **DeepSeek prepaid-saldo** (`GET api.deepseek.com/user/balance`, `DEEPSEEK_API_KEY`) → `service_metrics` → Operations-kaart "External services". Status `ok`/`low`/`unavailable`; alert onder `cost_config.deepseek_low_balance_usd` (default $5, instelbaar). Faalt de call → "unavailable" + tijdstip laatste geslaagde ophaling, **nooit $0/oud getal**.
- **Decodo dagverkeer** (`POST api.decodo.com/api/v2/statistics/traffic`, **`DECODO_API_KEY`** = dashboard-token op de **worker-service**) → `decodo_daily_usage` → Finance-reconciliatie. Geen key → reconciliatie blijft "unavailable" (geen gefabriceerd gat).
- **AssemblyAI:** geen balance/usage-API (auto-recharge PAYG) → bewust niets gebouwd (zie provenance §2.13d).

Log-tag: `[service-metrics]` in Railway worker-logs.

## Operations-dashboard (admin, V3)

`/admin/operations` (server component) draait op de RPC **`admin_operations_v3(p_from, p_to, p_exclude_internal)`**
(laatste migratie `20260728015137_..._turnaround_wasted_playlist_errors.sql`). Georganiseerd rond de Four
Golden Signals; **geld staat er bewust NIET in** — dat blijft Finance (`admin_finance_summary`).

**Job- vs unit-niveau (ADR-081):** JOB-niveau-metrics (ai_total, AI-success_rate, errors.total/by_type/
daily) filteren `source_kind IN ('single','upload')` — playlist-kindjobs (`source_kind='playlist'`)
vervuilen de standalone-cijfers dus NIET. UNIT-niveau-telemetrie (latency, audio, provider) blijft ALLE
transcripties (playlist-video's lopen door dezelfde pipeline → geldige unit-meting).

Panelen:
- **Status-oordeel** (bovenaan) — 🔴/🟡/🟢-verdict "moet ik nú iets doen?", ergste actieve signaal wint
  (stuck>0 / success<70%/90% / saturatie≥60/90%), met reden + actie. Drempels zijn startgokken.
- **Live now** — in-flight / queue / stuck + AssemblyAI-saturatie (`ops_config.assemblyai_concurrency_limit`, 200).
  Bij géén activiteit toont het scherm alleen het oordeel + Live-now ("Quiet"), geen muur lege kaarten.
- **Traffic** — jobs (single/upload/playlist) **én units apart** + captions.
- **Errors** — success-rate + error% + **download-faal-per-duurcategorie** + dagreeks + de **volledige
  fouttaxonomie gegroepeerd naar schuld, inclusief 0-rijen** (us/transient/youtube/user/unknown),
  uitklapbaar met de **ruwe backend-meldingen** (`errors.samples`, tot 3 per type).
- **Latency** — **provider_turnaround** (`submitted_at`→`completed_at`) is het HOOFDgetal (altijd meetbaar,
  loopt op bij saturatie); queue-wait + processing_ms zijn secundair (vullen alleen bij echte wachtrij —
  AssemblyAI geeft geen timing-timestamps, en 1u audio verwerkt in ~30s dus de queued→processing-overgang
  wordt meestal gemist). mediaan/p95/max; leeg → "no data yet" nooit 0; onder n=20 geen p95/max (valse precisie).
- **Playlist reliability** — videos effective; first-pass/recovered pas zichtbaar zodra hun capture data
  heeft; + **playlist-video-foutuitsplitsing** op unit-niveau (uitklapbare ruwe meldingen, `source_kind='playlist'`).
- **Audio & provider** — download-MB + **verspilde proxy-MB op mislukte jobs** (gedrag/bytes, geen geld) +
  formaat/model/taal-verdeling.
- **Uptime** — eerlijk "nog niet ingericht"-vak tot een externe monitor (Better Stack) live is.

De oude `admin_operations_summary` blijft bestaan (niet meer door de UI gebruikt). Toegang via de
admin-service-role-client; route-niveau admin-gating (`ADMIN_EMAIL`).

### Summary cost (ADR-098) — de kostenkant

Los van de Golden-Signals-panelen (die geen geld tonen) staat er nu één **Summary cost**-sectie op
`/admin/operations`, gevoed door **`admin_summary_cost_panel(p_days=30)`** — alleen productie-verkeer
(`ai_summary_usage_log.is_test = false`; health-metingen zijn uitgesloten). Wat het toont en **wat rood
betekent + wat te doen**:

- **Cost & margin per duurklasse** (≤30 / 30–90 / >90 min): kost per samenvatting als **mediaan én p99**
  (mediaan = normaal bereik, p99 = uitschieters/herhaalpogingen), plus de **marge** = opbrengst − kost op
  het **goedkoopste pakket** (Power €0,02/credit = worst-case).
  - 🔴 **marge < 0** = die (klasse van) samenvatting is op het goedkoopste pakket verliesgevend. **Sinds
    de creditformule +1/10 min (ADR-098 Add.2) horen lange video's hier NIET meer rood te staan** — de
    marge is nu gezond over het hele duurbereik (>90 min worst ~+€0,10, mediaan ~+€0,18). Als hier tóch
    rood verschijnt is dat een echt signaal: óf de tokenkost is structureel gestegen (check finish_reason
    + de rolling-baseline-WARNING), óf een run had een dure Sonnet-fallback. Actie: onderzoek, niet
    negeren. (De ≤30 min-klasse kan één break-even-uitschieter tonen: ≤30 min is altijd 3 credits, dus de
    formule raakt die niet — géén actie nodig bij één zulke cel.)
  - 🟠 marge < 1 cent = krap. 🟢 = gezond.
- **Safety-net share** (retry vs fallback) + **breaker fires**: aandeel calls dat het vangnet (ADR-090)
  nodig had.
  - 🟢 0% is de norm. 🟠 <5%, 🔴 ≥5% = **systematisch modelfalen** — het model levert structureel
    afgekapte/lege secties. Actie: check de finish_reason-verdeling en de leverancierstatus; dit is het
    vroegste signaal vóór het geld kost.
  - **Unresolved = structureel 0**: een sectie die ná alle pogingen nog afgekapt is, laat de **onderbreker**
    (ADR-098) de run stoppen + **alle credits teruggeven**. Het tweede getal ("breaker fires") is hoe vaak
    dat gebeurde; 🟠 >0 = onderzoek waarom (leverancier-regressie of een runaway).
- **Finish reason / model**: verdeling per call. 🔴 `length` = afgekapt door het tokenbudget → budget
  verhogen. Een stijgend **fallback-model**-aandeel = het primaire model faalt, vóór het de marge raakt.

**Onbewaakte bescherming (draait zonder dat iemand kijkt):**
- **Harde onderbreker per taak** (`SummaryCostBreaker`, `summary_pipeline.run_summary`): stopt een run bij
  een onopgeloste sectie, herstel-aandeel > 50%, kost/min > €0,02 of absolute kost > €1,50 → volledige
  teruggave + duidelijke user-message. Grenzen env-override­baar. Bewezen via `backend/test_summary_breaker.py`.
- **Rolling-baseline** (`check_summary_cost_baseline`, nachtelijk in `fetch_service_metrics`): vergelijkt
  kost/min laatste 7d vs basislijn dag 8–37, logt een WARNING bij ratio > 2,0 (verdubbeling). Elke uitkomst
  in `summary_cost_baseline_log`. Minimum-sample-guard (recent n≥3, prior n≥5) tegen vals alarm.
- **Per-user COR** (`admin_summary_cost_per_user`): maakt een account dat structureel meer kost dan het
  oplevert zichtbaar.

### AI-summary chapter duration (ADR-096) — leespaneel, geen alarmen
In "Pipeline speed & quality": **per-hoofdstuk-doorlooptijd** van AI-samenvattingen. Bron:
`admin_chapter_duration_panel(30)` op `ai_summary_usage_log.chapter_ms` (per-hoofdstuk-tijd, gedeeld met
de meetlaag; testverkeer `is_test` uitgesloten, net als de kostenpanelen). Toont: (1) percentielen
p50/p90/p95/p99/max van de hoofdstukduur — hoe lang een hoofdstuk normaal/traagst duurt; (2) het aandeel
van de totale samenvattings-tijd dat naar het traagste hoofdstuk gaat (mediaan + p90); (3) op welke
**positie** (chapter-index) het traagste hoofdstuk zit. **Bewust geen drempels/alarmen** — er is nog te
weinig data om "normaal" te kennen; dit paneel is er juist om dat te leren.

## Wat nog ontbreekt

- **Uptime monitoring — INGERICHT (2026-07-31), BetterStack.** **3 URL-monitors** ("URL becomes unavailable", 3-min): `indxr.ai`, `app.indxr.ai`, `indxr-production.up.railway.app/health`. Plus **1 Heartbeat** voor de portloze worker (verwacht elke 5 min, grace 5 min): `worker.watchdog_interrupted_jobs` pingt `BETTERSTACK_HEARTBEAT_URL` aan het eind van elke cyclus (elke 2 min → ruim binnen de grace). **`BETTERSTACK_HEARTBEAT_URL` staat ALLEEN op de worker-service** (de API is al gedekt door de `/health`-monitor); code env-gated. Een gemiste ping = worker dood → alarm.
  - **In het dashboard (optie B):** `/admin/operations` haalt de status van de monitors + heartbeat **live** op via de BetterStack-API (`uptime.betterstack.com/api/v2/monitors` + `/heartbeats`, server-side fetch in `operations/betterstack.ts`, `cache: no-store`, 5s-timeout). Token = **`BETTERSTACK_API_TOKEN`** als env-var op het **Vercel `indxr-app`-project** (server-only, geen `NEXT_PUBLIC_`). Env-gated + volledig graceful: geen token → placeholder; API-fout/timeout → "unreachable"-regel, breekt nooit het dashboard. Volledige historie/response-tijden/incidenten blijven in de BetterStack-UI.
- **Sentry alerting rules:** Sentry is geconfigureerd maar nog geen alert-regels ingesteld voor watchdog-errors of financiële failures.
- **Database monitoring:** Supabase Dashboard heeft basis query-statistieken; geen aangepaste dashboards.

---

## Dependency-onderhoud

### Principe

Pin alle externe dependencies voor reproduceerbare builds, maar loop niet ver achter. Een gap van 3,5 maanden op yt-dlp (bewezen root cause van bot-detection in juni 2026) is te lang. Live-zet altijd handmatig na een groene verificatietest — nooit volledig automatisch, want dependencies (vooral yt-dlp) brengen breaking changes uit die het production-pad kunnen breken.

### Per-dependency risicoverzicht

| Dependency | Onderhoudsfrequentie | Breekrisico | Koppeling |
|------------|---------------------|-------------|-----------|
| **yt-dlp + yt-dlp-ejs** | Wekelijks (YouTube adapteert) | Hoog — stale signatures → bot-detection, verwijderde clients, nieuwe JS-runtime-vereisten | yt-dlp-ejs-versie volgt yt-dlp interne ejs-versie; Node.js-versie gekoppeld aan yt-dlp's minimumeisen (nu v22+) |
| **Node.js** (in Dockerfile) | Majors ~1×/jaar | Laag → Hoog bij major: yt-dlp eist minimumversie (zie upgrade 2026-06-25) | Aan yt-dlp-versie gekoppeld |
| **Next.js** | Majors 1-2×/jaar | Hoog bij major — middleware→proxy conventie wisselt (Next.js 17, al genoteerd), App Router API wijzigt | Vercel auto-detecteert versie; upgraden vereist migratiepas |
| **youtube-transcript-api** | Maandelijks | Matig — YouTube timed-text API wijzigt geregeld; proxy-API (`GenericProxyConfig`) kan veranderen | Stap 1 van caption-cascade |
| **FastAPI / Pydantic** | Meerdere keren per jaar | Laag-Matig — breaking changes bij major | Pydantic v2 was een grote overgang; v3 te monitoren |
| **AssemblyAI SDK** | Maandelijks | Matig — model-namen en API-endpoints veranderen | Transcript-pipeline; `assemblyai_client.py` |
| **Stripe** | Maandelijks | Matig bij API-versie bumps — webhook payload-structuur kan veranderen | Financiële routes — extra auditplicht |
| **Supabase JS + Python** | Maandelijks | Laag-Matig | Auth-cookies, RLS, RPC-signatures |
| **Sentry** | Maandelijks | Laag | Capture-API is stabiel |

### Verificatietest (nog te bouwen — zie Fase 2 taak 2.9)

Na elke versie-bump van een hoog-risico dependency:
1. **yt-dlp:** extract captions van 3 bekende video's (Engels, Arabisch, members-only) via de volledige cascade. Verwachte resultaten documenteren.
2. **youtube-transcript-api:** idem, stap-1-only test.
3. **Next.js:** volledige Playwright smoke-test (aanwezig: `tests/playwright/specs/`).
4. **Stripe SDK:** Stripe CLI webhook test (`stripe trigger checkout.session.completed`).

Promotiebeslissing na groene test — nooit automatisch.

### Nightly/master-builds

Bewust NIET in productie. yt-dlp nightly heeft minder stabiel gedrag; marketing-waarde van "altijd nieuwste" weegt niet op tegen productie-risico.

### Latente inconsistentie (kleine opschoontaak)

`youtube_utils.py` + `main.py` gebruiken `enabled_runtimes: ['node']` + `remote_components: ['ejs:github']` als JS-runtime-optienamen in ydl_opts. `audio_utils.py` gebruikt `js_runtimes: {'node': {}}` — een andere spelling van verwante opties. Beide zijn momenteel geldig, maar de inconsistentie is een latent risico bij een toekomstige yt-dlp major die één van de varianten deprecateert. **Niet aanraken in de huidige pass** — opschonen samen met eventuele optie-2-evaluatie (taak 2.8).
