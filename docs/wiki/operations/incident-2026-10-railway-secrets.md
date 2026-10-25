# Incident: Railway-beveiligingsmelding 21-10-2026 — secrets-inventarisatie + rotatieplan

**Status:** Stap 1 (inventarisatie) afgerond 2026-10-25. Stap 2 (rotatie) nog niet uitgevoerd — Khidr
maakt zelf nieuwe sleutels aan, niemand roteert vanuit deze sessie.
**Aanleiding:** Railway meldde op 2026-10-21 een beveiligingsincident waarbij omgevingsvariabelen
mogelijk zijn uitgelekt, en adviseert alle variabelen te roteren. Railway's eigen statuspagina
noemt daarnaast een gerelateerd incident 21-23 okt waarbij een batch API-keys is ingetrokken
(inclusief, vermoedelijk, de oude lokale `RAILWAY_API_TOKEN` die deze hele sessie dood bleek).
**Methode:** `railway variable list --service <naam> --json`, direct doorgepiped naar een script dat
ALLEEN de keys print — de ruwe JSON (met waarden) is op geen moment in tool-output, chat, of een
bestand beland. Geen enkele waarde is hier of elders vastgelegd.

---

## Stap 1 — Inventarisatie (namen, geen waarden)

**Railway-services:** `api` (https://indxr-production.up.railway.app) en `worker` (portloos,
ARQ-cron). Plus een door Railway beheerde `Redis`-plugin (eigen sectie onderaan).

