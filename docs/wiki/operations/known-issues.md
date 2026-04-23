# Known Issues & TODOs

Actieve openstaande punten gevonden in de codebase. Bijgewerkt: 2026-04-15.

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

## Actieve Bugs

### ~~RAG JSON: yt-dlp pakt `tlang=en` vertaling i.p.v. originele captions~~ ✅ Gefixed 2026-04-23
`subtitleslangs: ['.*orig']` — yt-dlp pakt nu altijd de originele videotaal.

### RAG JSON: Settings chunk size ✓ feedback onzichtbaar
**Gevonden:** 2026-04-23 (Sessie 2 test)
**Bestand:** `src/components/dashboard/settings/DeveloperExportsCard.tsx`
**Impact:** Auto-save werkt maar tester ziet geen bevestiging. Controleer of success state (`savedOption`) correct wordt gerenderd.

### 429 rate limit op niet-Engelse VTT endpoints
**Gevonden:** 2026-04-23 — `youtu.be/4XkFY9IsACk` (Russisch)
**Impact:** Video consistent gefaald met 429 op VTT download, ook na session_id proxy fix. Onduidelijk of video-specifiek of structureel voor niet-Engelse captions.

### Processing time teller loopt niet tijdens verwerking
Teller toont alleen eindtijd, geen real-time voortgang tijdens polling.

### iOS PO token ontbreekt voor bgutil
**Status:** Tech debt — zie priorities.md (PRE-LAUNCH).
**Fix:** iOS PO token ondersteuning in bgutil-pot toevoegen als fallback.

---

## Niet-kritieke TODO's

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

### bgutil-pot werkt niet op macOS
Linux x86_64 binary. Workaround: test in Linux Docker container.

### Stripe Webhook: Signature verificatie overgeslagen lokaal
Gewenst gedrag voor lokale dev. In productie altijd `STRIPE_WEBHOOK_SECRET` instellen.

### Proxy Optioneel
`PROXY_ENABLED=false` standaard. Activeer bij YouTube IP-ban in productie.

### IPRoyal wachtwoord `I`/`l` verwarring
Hoofdletter `I` en kleine letter `l` zijn visueel identiek. Bij 407: controleer karakter-voor-karakter.

---

## Bekende Beperkingen

### Geen duplicate transcript detectie
Geen `video_id + user_id` uniciteit check — credits verbruikt bij elke extractie.

### Geen automatic retry voor gefaalde playlist videos
Uitzondering: bot_detection en timeout worden na 30s eenmalig herprobeerd.

### Railway restart kills background tasks
Job-rijen blijven in Supabase maar achtergrondtaak sterft. Geen auto-recovery.

### Geen Sentry / error tracking
Alleen zichtbaar in Railway logs.

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
- RAG-geoptimaliseerde JSON export
- Branding: Scrivr, Vellum, Monkr, Quillr — niet besloten
