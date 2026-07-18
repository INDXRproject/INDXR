# Privacy-feiten — geverifieerd vóór het schrijven van het privacy-beleid

**Datum:** 2026-07-18 · **Type:** READ-ONLY diagnose (geen code gewijzigd) · **Doel:** het privacy-beleid (etappe B) baseren op wat wáár is, niet op aanname.
**Bronnen:** live code (`apps/`, `packages/`) + live DB (`pg_constraint`, project `uivlvwcplcaixkzuiwsv`, eu-west-1), 2026-07-18.

> Twee onderzochte claims. Per claim: het feit, en of de voorgenomen beleidszin klopt.

---

## 1. PostHog — draait het, is het cookieless, wat slaat het op

**Draait het?** Ja, bekabeld. `PostHogProvider` staat in beide root-layouts (`apps/marketing/src/app/layout.tsx`, `apps/app/src/app/layout.tsx`) én server-side in de Stripe-webhook (`posthog-node`). Config: host **`https://us.i.posthog.com` (US-regio)**, project `298689`, key aanwezig (lokaal `.env.local`; prod-Vercel niet vanaf hier te zien). Admin-UI linkt naar `app.posthog.com/.../persons/${user.id}` → persons bestaan. *Kanttekening:* event-**ingestion** is niet vanaf hier te bevestigen (geen PostHog-API-toegang); de bekabeling + persoonprofielen wijzen sterk op live.

**Cookieless?** **NEE.** `posthog.init()` in `packages/shared/src/providers/PostHogProvider.tsx` zet **geen `persistence`-optie** → posthog-js default = **`localStorage+cookie`**. Er wordt dus een persistente `distinct_id` op het apparaat gezet (cookie + localStorage). Default `cross_subdomain_cookie` → cookie gedeeld over `*.indxr.ai` (marketing + app). Voor écht cookieless zou `persistence: 'memory'` nodig zijn — dat staat er niet.

**Wat slaat het op / herkenning over sessies:**
- **Anoniem (uitgelogd):** `person_profiles: 'identified_only'` → geen server-side *person profile* voor anon, MAAR wel een persistente anon-`distinct_id` op het apparaat → dezelfde bezoeker is over sessies herkenbaar op dat apparaat.
- **Ingelogd:** `posthog.identify(session.user.id, { email, source, created_at })` (`packages/shared/src/contexts/AuthContext.tsx:129`) → persistent persoonprofiel op Supabase-`user_id`, **mét e-mailadres**. Dus: over sessies gevolgd, en **PII (e-mail) staat in PostHog (US)**.
- **autocapture:** default AAN (niet uitgezet) → klikken/interacties auto-gecaptured. `capture_pageview: false` + geen PageView-component → **pageviews worden vermoedelijk NIET gecaptured** (het "half-geconfigureerd"-symptoom), maar custom events (`transcript_extracted`, `export_clicked`, `credits_purchased`, `summary_requested`, `audio_upload_started`, `whisper_*`) + autocapture vuren wél.

**Tweede tracker (GA4/gtag/GTM)?** **Geen.** Geen `gtag(`, geen `googletagmanager`, geen GA-script in de code. (Eerdere brede grep-hits waren false positives.)

### Verdict op de voorgenomen zin "cookieless analytics, don't track across sessions or sites"
**Klopt niet zoals nu geconfigureerd.** Cookieless = nee (cookie + localStorage). Cross-session = ja (persistente distinct_id + e-mail-`identify`). "Across sites" (third-party) is niet letterlijk waar, maar **cross-subdomain** wél. Extra: **US-dataoverdracht** wringt met de "EU-hosted"-vertrouwensclaim op de homepage. → Óf de config aanpassen (`persistence:'memory'`, identify heroverwegen, EU-host), óf de belofte afzwakken naar wat waar is.

---

## 2. Account-delete — wat blijft er echt achter