| Variabele | Service(s) | Dienst | Echt geheim? | Staat ook in |
|---|---|---|---|---|
| `ARQ_REDIS_URL` | api, worker | Railway-Redis (intern) | Ja (bevat wachtwoord) | `backend/.env.example` |
| `ASSEMBLYAI_API_KEY` | api, worker | AssemblyAI | **Ja** | `backend/.env` (lokaal) |
| `BACKEND_API_SECRET` | **api only** | Eigen gedeeld geheim | **Ja** | `apps/marketing/.env.local.example`, `apps/app/.env.local.example` (Vercel) |
| `BETTERSTACK_HEARTBEAT_URL` | worker only | BetterStack | Ja (URL bevat token) | nergens lokaal |
| `DECODO_API_KEY` | worker only | Decodo | **Ja** | nergens lokaal |
| `DENO_PATH` | api, worker | buildtooling | Nee | — |
| `LOG_LEVEL` | api, worker | eigen config | Nee | `backend/.env` |
| `NO_CACHE` | api, worker | build/deploy-vlag | Nee | — |
| `OPENAI_API_KEY` | api, worker | OpenAI | Ja, **maar ONGEBRUIKT** (zie hieronder) | `backend/.env` (lokaal, ook ongebruikt) |
| `POSTHOG_API_KEY` | api, worker | PostHog (server-side write key) | **Ja** | `backend/.env` (lokaal) — ANDERE sleutel dan Vercel's `NEXT_PUBLIC_POSTHOG_KEY` |
| `POSTHOG_HOST` | api, worker | PostHog | Nee (URL) | `backend/.env` |
| `PROXY_ENABLED` | api, worker | Decodo | Nee (boolean) | `backend/.env` |
| `PROXY_HOST` | api, worker | Decodo | Nee (hostnaam) | `backend/.env` |
| `PROXY_PASSWORD` | api, worker | Decodo | **Ja** | `backend/.env` (lokaal) |
| `PROXY_PORT` | api, worker | Decodo | Nee | `backend/.env` |
| `PROXY_USERNAME` | api, worker | Decodo | Ja (vormt samen met password het credential) | `backend/.env` |
| `R2_ACCESS_KEY_ID` | api, worker | Cloudflare R2 | **Ja** | nergens lokaal |
| `R2_ACCOUNT_ID` | api, worker | Cloudflare R2 | Nee (identifier) | nergens lokaal |
| `R2_SECRET_ACCESS_KEY` | api, worker | Cloudflare R2 | **Ja** | nergens lokaal |
| `SENTRY_DSN_BACKEND` | api, worker | Sentry | Beperkt (DSN is write-only, Sentry classificeert 'm zelf niet als geheim) | nergens lokaal |
| `SUPABASE_SERVICE_KEY` | api, worker | Supabase | **Ja** — legacy fallback-naam, zie onder | `backend/.env` (lokaal, beide namen tegelijk) |
| `SUPABASE_SERVICE_ROLE_KEY` | api, worker | Supabase | **Ja — HOOGSTE RISICO** (omzeilt RLS volledig) | `backend/.env`, `apps/app/.env.local(.example)`, root `.env.local` |
| `SUPABASE_URL` | api, worker | Supabase | Nee | `backend/.env`, overal |
| `UPSTASH_REDIS_REST_TOKEN` | **api only** | Upstash | **Ja** | `backend/.env`, beide Vercel-apps (`.env.local.example`) |
| `UPSTASH_REDIS_REST_URL` | **api only** | Upstash | Nee (URL) | `backend/.env`, beide Vercel-apps |
| `UPSTASH_REDIS_URL` | api only | Upstash | Ja, **maar ONGEBRUIKT** (zie hieronder) | nergens lokaal |
| `WHISPER_MODEL` | api, worker | eigen config | Nee | `backend/.env` |
| `YOUTUBE_API_KEY` | api, worker | Google/YouTube Data API | **Ja** | `backend/.env` (lokaal) |

**`RAILWAY_*`-variabelen** (`DOCKERFILE_PATH`, `ENVIRONMENT`, `ENVIRONMENT_ID`, `ENVIRONMENT_NAME`,
`PRIVATE_DOMAIN`, `PROJECT_ID`, `PROJECT_NAME`, `PUBLIC_DOMAIN`, `SERVICE_API_URL`, `SERVICE_ID`,
`SERVICE_NAME`, `STATIC_URL`) staan op beide services — dit is platform-metadata die Railway zelf
injecteert, geen providersleutel, niet roteerbaar en niet nodig om te roteren.

**Niet aanwezig op geen van beide services (bevestigt het eerdere H11-rapport):**
`RESEND_API_KEY` en `RESEND_FROM` ontbreken volledig, op zowel `api` als `worker`. Dit verklaart
waarom de balie-bevestigingsmail stil faalt (`backend/mailer.py` logt een warning, crasht niet).
**Vermoedelijke verklaring, niet het beveiligingsincident:** `mailer.py` is pas deze sessie
gebouwd (Onderdeel B, 2026-10-25) — niemand heeft deze twee variabelen ooit op Railway gezet, ze
zijn dus nooit "uitgelekt", ze bestonden gewoon nog niet. Los van de rotatieronde moet iemand ze
alsnog toevoegen voor de mail-functie werkt.

### Redis-plugin (door Railway beheerd, aparte sectie)
`REDISHOST`, `REDISPASSWORD`, `REDISPORT`, `REDISUSER`, `REDIS_PASSWORD`, `REDIS_PUBLIC_URL`,
`REDIS_URL` — automatisch geprovisioned door Railway's eigen Redis-add-on. Dit zijn geen
providersleutels die je bij een externe dienst aanmaakt; rotatie hiervan loopt via Railway's eigen
"Reset password"-knop op de database-service, niet via een derde partij.

### Kanttekening bij deze inventarisatie
Dit is de levende lijst van VARIABELENAMEN op Railway, gecontroleerd tegen de code. "Staat ook in"
voor Vercel is gebaseerd op de `.env.local.example`-bestanden in de repo (gedocumenteerde intentie),
niet op een live Vercel-API-call — ik heb geen Vercel-toegang in deze sessie. Voor de daadwerkelijke
Vercel-waarden (bestaan ze, zijn ze hetzelfde) moet Khidr zelf het Vercel-dashboard controleren.

### Bijvangst — operationele bug gevonden tijdens deze inventarisatie (NIET gefixt, zoals gevraagd)
`worker.py` (`watchdog_stuck_quick_quotes`, toegevoegd in de H2-herstelronde 2026-10-25) stuurt bij
het opnieuw dispatchen van een vastgelopen offerte de header `X-Backend-Secret` met de waarde van
`os.getenv("BACKEND_API_SECRET", "")` — maar `BACKEND_API_SECRET` staat **niet** in de
variabelenlijst van de `worker`-service (alleen bij `api`). De header wordt dus altijd leeg
verstuurd, en `api`'s `verify_backend_secret` wijst een leeg/niet-matchend secret af (401) zodra
`BACKEND_API_SECRET` op `api` wél gezet is. **Gevolg: de watchdog-pass voor vastgelopen
balie-offertes kan op dit moment nooit slagen.** Dit is puur geconstateerd, niet aangepakt — wil je
dat ik dit apart fix (`BACKEND_API_SECRET` toevoegen aan `worker`, of de aanroep anders beveiligen),
zeg het en dan pak ik het als eigen taak op.

---

## Stap 2 — Rotatieplan, op volgorde van risico

**Regel voor elke sleutel:** Khidr maakt de nieuwe sleutel zelf aan bij de provider. Daarna:
1. Nieuwe waarde zetten in Railway (`railway variable set NAAM=... --service <svc>` — triggert
   automatisch een herdeploy van die service, tenzij `--skip-deploys`) en, waar van toepassing, in
   Vercel (project settings → environment variables, beide apps waar nodig).
2. Beide services (api + worker) herdeployen als de sleutel op beide staat — een gedeeld geheim
   dat maar op één service wordt bijgewerkt laat de andere met de oude waarde draaien.
3. Pas de OUDE sleutel bij de provider intrekken **nadat** de nieuwe waarde overal live is bevestigd
   (health-check / een echte test-aanroep) — nooit intrekken vóórdat de nieuwe waarde bevestigd werkt,
   anders val je tussen twee stoelen (oude ingetrokken, nieuwe nog niet actief).

### Groep 1 — geld of datatoegang (eerst, hoogste risico)

| # | Sleutel | Nieuwe sleutel aanmaken bij | Bijwerken in | Herdeploy | Oude intrekken |
|---|---|---|---|---|---|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` (+ legacy `SUPABASE_SERVICE_KEY` als die nog apart gebruikt wordt — zie Stap 1-noot: code valt terug op deze naam) | Supabase Dashboard → Project Settings → API → "Reset" op de service_role-sleutel | Railway `api`+`worker`; Vercel `apps/app` (`SUPABASE_SERVICE_ROLE_KEY`); lokale `.env`/`.env.local`-bestanden (niet commiten) | api, worker | Supabase roteert deze sleutel atomisch bij reset — er is geen aparte "oude sleutel intrekken"-stap, de reset IS de rotatie. Doe dit buiten piekuren: elke actieve Railway-request met de oude sleutel faalt vanaf het moment van reset. |
| 2 | `ASSEMBLYAI_API_KEY` | AssemblyAI Dashboard → API Keys → nieuwe key aanmaken | Railway `api`+`worker` | api, worker | Oude key intrekken bij AssemblyAI nadat een test-transcriptie met de nieuwe key is gelukt |
| 3 | `DECODO_API_KEY` + `PROXY_USERNAME`/`PROXY_PASSWORD` | Decodo-dashboard → credentials/API-token regenereren | Railway `worker` (DECODO_API_KEY), `api`+`worker` (PROXY_*) | api, worker | Oude Decodo-credential intrekken nadat een echte YouTube-download via de proxy is gelukt |
| 4 | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | **Niet op Railway** — deze staan alleen op Vercel (`apps/app`), niet in de Railway-lijst hierboven. Rotatie via Stripe Dashboard → Developers → API keys / Webhooks. Toch hier genoemd omdat het een geld-sleutel is die bij dezelfde ronde hoort. | Vercel `apps/app` | Vercel `apps/app` herdeploy | Oude Stripe-sleutel pas intrekken nadat één test-checkout + webhook-delivery met de nieuwe sleutel is bevestigd — **dit is de meest risicovolle stap van de hele ronde**: een webhook-secret-mismatch tijdens de overgang laat betalingen zonder credit-toekenning (zie Onderdeel A, dit groeiplan) |
| 5 | `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` | Cloudflare Dashboard → R2 → Manage API tokens → nieuw token | Railway `api`+`worker` | api, worker | Oud token intrekken nadat een test-upload (snelle balie) + afronding is gelukt |

### Groep 2 — overig (na groep 1)

| # | Sleutel | Nieuwe sleutel aanmaken bij | Bijwerken in | Herdeploy | Oude intrekken |
|---|---|---|---|---|---|
| 6 | `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → database → regenereren | Railway `api`; Vercel beide apps | api | Nadat rate-limiting + caption-cache zichtbaar werkt met de nieuwe token |
| 7 | `YOUTUBE_API_KEY` | Google Cloud Console → Credentials → nieuwe API-key (YouTube Data API v3) | Railway `api`+`worker` | api, worker | Na een test-metadata-call |
| 8 | `POSTHOG_API_KEY` (server-side) | PostHog → Project Settings → API Keys | Railway `api`+`worker` | api, worker | Na bevestiging dat server-side events nog aankomen (let op: dit is NIET dezelfde sleutel als Vercel's `NEXT_PUBLIC_POSTHOG_KEY`, die hoeft hier niet mee) |
| 9 | `BACKEND_API_SECRET` | Zelf een nieuwe willekeurige string genereren (geen provider) | Railway `api` (en zie de bijvangst-bug hierboven — overweeg deze meteen ook aan `worker` toe te voegen); Vercel beide apps | api (+ worker als toegevoegd) | Pas de oude waarde "intrekken" (= uit Vercel/Railway verwijderen) nadat alle drie/vier plekken de nieuwe waarde hebben — dit is een gedeeld geheim zonder provider-kant, dus er is geen externe revoke-stap, alleen "overal tegelijk bijwerken" |
| 10 | `BETTERSTACK_HEARTBEAT_URL` | BetterStack → Heartbeats → URL regenereren (indien die optie bestaat) of nieuwe heartbeat-monitor aanmaken | Railway `worker` | worker | Laag risico (alleen monitoring, geen geld/data) — kan achteraan |
| 11 | `SENTRY_DSN_BACKEND` | Sentry → Project Settings → Client Keys (DSN) — meestal niet "roteerbaar" in de klassieke zin, wel een nieuw project/key aanmaken indien gewenst | Railway `api`+`worker` | api, worker | Laagste risico — DSN is write-only, geen leesrechten |

### Niet roteren / apart besluit
- **`OPENAI_API_KEY`** — ongebruikt in de code (geen `import openai`, niet in `requirements.txt`).
  Advies: **intrekken, niet vervangen** — minder aanvalsoppervlak, geen functionaliteit verliest iets.
- **`UPSTASH_REDIS_URL`** (alleen op `api`) — ongebruikt in de code (alleen de REST-variant wordt
  gelezen). Advies: **verwijderen**, niet roteren.
- **Redis-plugin-wachtwoorden** (`REDISPASSWORD` e.a.) — roteren via Railway's eigen
  database-reset-knop, niet via een externe provider-stap.

---

## Checklist-volgorde (samengevat)

1. Supabase service-role-key (Groep 1.1) — hoogste risico, eerst.
2. AssemblyAI, Decodo, Stripe, R2 (Groep 1.2-1.5) — geld/dataroutes.
3. Upstash, YouTube, PostHog, BACKEND_API_SECRET, BetterStack, Sentry-DSN (Groep 2).
4. Opruimen: OPENAI_API_KEY en UPSTASH_REDIS_URL intrekken (ongebruikt).
5. Los van deze ronde: RESEND_API_KEY/RESEND_FROM alsnog toevoegen (nooit bestaan, geen rotatie).
6. Los van deze ronde (bijvangst): BACKEND_API_SECRET-gat in de nieuwe watchdog-pass (worker.py)
   — apart te fixen als Khidr akkoord geeft.
