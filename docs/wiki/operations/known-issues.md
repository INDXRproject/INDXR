# Known Issues & TODOs

Actieve openstaande punten gevonden in de codebase. Bijgewerkt: 2026-07-03.

---

## [~] design-sync: bundle-upload naar claude.ai/design nog niet voltooid (2026-07-03)

`@indxr/shared` re-sync naar het "INDXR Component Library" project
(`43b8e30d-d44f-4943-a841-3bb6fd80df17`) draaide door tot en met verificatie
(`package-validate.mjs` exit 0), maar de upload zelf is niet uitgevoerd.

**Root cause:** de MCP-uploadtool in deze sessie accepteert alleen inline
file-content (geen local-path upload), en `_ds_bundle.js` is ~860KB —
groter dan de 256KB-cap van de `Read`-tool. Chunked reconstructie zou het risico
lopen op stille byte-corruptie in code die de design-agent uitvoert; op verzoek
van Khidr is de upload daarom gestopt vóórdat er iets onverifieerds werd
geschreven.

**Status:** lokaal is `ds-bundle/` volledig gebouwd en gevalideerd, inclusief
een nieuw `.design-sync/conventions.md` (styling-conventies voor de
design-agent) en de diff (`FeedbackCard` toegevoegd, `Toaster` verwijderd uit
de package). Het claude.ai/design-project zelf staat nog op de vorige,
werkende sync-versie — niets is corrupt of half geschreven.

**Vervolgstap:** eerstvolgende `/design-sync`-run de upload afmaken, bij
voorkeur vanuit een omgeving met local-path file-upload support. Details en
het exacte diff-overzicht staan in `.design-sync/NOTES.md`.

---

## ~~Logger inheritance: INFO logs verdwijnen onder uvicorn~~ ✅ Opgelost 2026-04-28 (definitief 2026-04-28)

**Root cause (definitief):** Root logger stond op level 30 (WARNING) ondanks
`basicConfig(level=INFO, force=True)`. Bewezen via `/api/debug/loggers` endpoint:
`{"root": {"level": 30, "effective_level": 30, ...}}`. Sentry SDK overschrijft
de root logger configuratie ná onze `basicConfig` call — de `import sentry_sdk` +
`sentry_sdk.init()` staan direct onder onze logging setup en resetten root naar
WARNING. `force=True` alleen is niet voldoende.

**Fix (compleet):** `logging.getLogger().setLevel(logging.INFO)` toegevoegd ná
`sentry_sdk.init()` in `main.py` én `worker.py`. Dit overschrijft wat Sentry
instelt en garandeert dat root op INFO blijft, ongeacht import-volgorde.

**Symptoom:** `[YT-API]`-logregels uit `youtube_utils.py` verschenen niet in
Railway logs ondanks succesvolle extracties (cascade stap 1 werkte wél —
bewezen via debug-endpoint: `{"result_type":"dict","has_transcript":true}`).

**Eerdere gedeeltelijke fix:** `force=True` toegevoegd aan `basicConfig` — loste
uvicorn handler-conflict op maar niet het Sentry-override probleem.

---

## Support-systeem

### Contactcentrum v1 — volledig live (2026-07-01, commits f924bf6 → 149896c)
Live op app.indxr.ai. End-to-end getest door Khidr op 2026-07-01.

**Geïmplementeerd:**
- Ticket indienen (SupportClient + `submit_support_ticket` RPC, rate-limit 5/uur)
- Admin-panel `/admin/tickets` — klik-op-rij opent volledige thread, Close/Reply/Credits ná de thread
  - 3-state filter: Open (oudste-eerst, wachtrij-volgorde) / Closed / All, met counts
  - Optimistic reply-update: admin ziet eigen antwoord meteen na verzenden
- User-thread-reply op open tickets via `/api/support/tickets/[id]/reply` (ownership + open-check, notifyAdmin)
- Thread-view user-kant (Support-tab `/dashboard/messages`): chronologisch ascending, sender-onderscheid (You / INDXR Support)
- E-mailmeldingen: `notifyAdmin` bij nieuw ticket/user-reply, `notifyUser` bij admin-antwoord; fail-safe (ticket opgeslagen ook zonder mail); opt-out via `profiles.email_notifications`
- Unread-indicator: accent-dot op Messages-sidebar-link + topbar Mail-icoon (`useUnreadMessages` hook: HEAD COUNT query `read=false AND sender_role!='user'`, real-time via `"indxr-messages-read"` custom event + pathname-change)
- Dashboard-preview (`/dashboard`): inbox-only, `.eq("archived", false)` — gearchiveerde berichten lekken niet door
- Read/unread: dot-indicator (geen bold-toggle), verdwijnt na openen via `markRead` / `markTicketRepliesRead`

### DNS-cleanup Namecheap (niet-urgent, aparte sessie — taak Khidr)
Verweesde Resend-DNS-records in Namecheap opruimen. **Verwijderen:**
- `_dmarc.mail`, `envelope.mail` (TXT + MX), `resend._domainkey...mail`
- Drie SES-DKIM-CNAMEs met hash-hosts (bq2sj..., luy2..., oi5c...)

**Niet aanraken:** de @/Proton-MX, de app/Vercel-CNAME, en alle `.send`-records (verified live Resend setup).

---

### Resend mail-notificatie niet actief (DNS-taak Khidr)
**Bestand:** `apps/app/src/app/api/support/submit/route.ts`  
**Status:** Mail-notificatie is geïmplementeerd en fail-safe (ticket wordt altijd opgeslagen, ook zonder mail). Twee env-vars moeten gezet worden in Vercel zodra Resend-domein live is:
- `RESEND_API_KEY` — API-sleutel van Resend
- `RESEND_FROM` — afzenderadres (bijv. `noreply@indxr.ai`), moet geverifieerd domein zijn

**Gedrag zonder vars:** mail wordt stil overgeslagen, ticket-submit slaagt gewoon.  
**Gedrag met vars:** Resend POST naar `contact@indxr.ai` met `reply_to = user.email`, subject `[INDXR Support] {category} — {subject}`.

---

### GDPR/PostHog-hardening ⚠️ launch-blocking
**Vastgesteld:** 2026-07-01

Twee openstaande punten vóór launch:

