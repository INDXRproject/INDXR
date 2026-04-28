# Known Issues & TODOs

Actieve openstaande punten gevonden in de codebase. Bijgewerkt: 2026-04-28.

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

## Kritieke TODO's (blokkeren live launch)

### Stripe: Account activatie + nieuwe prijzen vereist
**Status:** Stripe account nog niet geactiveerd met KVK/bedrijfsinfo. Vereist voor live betalingen.
**Impact:** Geen live betalingen mogelijk tot activatie compleet is.
**Fix (aparte sessie):**
1. Stripe Dashboard → activeer account met KVK en bedrijfsgegevens
2. Switch naar live mode
3. Maak 5 producten aan met **nieuwe prijzen**: Starter €2.99/150cr, Basic €6.99/500cr, Plus €13.99/1200cr, Pro €27.99/2800cr, Power €54.99/6000cr (type: One-off, EUR)
4. Update `PACKAGES` in `src/app/api/stripe/checkout/route.ts` met nieuwe bedragen en credits (plan-strings 'try'→Starter, 'basic', 'plus', 'pro', 'power' blijven hetzelfde)
5. Registreer webhook endpoint: `https://indxr.ai/api/stripe/webhook`
6. Kopieer `STRIPE_WEBHOOK_SECRET` naar Vercel environment variables

**⚠️ Let op:** De pricing-pagina toont al de nieuwe prijzen (€6.99/€13.99/€27.99) maar de `PACKAGES` in `checkout/route.ts` bevat nog de oude bedragen. Deze moeten synchroon zijn vóór launch.

### Upstash Redis: Rate limiting bewust uitgeschakeld tijdens testfase
**Bestand:** `src/lib/ratelimit.ts`
**Status:** Credentials zijn ingesteld in Vercel (`UPSTASH_REDIS_REST_URL` + `_TOKEN`), maar rate limiting is bewust uitgeschakeld — app valt terug op `noopLimiter` zodat testen niet geblokkeerd worden.
**Setup:** Database `indxr-redis` aangemaakt op eigen Upstash account (Khidr), regio Frankfurt (eu-central-1).
**Activeren bij launch:** Rate limiting inschakelen in `src/lib/ratelimit.ts` en limieten opnieuw beoordelen vóór go-live.

---

## Known Limitation: Niet-Engelse captions onbetrouwbaar

**Vastgesteld:** 2026-04-23  
**Impact:** Structureel

YouTube's timedtext API geeft consistent 429 errors bij het downloaden van niet-Engelse auto-captions (getest: Arabisch, Nederlands, Russisch). Dit is een bekend en onopgelost issue in yt-dlp zelf — niet fixbaar via subtitleslangs, sleep, of retries. Daarnaast forceert YouTube `tlang=en` in de VTT URL ongeacht de subtitleslangs instelling, waardoor de originele taal niet via captions beschikbaar is.

**Wat dit betekent voor gebruikers:**
- Engelstalige videos: werkt volledig via captions ✅
- Niet-Engelse videos via captions: onbetrouwbaar — 429 errors of Engelse vertaling ipv originele taal ❌
- Niet-Engelse videos via AI transcriptie (AssemblyAI): werkt correct, geeft originele taal terug ✅

**Aanbevolen flow voor niet-Engelse content:**
AssemblyAI transcriptie is de enige betrouwbare route voor niet-Engelse videos. Dit moet duidelijk gecommuniceerd worden in de UI en marketing — caption extractie is primair voor Engelstalige content.

**Marketing implicatie:**
Dit is geen bug die gefixt wordt — het is een YouTube infrastructuur beperking. Eerlijke communicatie: INDXR ondersteunt niet-Engelse content via AI transcriptie, niet via captions.

---

## Actieve Bugs

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

### VPN blokkeert Upstash Redis TCP
Proton VPN (en mogelijk andere commerciële VPN's) blokkeren TCP-poort 6379/6380 naar Upstash. REST/HTTPS via poort 443 werkt wel (caption cache). Symptoom: TLS handshake faalt direct — `errno=104` of `Connection reset by peer`. Workaround voor lokaal testen: VPN uit. Productie (Railway) is niet geraakt.

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

### Railway restart kills in-flight jobs (gedeeltelijk opgelost)
**YouTube Whisper-jobs (ARQ):** job-rijen blijven in Supabase maar de taak wordt niet herstart bij worker-crash (`ack_late=False`). Row blijft hangen op laatste status (`downloading` of `transcribing`). Auto-recovery komt in Fase 4 (idempotency keys + `ack_late=True`).
**Upload-jobs en playlist-jobs:** draaien nog op `asyncio.create_task` in API-process — sterven bij Railway restart zonder recovery. Playlist-jobs worden gemigreerd naar ARQ in Fase 3.


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
- [x] BACKEND_API_SECRET ingesteld in Railway ✓ (401 geverifieerd); **Vercel nog te doen**
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
- [ ] Stripe account activeren (KVK/bedrijfsinfo) + 5 producten in live mode + webhook registreren
- [ ] `STRIPE_WEBHOOK_SECRET` configureren in Vercel
- [x] Supabase email verificatie re-enabled ✓
- [x] `UPSTASH_REDIS_REST_URL` + `_TOKEN` geconfigureerd in Vercel ✓ (rate limiting bewust uitgeschakeld tijdens testfase — activeren bij launch)
- [ ] Supabase database backups configureren
- [ ] `LOG_LEVEL=WARNING` instellen in Railway
- [ ] `has_ever_purchased` implementeren in Stripe webhook (zie priorities.md)
- [ ] Anonymous user flows testen via Playwright
- [ ] 4+ uur video stress test
- [ ] RAG JSON: yt-dlp originele taal forceren i.p.v. `tlang=en` vertaling
- [ ] RAG JSON: Settings chunk size ✓ feedback zichtbaarheid controleren (`DeveloperExportsCard.tsx`)
- [x] RAG JSON: "Reset export confirmation" knop in Developer Exports settings

---

## Parking Lot

Zie `wiki/roadmap/backlog.md`.

Highlights:
- Channel extractie (queue-architectuur vereist)
- Gamification: XP, levels 1–20, credit reward chests
- Branding: Scrivr, Vellum, Monkr, Quillr — niet besloten
