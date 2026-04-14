# Known Issues & TODOs

Actieve openstaande punten gevonden in de codebase. Bijgewerkt: 2026-04-14.

---

## Kritieke TODO's (blokkeren live launch)

### Stripe: Account activatie vereist
**Status:** Stripe account nog niet geactiveerd met KVK/bedrijfsinfo. Vereist voor live betalingen.
**Impact:** Geen live betalingen mogelijk tot activatie compleet is.
**Fix (aparte sessie):**
1. Stripe Dashboard → activeer account met KVK en bedrijfsgegevens
2. Switch naar live mode
3. Maak 5 producten aan: Try €2.49, Basic €5.99, Plus €11.99, Pro €24.99, Power €49.99 (type: One-off, EUR)
4. Registreer webhook endpoint: `https://indxr.ai/api/stripe/webhook`
5. Kopieer `STRIPE_WEBHOOK_SECRET` naar Vercel environment variables

**Code is al klaar** — `PACKAGES` object in `checkout/route.ts` is bijgewerkt.

### Supabase: Email verificatie uitgeschakeld
**Status:** Uitgeschakeld tijdens development.
**Fix:** Supabase Dashboard → Auth → Email Templates → re-enable email confirmation.

### Upstash Redis: Rate limiting uitgeschakeld
**Bestand:** `src/lib/ratelimit.ts`
**Status:** App valt terug op `noopLimiter`. Anoniem limiet moet 10/dag zijn.
**Fix:** `UPSTASH_REDIS_REST_URL` + `_TOKEN` configureren in Vercel.

---

## Actieve Bugs

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
- [x] Playlist "eerste 3 gratis": backend + frontend correct geïmplementeerd (ADR-010)
- [x] Playlist retry-pass: credit-aftrek voor idx≥3 na succesvolle opslag
- [x] Sticky session ID: `job_id[:8]` doorgegeven via `extract_with_ytdlp(session_id=...)` — `indxr1` hardcoding verwijderd
- [x] WelcomeCreditCard playlist sectie gecorrigeerd
- [x] AudioTab: job recovery na page refresh (sessionStorage, resume banner, elapsed timer via `created_at`)
- [x] `no_warnings`: was al `True` in `audio_utils.py` — geen fix nodig geweest
- [ ] **BACKEND_API_SECRET toevoegen aan Vercel environment variables**
- [ ] Stripe account activeren (KVK/bedrijfsinfo) + 5 producten in live mode + webhook registreren
- [ ] `STRIPE_WEBHOOK_SECRET` configureren in Vercel
- [ ] Supabase email verificatie re-enablen
- [ ] `UPSTASH_REDIS_REST_URL` + `_TOKEN` configureren in Vercel (activeert rate limiting)
- [ ] Supabase database backups configureren
- [ ] `LOG_LEVEL=WARNING` instellen in Railway
- [ ] `has_ever_purchased` implementeren in Stripe webhook (zie priorities.md)
- [ ] Anonymous user flows testen via Playwright
- [ ] 4+ uur video stress test

---

## Parking Lot

Zie `wiki/roadmap/backlog.md`.

Highlights:
- Channel extractie (queue-architectuur vereist)
- Gamification: XP, levels 1–20, credit reward chests
- RAG-geoptimaliseerde JSON export
- Markdown export
- Branding: Scrivr, Vellum, Monkr, Quillr — niet besloten