1. **Session-replay zonder field-masking** — PostHog session replay draait in productie zonder dat gevoelige velden gemaskeerd zijn. Formuliervelden (wachtwoord, betaaldata, ticket-body) zijn zichtbaar in replay-opnames. Fix: `data-ph-no-capture` attributen toevoegen aan gevoelige inputs, of PostHog `maskAllInputs: true` instellen in de initialisatie. Zie [PostHog docs: data masking](https://posthog.com/docs/session-replay/privacy).

2. **Privacy policy placeholder** — `[KHIDR: vul aan]`-placeholder in de privacy policy voor de PostHog/analytics-sectie is nog niet ingevuld. Moet beschrijven: welke data PostHog verzamelt, session replay, opt-out mechanisme. Vereist juridische review vóór launch.

**Aanbevolen volgorde:** privacy policy tekst → field masking → dan pas launch.

---

### Bewuste niet-gedane keuzes (geen bug, geen TODO)
Gedocumenteerd zodat toekomstige sessies dit niet opnieuw afwegen:

- **Support-tickets niet op Home-preview** — `/dashboard` toont alleen inbox-berichten (aankondigingen van INDXR). Tickets hebben hun eigen Support-tab in `/dashboard/messages`. Bewuste scheiding: Home = omroep, Support = dialoog.
- **Geen derde indicator op Home** — de unread-dot zit op de sidebar-link en topbar, niet op de Home-paginapreview. Home is al klikbaar naar `/dashboard/messages`; een extra indicator is redundant.
- **Geen sorteertoggle op ticket-lijsten** — admin Open-filter is altijd oudste-eerst (wachtrij). User-kant is altijd nieuwste-eerst. Sorteertoggle toevoegen is niet gevraagd en voegt complexiteit zonder noodzaak.
- **Geen realtime/WebSocket push voor de unread-dot** — de `useUnreadMessages` hook refresht op navigation en op `"indxr-messages-read"` custom event (near-real-time). Volledige WebSocket push is disproportioneel voor een support-systeem met lage berichtfrequentie. Zie ADR-008 (polling vs. WebSockets).

### Docs-drift (gerapporteerd, niet gefixt)
- **CLAUDE.md `bgutil-pot`-secties zijn stale** — bgutil is verwijderd sinds ADR-027 (yt-dlp client-rotatie); `grep "bgutil"` in `backend/` geeft 0 hits. De CLAUDE.md-blokken "bgutil-pot" en de proxy-`session_id`-Whisper-noot verwijzen naar code die niet meer bestaat. Ontdekt tijdens F18 (proxy-inventarisatie); buiten F18-scope gelaten. Idem: er is géén proxy-health-check (alleen `/health` = `{"status":"healthy"}`, geen proxy).
- ~~**Decodo-reconciliatie: API-call fout (F17-bug)**~~ ✅ **Gefixt 2026-07-17** — vier fouten hersteld in `backend/worker.py` (`fetch_service_metrics` + `_parse_decodo_traffic`): (a) auth = **rauwe** key (`Authorization: <key>`, geen `Bearer`), (b) body-veld **`proxyType: "residential_proxies"`**, (c) datums **`Y-m-d H:i:s`**, (d) parser leest dag-veld **`key`**. Live geverifieerd (worker-env): HTTP **200**, `decodo_daily_usage` gevuld (14 Jul 184,2 MB + 16 Jul 0,87 MB = **185 MB** = `metadata.totals.total_rx_tx`). **Reconciliatie [14→18 jul]: billed 185,09 MB · measured 184,93 MB · gap 164 KB (0,089%)** — measured = `transcription_jobs` 175,5 MB + `usage_logs`-captions 9,46 MB + `proxy_usage_log` 0. **F18 is compleet**: we meten ~99,9% van gefactureerd; de 164 KB is per-request wire-overhead (Decodo telt wire-bytes; yt-dlp meldt payload). Kanttekening: `proxy_usage_log` (F18-overhead-pad) bestaat pas sinds 16 jul, dus overhead-verkeer op 14–15 jul zit niet in measured — maar het gat is met 164 KB verwaarloosbaar, dus er lekte daar niets van betekenis.

---

## Kritieke TODO's (blokkeren live launch)

### Per-job kosten-capture ontbreekt — LAUNCH-BLOCKER (historische data onherstelbaar)
**Geregistreerd:** 2026-07-09 (bij ADR-052 pricing-herstructurering).
**Probleem:** de worst-case-prijsstelling (ADR-052) is verdedigd op **schatting**, niet op gemeten data. Er is geen capture-laag die de werkelijke kosten en verbruik **per job** vastlegt. Zolang die ontbreekt kunnen we marges niet verifiëren, geen echte kost/winst tonen (priorities 1.24) en achteraf niets reconstrueren — **niet-gecaptured data is permanent verloren** (geen backfill mogelijk).
**Vast te leggen per `job_id`:**
- **Proxy-bytes per job** (Decodo) — nu **niet** gepersisteerd voor de YouTube-AI-route (`transcription_jobs.file_size_bytes = 0`; download gebeurt in de worker, wél gelogd, niet opgeslagen). Dit is de grootste kostenvariabele.
- **AssemblyAI-minuten + model** — `duration_seconds` is aanwezig; model-/tarief-veld niet.
- **DeepSeek-tokens** (in/uit) per AI-samenvatting.
- **Storage-per-user** (R2-bytes) voor toekomstige storage-economics.
**Waarom blocker:** zonder dit start de launch blind op kosten; elke dag zonder capture is onherroepelijk dataverlies. Koppelt aan priorities **1.24** (admin financieel dashboard: kost-per-job + tarief-config) en ADR-052 (consequenties). **Alleen geregistreerd** — implementatie is een aparte taak.

### ~~Stripe: Account activatie + nieuwe prijzen vereist~~ ✅ Live (2026-07-10)
**Status:** Stripe live. 4 producten aangemaakt (Try €3,49/100cr, Starter €9,99/400cr, Plus €24,99/1.300cr, Power €49,99/3.100cr, [ADR-052](../decisions/052-pricing-restructure-4-tiers.md)); `pricing.ts` gesynct naar 4 tiers; webhook geregistreerd + `STRIPE_WEBHOOK_SECRET` gezet (webhook fail-closed in productie); on-demand facturen ([ADR-053](../decisions/053-on-demand-invoicing.md)); betaal→credit-keten geverifieerd. `checkout/route.ts` bouwt prijzen uit `pricing.ts`.

### Stripe: post-launch instellingen
✅ **Afgerond (2026-07-11):** afzender-e-mail → `contact@indxr.ai`; factuur-branding/logo ingesteld (Settings → Branding, logo verschijnt op de on-demand facturen).

Openstaand:
- [ ] **Bij toekomstige BV + holding-structuur**: factuur-NAW/bedrijfsgegevens herzien (juiste rechtsvorm, KVK/BTW-nummer op de factuur).

### Stripe: valuta-gedrag (geen bug — verwacht)
**Adaptive Pricing** kiest de presentment-valuta op basis van het IP van de bezoeker. In een test verscheen **GBP** — dat was een **test-IP-artefact** (VPN/exit-node), geen bug. De **EUR-optie is altijd aanwezig** op de Checkout, settlement is EUR ([ADR-052](../decisions/052-pricing-restructure-4-tiers.md)). **Geen fix nodig.** Te verifiëren vanaf een schoon NL-IP dat EUR de default presentment is.

### Upstash Redis: Rate limiting en caption cache uitgeschakeld in productie
**Bestand:** `packages/shared/src/lib/ratelimit.ts` (Next.js), `backend/main.py` (caption cache)
**Status:** `UPSTASH_REDIS_REST_URL` + `_TOKEN` verwijderd uit beide Vercel projects op 2026-05-06 (na quota-exhaustion incident, zie C.3.1 in priorities.md). Env vars ook niet gezet op Railway backend/worker. Huidige staat: `noopLimiter` actief in Next.js (alle rate limit checks retourneren `success: true`), `get_caption_redis()` retourneert `None` in Python backend (caption cache disabled).
**Setup:** Database `indxr-redis` aangemaakt op eigen Upstash account (Khidr), regio Frankfurt (eu-central-1). Nog beschikbaar voor herinschakeling.
**Activeren bij launch:** Upstash env vars opnieuw toevoegen aan Vercel (beide projecten) + Railway backend-service. Worker gebruikt nu Railway Redis (`ARQ_REDIS_URL`) — Upstash is enkel nodig voor rate limiter + caption cache (past binnen Free Tier 500K/maand zonder worker).

### ~~Railway ARQ worker — Upstash quota / Redis-splitsing~~ ✅ Worker-deel opgelost 2026-06-30
**Vastgesteld:** 2026-05-17 (worker crash) → 2026-06-04 (root cause volledig begrepen) → 2026-06-30 (Fase 2 geverifieerd voltooid)
**Status:** Worker draait ✅ — Upstash env vars nog niet hersteld ❌
**ADR:** [048-redis-split-upstash-railway.md](../decisions/048-redis-split-upstash-railway.md)

**Root cause (volledig):** ARQ worker genereert ~10.860 Redis-commando's per uur in idle toestand:
- Queue-polling: BLPOP elke 0.5s (ARQ `poll_delay` default) = 7.200 reads/uur
- Health-check: EXISTS + SET elke 1s (ARQ `health_check_interval` default) = ~3.600 commands/uur
- Totaal idle: ~7,84 miljoen commando's/maand — 15,7× het Upstash Free Tier (500K/maand)

Dit is geen bug maar inherent aan het ARQ-polling-model. Upstash (per-commando pricing) is structureel incompatibel met een constant pollende worker.

**Beslissing:** Redis-splitsing (zie ADR-048):
- ARQ worker → eigen Railway Redis-service (TCP, private netwerk `redis.railway.internal`, ~$1–3/maand)
- Vercel rate-limiter + caption-cache → blijven op Upstash Free Tier (sporadisch, past binnen quota)

**Fase 2 — VOLTOOID (datum onbekend, geverifieerd 2026-06-30):**
- Railway Redis-service aangemaakt ✅
- Worker gebruikt `ARQ_REDIS_URL` (env var naam afwijkend van plan; `WORKER_REDIS_URL` is nooit gezet — `ARQ_REDIS_URL` werkt direct voor `arq.connections.RedisSettings.from_dsn()`) ✅
- Worker gestart 2026-06-30 14:12 UTC, watchdog-cron vuurt elke 2 min, geen errors ✅

**Openstaand:** Upstash env vars (`UPSTASH_REDIS_REST_URL` + `_TOKEN`) zijn nog niet teruggezet op Vercel (beide projecten) of Railway backend-service. Rate limiting en caption cache blijven inactief.

---

## Known Limitation: Niet-Engelse captions onbetrouwbaar

**Vastgesteld:** 2026-04-23  
**Impact:** Structureel

~~YouTube's timedtext API geeft consistent 429 errors bij het downloaden van niet-Engelse auto-captions.~~ **Opgelost 2026-06-25.**

**Analyse achteraf:** De 429 was niet een fundamentele YouTube-beperking op niet-Engelse captions, maar een rate-limit specifiek op de `tlang=`-parameter (YouTube's vertaalservice). Door altijd `subtitleslangs=['en']` te vragen activeerde de cascade automatisch een vertaalcall (`lang=ar&tlang=en`). Die URL geeft 429. Originele-taal-URLs (`lang=ar`, geen `tlang`) geven consistent 200.

**Fix:** De cascade vraagt nu de brontaal van de video op via `lang_pref` (afgeleid uit YouTube Data API's `video.language`). `tlang=`-URLs worden nooit meer aangevraagd. Engels blijft de fallback als de brontaal onbekend is. Zie `backend/youtube_utils.py` en ADR-002.

**Wat dit betekent voor gebruikers:**
- Engelstalige videos: ongewijzigd ✅
- Niet-Engelse videos via captions: geeft nu originele taal terug ✅
- Niet-Engelse videos via AI transcriptie (AssemblyAI): ongewijzigd, geeft originele taal terug ✅

**Aanbevolen flow voor niet-Engelse content:**
AssemblyAI transcriptie is de enige betrouwbare route voor niet-Engelse videos. Dit moet duidelijk gecommuniceerd worden in de UI en marketing — caption extractie is primair voor Engelstalige content.

**Marketing implicatie:**
Dit is geen bug die gefixt wordt — het is een YouTube infrastructuur beperking. Eerlijke communicatie: INDXR ondersteunt niet-Engelse content via AI transcriptie, niet via captions.

---

## Actieve Bugs

### ~~AI-transcriptie master-cache write ontbrak — cache-pad functioneel dood~~ ✅ Opgelost 2026-06-26
**Vastgesteld:** 2026-06-26 (CC analyse)
**Opgelost:** 2026-06-26

`transcription_pipeline.py` importeerde `master_cache` niet en riep `master_transcripts_write` met `source_method='audio_transcription'` nergens aan. De read-kant in `run_whisper_job` was correct (taalloze lookup, quality-rank filter) maar leverde structureel een miss op omdat er nooit geschreven werd.

**Fix:** `master_transcripts_write` toegevoegd als fire-and-forget `asyncio.create_task` aan het einde van Step 8 in `do_assemblyai_transcription` (ná succesvolle Supabase INSERT). Guards: alleen YouTube-pad (`video_id is not None`) én taal bekend (`language` truthy). Bij onbekende taal wordt de write overgeslagen in plaats van een `'unknown'` waarde te forceren — `language TEXT NOT NULL` schema, schone cache boven minimale hit-rate.

**Openstaande gap (niet nu gefixed):** De playlist-Whisper-route (`process_playlist_video` / `process_playlist_retries`) checkt de master-cache **niet** vóór `do_assemblyai_transcription`. De write-fix cacht wel alle playlist-Whisper results, maar herhaalde playlist-aanvragen voor dezelfde video besparen de AssemblyAI-call nog niet.

### ~~Admin: Whisper transcript count telt nieuwere transcripts niet mee~~ ✅ Opgelost 2026-04-26
**Opgelost:** `.in("processing_method", [PROCESSING_METHODS.WHISPER_LEGACY, PROCESSING_METHODS.ASSEMBLYAI])` in `src/app/admin/page.tsx`.

### ~~`processing_method` inconsistentie in DB: frontend schrijft 'whisper_ai', backend schrijft 'assemblyai'~~ ✅ Opgelost 2026-04-26
**Opgelost:** PostHog analytics-events in VideoTab.tsx omgezet naar `PROCESSING_METHODS.ASSEMBLYAI`. `src/types/transcript.ts` uitgebreid met `'assemblyai'` in union type en `PROCESSING_METHODS` const toegevoegd.

### RAG JSON: Settings chunk size ✓ feedback onzichtbaar
**Gevonden:** 2026-04-23 (Sessie 2 test)
**Bestand:** `src/components/dashboard/settings/DeveloperExportsCard.tsx`
**Impact:** Auto-save werkt maar tester ziet geen bevestiging. Controleer of success state (`savedOption`) correct wordt gerenderd.

### Processing time teller loopt niet tijdens verwerking
Teller toont alleen eindtijd, geen real-time voortgang tijdens polling.

### ~~iOS PO token ontbreekt voor bgutil~~ ✅ Opgelost 2026-04-28
bgutil-pot volledig verwijderd via ADR-027. iOS client bypasses PO tokens — niet meer relevant.

---

## ~~Caption cache 'title' KeyError — malformed entries na cascade stap 1~~ ✅ Opgelost 2026-04-28

**Vastgesteld:** 2026-04-28  
**Opgelost:** 2026-04-28

Cache-entries weggeschreven tussen commit ff09186 en b260391 misten `title` en `video_url` (cascade stap 1 deed toen nog geen metadata-aanvulling). De cache-read code gebruikte directe bracket-access → `KeyError: 'title'` → fall-through naar yt-dlp → bot-detection.

**Fix:** Twee maatregelen:
1. **Defense-in-depth hardening** in `main.py`: na `json.loads` wordt gevalideerd op `CACHED_CAPTION_REQUIRED_KEYS`. Bij missing keys: entry wordt geëvict (`redis.delete(cache_key)`) en behandeld als cache-miss. Alle missing keys worden in één `INFO` log-regel gerapporteerd.
2. **Eenmalige flush** van alle `caption:*` keys via `backend/scripts/flush_caption_cache.py`. Gebruik: `venv/bin/python3 scripts/flush_caption_cache.py --dry-run` (preview), dan zonder `--dry-run` of met `--yes` voor directe delete.

---

## YouTube Data API quota-uitputting

**Vastgesteld:** 2026-04-28  
**Impact:** Tijdelijk — stap 1 valt terug op stap 2 (yt-dlp)

Na cascade stap 1 succes (youtube-transcript-api) haalt de backend metadata op via YouTube Data API `videos.list` (1 quota-unit per call). Default quota: 10.000 units/dag per Google Cloud project.

**Fallback-gedrag bij quota-uitputting:**
- Python logt `WARNING [YT-DATA-API quota exceeded] {video_id}: ...` of `[YT-DATA-API metadata fetch failed]` in Railway logs
- Cascade stap 1 wordt volledig weggegooid
- Stap 2 (yt-dlp) draait alsnog — stap 2 bevat metadata van nature
- Gebruiker merkt niets, extractie is alleen iets langzamer

**Monitoring-tip:** Zoek op `[YT-DATA-API quota exceeded]` in Railway logs of Sentry. Bij structurele uitputting (>5k extracties/dag): quota-verhoging aanvragen bij Google (gratis, doorlooptijd 1–6 weken). Zie ook taak 3.12 in priorities.md en [ADR-028](../decisions/028-youtube-data-api-metadata.md).

---

## Frontend Sentry server-side capture werkt niet op Vercel 🔶 Bekende beperking — niet opgelost

**Vastgesteld:** 2026-05-02  
**Herzien:** 2026-05-03  
**Status:** Bekende beperking in Next.js + Vercel + Sentry stack — geen fix beschikbaar  
**Impact:** Server-side Vercel API route errors zijn blinde vlek in Sentry; geen launch-blocker

### Symptoom

`Sentry.captureException()` in Next.js API routes op Vercel retourneert een event ID maar er arriveert geen event in Sentry `indxr-frontend`. Client-side Sentry (browser) werkt wel (sessions, replays, 98% Crash Free Sessions). Backend Python op Railway werkt ook (INDXR-BACKEND-14, 15 geverifieerd 2026-05-02).

### Root cause

Bekend probleem in de Next.js + Vercel + Sentry stack, gedocumenteerd in Sentry GitHub issue #17604 (closed-as-not-planned, label "Stale") en #15885. Reproduceerbaar met een verse `create-next-app` + Sentry wizard. De Vercel Marketplace Sentry-integratie biedt geen fix — alleen env-var setup en source map uploads.

De diagnose-keten die tot deze conclusie leidde (2026-05-02/03):
1. DSN leeg op Vercel → ingevuld, redeploy — geen effect
2. `Sentry.flush(2000)` toegevoegd — geen effect
3. `debug: true` → geen `[Sentry]` output; bleek door `disableLogger: true` in `withSentryConfig` (tree-shakt de logger uit de bundle)
4. `[INDXR-INSTRUMENTATION]` console.logs → `runtime: edge` in Vercel logs
5. `export const runtime = 'nodejs'` gedeclareerd op alle 6 routes (commit a47a15c) — geen effect
6. Sentry issue #17604 gevonden: structureel probleem, closed-not-planned

### Workaround

**Vercel function logs** zijn de primaire tool voor server-side debugging van API route errors. Vercel Dashboard → Functions → selecteer route → logs. Alle `console.error` calls in de routes zijn intact.

### Huidige staat van de code

`captureException` + `Sentry.flush(2000)` + `export const runtime = 'nodejs'` blijven in alle routes staan. Kost niets, werkt zodra Sentry/Vercel het probleem ooit oplost.

Geïnstrumenteerde routes:
- `api/extract` — `python_backend_call`, `request_parse`
- `api/stripe/webhook` — `signature_verification`, `add_credits_rpc`
- `api/ai/summarize` — `route` tag
- `api/transcribe/preflight` — `route` tag
- `api/playlist/info` — `python_backend_call`, `request_parse`
- `api/video/metadata/[videoId]` — `route`, `video_id` tag

### Toekomst

Bij een Sentry SDK major update of Vercel infrastructure change: opnieuw testen met de malformed-JSON fetch test. Lange-termijn alternatief voor volledige server-side observability: VPS/Railway migratie voor de Next.js frontend (buiten Vercel serverless).

---

## Pending deprecations

### Sentry: `disableLogger` deprecated
**Aangetroffen:** B0.8 build output (2026-05-05)  
**Bestanden:** `apps/marketing/next.config.ts`, `apps/app/next.config.ts`  
- [ ] Vervang `disableLogger: true` door `webpack.treeshake.removeDebugLogging` bij volgende Sentry SDK update. Zie [@sentry/nextjs changelog](https://github.com/getsentry/sentry-javascript).

### Next.js: `middleware` file convention deprecated
**Aangetroffen:** B0.8 build output (2026-05-05)  
**Bestanden:** `apps/marketing/src/middleware.ts`, `apps/app/src/middleware.ts`  
- [ ] Migreren naar nieuwe `proxy` convention vóór Next.js 17. Onderzoek migratiepath op [nextjs.org/docs/messages/middleware-to-proxy](https://nextjs.org/docs/messages/middleware-to-proxy) voorafgaand aan Next.js 17 upgrade.

---

## Risk monitoring

### Vercel zero-config Turborepo deployment

**Status:** Actieve configuratie (vanaf B1.1 / 2026-05-05)  
**Risico:** Vercel community-rapport (aug 2025) dat `buildCommand` genegeerd werd voor pnpm monorepos. Geen vervolg-meldingen — vermoedelijk gefixt of edge-case. We vertrouwen op Vercel's zero-config Turborepo integratie (`framework: "nextjs"` in vercel.json, rest auto-detect).

**Fallback indien Vercel deploys falen** (symptomen: "Cannot find module", TS2307 errors, ongebruikelijke build-paden):

Herstel expliciete commands in beide `apps/*/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=@indxr/<app>",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

---

## Post-launch overwegingen

### Sentry-ruis bij verwachte bot-detectie
**Status:** Goedaardig — geen actie vereist voor launch.  
Elke tijdelijk geblokkeerde video logt twee Sentry-errors (`[YT-DLP] stap 2` + `[YT-DLP-ROT] stap 3`), ook als de retry-pass de video alsnog oplost. Bij launch loopt de Sentry-inbox vol met verwacht gedrag.  
**Overweging post-launch:** bot-detectie die de retry alsnog oplost niet als `error` loggen maar lager (`warning` / `info`) tot óók de retry definitief faalt.

### Preview-credit-schatting wijkt af van werkelijke aftrek
**Status:** Goedaardig — altijd in voordeel van de user.  
De playlist-preview berekent kosten als `(totaal − 3 gratis)` vóór de library-check al-aanwezige video's eruit filtert. De user ziet daardoor een hoger bedrag dan er werkelijk wordt afgeschreven (voorbeeld: 16 getoond, 14 afgeschreven — 2 al-aanwezige paid videos overgeslagen door backend).  
**Overweging post-launch:** laat de preview de library-check meenemen vóór het bedrag wordt getoond voor een exactere schatting.

---

## Niet-kritieke TODO's

### ~~assemblyai SDK niet gepind in requirements.txt~~ ✅ Opgelost 2026-04-26
**Opgelost:** `assemblyai==0.63.0` in `backend/requirements.txt`.

### ~~extract_video_id dubbel gedefinieerd in backend/main.py~~ ✅ Opgelost 2026-04-26
**Opgelost:** Tweede definitie (regel 594) verwijderd; eerste definitie (regel 212, return type `str`) behouden.

### ~~6 ongebruikte component-bestanden in src/~~ ✅ Opgelost 2026-04-26
**Opgelost:** Alle 6 verwijderd via `git rm`.

### ~~Export-logica duplicatie (CSV, Markdown, TXT)~~ ✅ Opgelost 2026-04-26
**Opgelost:** ADR-018 Optie A geïmplementeerd — `formatTranscript.ts` is nu single source of truth. Zie [ADR-018](../decisions/018-export-consolidation.md).

### BYOK Model Selector
**Bestand:** `backend/main.py:1173` — toekomstige feature.

### INTERACTION_MAP.md ontbreekt
Alle user flows nog niet volledig gedocumenteerd.

### Admin dashboard uitbreidingen
- Processing times per tijdvenster
- Error rates per tijdvenster
- Volledige credit transaction history (nu max 20 rijen)

---

## Bekende Workarounds

### ~~bgutil-pot werkt niet op macOS~~ ✅ Opgelost 2026-04-28
bgutil-pot verwijderd (ADR-027). Geen binary meer in de codebase.

### Stripe Webhook: Signature verificatie overgeslagen lokaal
Gewenst gedrag voor lokale dev. In productie altijd `STRIPE_WEBHOOK_SECRET` instellen.

### Proxy Optioneel
`PROXY_ENABLED=false` standaard. Activeer bij YouTube IP-ban in productie.

### IPRoyal wachtwoord `I`/`l` verwarring
Hoofdletter `I` en kleine letter `l` zijn visueel identiek. Bij 407: controleer karakter-voor-karakter.

### Worker env vars: kopieer van API-service, niet uit hoofd
**Incident 2026-04-27:** PROXY_PASSWORD op worker-service was incorrect overgetypt — gaf 407 proxy auth errors bij YouTube audio download. Fix: kopieer waarden karakter-voor-karakter vanuit de API-service env vars, nooit handmatig invoeren. Bij elke nieuwe worker-deploy of nieuwe env var: vergelijk de volledige env var lijst met de API-service.

### ~~Lange audio downloads (>60 min) kunnen falen met partial-write~~ ✅ Opgelost 2026-05-01 (ADR-031)
**Symptoom was:** `ERROR: [download] Got error: N bytes read, M more expected` — Decodo residentieel IP ging offline halverwege ~150MB download. Error matchte niet op retry-keywords → faal na 1 poging.  
**Fix:** `'bytes read'`/`'more expected'` keywords toegevoegd aan retry-condition. Per retry: vers Decodo session-ID (`{base}-r{n}`) → nieuw exit-IP. Max 3 attempts, exponential backoff. Zie ADR-031.

### VPN blokkeert Upstash Redis TCP
Proton VPN (en mogelijk andere commerciële VPN's) blokkeren TCP-poort 6379/6380 naar Upstash. REST/HTTPS via poort 443 werkt wel (caption cache). Symptoom: TLS handshake faalt direct — `errno=104` of `Connection reset by peer`. Workaround voor lokaal testen: VPN uit. Productie (Railway) is niet geraakt.

### Post-launch hardening: Redis-lock voor 100% race-afdichting bij gelijktijdige AI-starts
**Vastgesteld:** 2026-06-27
**Status:** Acceptabele pre-launch beperking — post-launch hardening-optie
**Impact:** Twee browser-tabs die binnen ~50ms exact tegelijk dezelfde video starten kunnen de deduplicatie-check omzeilen (race-window tussen SELECT en INSERT). In de praktijk verhinderd door frontend button-disable state (`loading=true` na eerste submit). Financieel: credits worden pas afgetrokken ná succesvolle transcriptie (na insert). Als race optreedt: watchdog pikt de tweede stuck job op na 5 min.
**Oplossing als nodig:** Redis-lock per `(user_id, video_id)` met TTL van 5 minuten (bijv. `SET whisper:lock:{user_id}:{video_id} 1 NX EX 300`). Te implementeren in `backend/main.py` `transcribe_with_whisper` na de Supabase dedup-check. Vereist beschikbare Redis-instantie (zie ADR-048 Railway Redis-splitsing).

---

## Bekende Beperkingen

### update_playlist_video_progress RPC heeft geen user_id check
**Vastgesteld:** 2026-04-28
**Bestand:** `supabase/migrations/20260428_playlist_per_video_chain.sql`
**Impact:** Beperkt tot huidige architectuur veilig

De RPC controleert niet of `auth.uid() = playlist_extraction_jobs.user_id` voordat hij een rij update. In de huidige architectuur is dit acceptabel omdat de Python backend `service_role` gebruikt (die toch alle rechten heeft) en de frontend deze RPC niet direct aanroept.

**Wanneer fixen:** als de frontend ooit Realtime-subscriptions met schrijfrechten krijgt, of als deze RPC ooit vanuit `authenticated` rol direct aangeroepen wordt. Voeg dan toe aan het begin van de functie:

```sql
IF v_job.user_id != auth.uid() AND auth.role() != 'service_role' THEN
  RAISE EXCEPTION 'Unauthorized';
END IF;
```

---

### Geen duplicate transcript detectie
Geen `video_id + user_id` uniciteit check — credits verbruikt bij elke extractie.

### Geen automatic retry voor gefaalde playlist videos
Uitzondering: bot_detection en timeout worden na 30s eenmalig herprobeerd.

### Railway restart kills in-flight jobs (goeddeels opgelost)
**Fase 4 opgeleverd (2026-04-30):** heartbeat (`last_heartbeat_at` elke 60s), stale-detectie in poll-endpoints (300s threshold → status `interrupted`), idempotency-vlaggen (`credits_deducted` op `transcription_jobs`, `v_already_done` in RPC) zodat handmatige herstart geen dubbele credit-aftrek geeft.
**Watchdog cron live (2026-05-01):** `watchdog_interrupted_jobs` draait elke 2 minuten. Pass 1: re-enqueue jobs met `watchdog_attempts=0` die >5 min gestagneerd zijn (max 1 automatische herstart). Pass 2: auto-refund voor jobs ouder dan 24u die na herstart nog steeds geen transcript hebben — credits worden teruggeboekt en status → `error`. Migratie: `20260501_watchdog_attempts.sql`.
**Resterende gap:** ARQ `ack_late=True` bestaat niet in arq 0.28.0. De watchdog lost Gap 2 (crash na credit-deductie) op via één automatische herstart; bij definitief falen volgt auto-refund. Gap 1 (retry-pass crash na volledige playlist) is inherent niet zichtbaar voor de watchdog (status is dan al `complete`). Zie ADR-030 sectie Gap 1.


### Geen uptime monitoring
Geen externe service die alarmeert bij downtime.

---

## Pre-Launch Checklist

- [x] Credit formule updaten: `/ 600` → `/ 60`
- [x] AI summary credit-deductie: 1 → 3
- [x] Stripe PACKAGES object updaten (Try/Basic/Plus/Pro/Power)
- [x] Welcome credits RPC updaten: 5 → 25 in `claim_welcome_reward`
- [x] AudioTab: credit cost card verbergen na succesvolle transcriptie
- [x] BACKEND_API_SECRET validatie: header toegevoegd aan alle 10 Next.js→Python routes + FastAPI `verify_backend_secret` dependency
- [x] BACKEND_API_SECRET ingesteld in Railway ✓ (401 geverifieerd); Vercel `indxr-app` correct ingesteld zonder quotes ✓ 2026-05-17
- [x] verify_backend_secret: Bearer-token bypass voor directe audio uploads (browser → Railway)
- [x] Export gating: anonymous users krijgen alleen TXT; andere formaten tonen inline sign-up prompt
- [x] Export overhaul: watermarks verwijderd uit alle formats, TXT gesplitst in plain/timestamps, Markdown export toegevoegd (plain + timestamps), SRT branding bug gefixed
- [x] HTML entities gestript uit alle exports (`&nbsp;` `&amp;` etc. → plain text)
- [x] Anonieme users: toast vervangen door compacte signup banner boven transcript results
- [x] Playlist "eerste 3 gratis": backend + frontend correct geïmplementeerd (ADR-010)
- [x] Playlist retry-pass: credit-aftrek voor idx≥3 na succesvolle opslag
- [x] Sticky session ID: `job_id[:8]` doorgegeven via `extract_with_ytdlp(session_id=...)` — `indxr1` hardcoding verwijderd
- [x] VTT httpx download routeert nu via proxy (`httpx.Client(proxy=proxy_url)`) — was direct via Railway's vaste IP → 429 per video_id + IP (gedeeld door alle users)
- [x] Proxy per-video rotatie in playlist jobs: `video_session_id = f"{job_id[:4]}{idx:04d}"` — was `job_id[:8]` voor alle videos (gedeeld exit-IP per job → één geblokkeerd video blokkeerde de rest) ✓ getest 2026-04-16: 20/20 videos in 2:21, nul VTT-fouten
- [x] WelcomeCreditCard playlist sectie gecorrigeerd
- [x] AudioTab: job recovery na page refresh (sessionStorage, resume banner, elapsed timer via `created_at`)
- [x] `no_warnings`: was al `True` in `audio_utils.py` — geen fix nodig geweest
- [x] **BACKEND_API_SECRET toevoegen aan Vercel environment variables** ✓ (geverifieerd 2026-04-15: Railway→401 zonder header, Next.js→307 met correcte auth flow)
- [x] Vercel projects aangemaakt: `indxr-marketing` (15 env vars) + `indxr-app` (18 env vars, Stripe live) ✓ (B1.2/B2, 2026-05-06)
- [x] Env vars gemigreerd naar nieuwe Vercel projects ✓ — let op: Upstash URL had quotes uit .env-paste; Vercel UI vereist rauwe waarden zonder quotes
- [x] OSS-registratie bij Belastingdienst ingediend ✓ — wacht op reactie. Blocker voor Stripe live (1.13) blijft staan tot goedkeuring binnen is.
- [ ] Stripe account activeren (KVK/bedrijfsinfo) + 5 producten in live mode + webhook registreren (**URL: `https://app.indxr.ai/api/stripe/webhook`**)
- [ ] `STRIPE_WEBHOOK_SECRET` configureren in Vercel indxr-app (wacht op B5 webhook re-registratie)
- [ ] `NEXT_PUBLIC_PYTHON_BACKEND_URL` verwijderen uit Vercel dashboard — var is vervangen door `NEXT_PUBLIC_AUDIO_UPLOAD_URL`, staat nog in Vercel env vars maar niet meer in codebase (B0 cleanup 2026-05-05)
- [ ] Vercel dashboard: "Automatically skip unnecessary deployments" inschakelen per project (Project Settings → Git) — native Turborepo-integratie
- [x] B3: Custom domains transferred ✓ — indxr.ai canonical op indxr-marketing, www.indxr.ai 301 → apex, app.indxr.ai op indxr-app. Curl-verificatie ✓ (2026-05-06)
- [x] B4: A-record indxr.ai → 216.150.1.1 (Vercel IP range expansion, plan-specifieke aanbeveling). Badge verdwenen ✓ (2026-05-06)
- [x] B5: Stripe webhook live mode op app.indxr.ai/api/stripe/webhook. 3 events (checkout.session.completed, async_payment_succeeded, async_payment_failed). STRIPE_WEBHOOK_SECRET in Vercel indxr-app ✓ (2026-05-06)
- [x] B6: Smoke tests op productiedomeinen
  - [x] Cross-host redirects: `app.indxr.ai/login|signup|forgot-password` → 308 → `indxr.ai/...` ✓ curl-bewezen 2026-05-06
  - [x] Playwright smoke tests: TEST 1–7 + 12 groen (`pnpm test:smoke`) ✓ 2026-05-08 (15/16 passed, 1 skipped — admin-can-access vereist ADMIN_EMAIL account)
  - [x] TEST 8 (Google OAuth) ✓ 2026-05-17 — getClaims() fix resolved PKCE verifier bug
  - [x] TEST 9 (Signup + onboarding redirect) ✓ 2026-05-17 — router.push → window.location.href = appHref('/dashboard')
  - [x] TEST 10 (Password reset PKCE flow) ✓ 2026-05-17 — redirectTo via /auth/callback?next=<settings URL>
  - [ ] TEST 11 (Stripe checkout) — uitgesteld, Stripe tax setup pending bij Khidr
  - [ ] TEST 13 (Vercel logs inspectie) — handmatig, na deploy
  - [ ] Eerste echte betaling (Test-pakket €3,49) — uitgesteld (Stripe tax setup pending bij Khidr)
  - [ ] Stripe webhook delivery 200 verifiëren in Stripe Dashboard → Webhooks (na eerste echte betaling)
- [ ] B7: Oud `indxr` Vercel project verwijderen (al gedisconnect van GitHub)
- [x] Supabase email verificatie re-enabled ✓
- [~] **Upstash Redis quota + worker-herstel** — `UPSTASH_REDIS_REST_URL` + `_TOKEN` verwijderd uit beide Vercel projects (2026-05-06). `noopLimiter` actief: rate limiting en caption cache uitgeschakeld in productie. Strategie besloten op 2026-06-04 (zie [ADR-048](../decisions/048-redis-split-upstash-railway.md)):
  - Worker → Railway Redis (polling-kosten structureel onmogelijk op Upstash — 7,84M commands/maand idle)
  - Vercel rate-limiter + caption-cache → Upstash Free Tier herinschakelen na worker-splitsing (past ruim binnen 500K/maand zonder worker)
  - [x] **Fase 2 ✅ gereed** — Railway Redis actief (`ARQ_REDIS_URL`), worker draait. Geverifieerd 2026-06-30.
  - [ ] Upstash env vars opnieuw toevoegen aan Vercel (beide projecten) + Railway backend-service ná worker-splitsing
  - [ ] Bron van 60s ping op `indxr.ai/` identificeren (ter info, geen blocker)
- [x] **Custom SMTP provider configureren voor productie email** — ✅ Afgerond + E2E-geverifieerd 2026-07-20. Resend-SMTP gekoppeld in Supabase Auth (`smtp.resend.com`, sender `no-reply@send.indxr.ai`), auth-rate-limit op 30/u; gebrande confirm+reset-templates (`docs/email-templates/`) live in het dashboard. Bewijs: signup-confirm + password-reset kwamen aan via Resend (Resend Logs `/emails` 200), verify → onboarding, welcome-credits pas ná verificatie, reset-redirect correct. Zie roadmap 1.30. Dit is Resend-**SMTP** — los van de Resend-**API** (`RESEND_API_KEY`/`RESEND_FROM`) voor support/broadcast in `mail.ts`.
- [ ] Supabase database backups configureren
- [ ] `LOG_LEVEL=WARNING` instellen in Railway
- [ ] `has_ever_purchased` implementeren in Stripe webhook (zie priorities.md)
- [ ] Anonymous user flows testen via Playwright
- [x] **Messages page echte data + welkomstbericht + archief** — ✅ Geverifieerd door Khidr 2026-06-30. `messages` tabel + `handle_new_user_message()` trigger (exception-safe, blokkeert nooit signup). Frontend leest echte data, mark-as-read schrijft naar DB, archive/unarchive schrijven naar DB (`archived` kolom, migratie 20260630170359). Inbox/Archived tab-toggle. Alle drie acties geverifieerd: welkomstbericht aanwezig na signup, read-state persistent, archief persistent na refresh.
- [ ] **Redesign context herbevestigen voor nieuwe sessie** — eerdere Claude Design sprint (kleur-tokens, blauwe accent-knoppen, hexagon-achtergronden) zit in chat-geschiedenis maar niet samengevat in wiki. Voor volgende sessie: Khidr brengt design-context terug via chat-history of geheugen; dan integreren in priorities.md 1.20 polish + voorbereiding Fase 3 redesign.
- [ ] 4+ uur video stress test
- [x] RAG JSON: yt-dlp originele taal forceren i.p.v. `tlang=en` vertaling ✅ Opgelost 2026-06-27 via -orig track selectie (zie ai-pipeline.md)
- [ ] RAG JSON: Settings chunk size ✓ feedback zichtbaarheid controleren (`DeveloperExportsCard.tsx`)
- [x] RAG JSON: "Reset export confirmation" knop in Developer Exports settings

---

## ~~Supabase migration-sync — schema-drift + tracking-mismatch~~ ✅ Opgelost 2026-06-30

**Vastgesteld:** 2026-06-30 (sessie baseline-route)  
**Opgelost:** 2026-06-30

8-cijferige timestamp-prefixen en SQL-Editor-wijzigingen waren onzichtbaar voor de CLI-tracking (`supabase_migrations.schema_migrations` had 15 rijen voor 24 bestanden). Getriggerd door `master_transcripts.title` + `.channel` die direct via SQL Editor waren toegevoegd buiten de migration-flow.

**Fix:** Baseline-squash via Management API introspectie:
- `supabase/migrations/20260630155944_baseline.sql` — volledige DDL-snapshot productie-DB
- 24 pre-baseline bestanden → `supabase/migrations_archive/`
- `schema_migrations` tracking-tabel gereset naar 1 rij (version=`20260630155944`, name=`baseline`)
- Herstelnet: `supabase/migrations_archive/schema_migrations_backup_2026-06-30.sql`

**TODO post-launch:** Legacy tabellen droppen via nieuwe migraties:
- [ ] `DROP TABLE public.playlist_jobs;` (vervangen door `playlist_extraction_jobs`)
- [ ] `DROP TABLE public.usage_logs;` of herinschakelen (evalueer eerst of data bewaard moet worden)

---

## Decodo-proxy-COR is een ondergrens, geen volledige uitgave (ADR-065)

`cor_ai`/`cor_caption` meten proxy-bytes per **geslaagde/complete** job. De werkelijke Decodo-uitgave (PAYG **$4,00/GB**, bijgewerkt 2026-07-20 — was hier abusievelijk $3,50 vermeld; `cost_config` hield $3,25) is hoger:
- van 188 complete AI-jobs dragen er **6** proxy_bytes (capture pas sinds ADR-054/2026-07-11 → 182 pre-instrumentatie = 0);
- **27 error-jobs** verbruikten proxy maar dragen 0 bytes;
- niet-job-verkeer (bgutil PO-token-fetches, playlist `/info`, health checks, retries) wordt **niet** gemeten.

**Gevolg:** de volle Decodo-factuur als entered-OPEX invoeren telt het gemeten deel dubbel (`AddExpense` waarschuwt); alleen het **gat** (factuur − gemeten proxy-COR) hoort er eventueel in. **Fix (post-launch):** proxy-bytes ook op error/retry-paden + non-job-verkeer persisteren zodat COR de uitgave dekt; tot dan is COR-proxy expliciet een ondergrens.

---

## Parking Lot

Zie `wiki/roadmap/backlog.md`.

Highlights:
- Channel extractie (queue-architectuur vereist)
- Gamification: XP, levels 1–20, credit reward chests
- Branding: Scrivr, Vellum, Monkr, Quillr — niet besloten

---

## AI-summary model-deprecatie: gemini-2.5-flash ~2026-10-16 (ADR-068)

De AI-samenvatting draait sinds ADR-068 op `gemini-2.5-flash` via de AssemblyAI EU LLM Gateway. Google deprecieert **gemini-2.5-flash rond 2026-10-16**. **Actie vóór die datum:** het model-constant `SUMMARY_MODEL_PRIMARY` in `backend/main.py` bijwerken (bijv. naar `gemini-3.5-flash`) en het bijbehorende tarief in `cost_config.assemblyai_llm_usd_per_1m_{input,output}_tokens` meebewegen (verifieer de nieuwe prijs op de AssemblyAI-pricing-page, in-region EU = global + ~10%). Geen code-blocker nu; de Haiku-fallback (`claude-haiku-4-5-20251001`) vangt een plotselinge uitval op. Cross-ref: ADR-068.

## Sentry: server-side Vercel API-routes blijven een blinde vlek (#17604)

Zie de sectie hierboven (`Sentry.captureException()` in Vercel API-routes arriveert niet). Blijft een **bewust niet-opgelost** gat (Sentry GitHub #17604, closed-as-not-planned). De 2026-07-19 privacy-hardening raakt dit niet — die scrubt PII uit de events die wél aankomen (client + Next-server/edge + Python-backend); de Vercel-API-route-capture zelf is een aparte, upstream-beperking.