**Mechanisme:** **alleen admin-side** (`apps/app/src/app/api/admin/delete-user/route.ts` → `admin.auth.admin.deleteUser`). **Geen self-serve "verwijder mijn account"** in de app. De route deletet expliciet `transcripts/collections/credit_transactions/user_credits/profiles` (redundant — die cascaden toch al) en roept dan `deleteUser` aan → cascade vuurt. → Beleid moet zeggen "neem contact op om te verwijderen", niet "klik hier".

**FK-gedrag naar `auth.users` (live `pg_constraint`, geverifieerd):**

| Gedrag | Tabellen | Effect bij delete |
|---|---|---|
| **CASCADE** (volledig verwijderd) | `profiles` (incl. **email**, `stripe_customer_id`), `user_credits`, **`credit_transactions`**, `transcripts`, `transcription_jobs`, `playlist_jobs`, `playlist_extraction_jobs`, `collections`, `saved_videos`, `messages`, `support_tickets`, `ai_summary_usage_log`, `daily_library_bytes` + alle `auth.*` | Rij weg |
| **SET NULL** | **`usage_logs`** | Rij **blijft**, `user_id → NULL` |
| **Geen FK** | **`payment_attempts`** | Niet gecascade, niet genulld — rij blijft ongemoeid (nu **0 rijen**) |

**Betalende user specifiek:** `credit_transactions` = **CASCADE → verwijderd**. Live finance-herberekening verliest die user-rijen. De nachtelijke `finance_daily_snapshot` is bevroren/gematerialiseerd → historische totalen overleven, maar de **per-user ledger is weg**.

**Blijft er geanonimiseerde data achter — en is die écht niet te koppelen?**
- **`usage_logs` (SET NULL):** `user_id` wordt NULL, MAAR de rij behoudt **`ip_address` (inet)** + `video_id` + `created_at` + `credits_used` + `had_paid_at_time` + `is_internal_at_time` + `proxy_bytes` + `source`. → **NIET volledig geanonimiseerd:** een IP-adres is persoonsgegeven onder de AVG (herleidbaar). Er draait **nergens** IP-scrubbing/anonimisatie (geverifieerd: geen anonymize/scrub-code).
- **`payment_attempts` (geen FK):** structureel behoudt het `raw` (jsonb — rauwe Stripe-payload, mogelijk naam/e-mail/adres), `billing_address_country`, `stripe_charge_id`/`payment_intent_id`, en `user_id` (indien ooit gezet). Nu **0 rijen**; logt geblokkeerde/gescreende pogingen (ADR-062), vaak pre-auth dus `user_id` meestal NULL. Niet gekoppeld aan de cascade.
- **`master_transcripts` (cache):** blijft, maar **video-gekeyed** (`video_id/title/channel/r2_key/quality`) — **geen `user_id`, geen persoonsgegeven**. Gaat over de publieke video, niet de persoon → verdedigbaar als niet-persoonlijk.
- **R2-residu:** de delete-route purge't geen R2-blobs; de `transcripts`-rijen gaan weg maar de R2-objecten + `master_transcripts.r2_key` blijven. (Audio wordt bij job-complete gepurged — aparte flow.) Secundair.

### Verdict op de voorgenomen zin "we delete everything that identifies you; some anonymized statistics may remain but can't be linked to you"
- **Eerste helft grotendeels WAAR:** e-mail/profiel/ledger/transcripts/tickets cascaden allemaal weg. Caveats: alleen admin kan het triggeren (geen self-serve), en R2-blobs kunnen blijven hangen.
- **Tweede helft NIET accuraat zoals nu:** `usage_logs` bewaart **`ip_address`** (identifier) en `payment_attempts` heeft geen cascade (kan rauwe Stripe-payload bewaren). "Can't be linked to you" is dus **overclaim**. Om de zin waar te maken: `ip_address` nullen/scrubben bij delete + `payment_attempts` cascaden/scrubben.

---

*Geen fixes uitgevoerd — dit is de feitenbasis voor etappe B (beleid schrijven).*
