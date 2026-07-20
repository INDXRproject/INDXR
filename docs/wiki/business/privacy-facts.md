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

*Diagnose-deel hierboven = de pre-fix staat (READ-ONLY). Onderstaande addendum = de doorgevoerde fix.*

---

## Addendum 2026-07-18 — fixes doorgevoerd (Fase B)

De twee gaten zijn gedicht; het product klopt nu met de voorgenomen belofte.

### PostHog → EU + cookieless (zie ADR-023 addendum)
- `persistence: 'memory'` (cookieless — **live geverifieerd**: 0 cookies/localStorage/sessionStorage), `api_host` → EU via env, `disable_session_recording: true`, e-mail uit `identify()`, `$ip` genulld via `before_send` (**live geverifieerd**: IP `203.0.113.5` → `null`), server-side `disableGeoip: true`.
- **Belofte "cookieless analytics, EU-hosted, geen tracking over sessies" = nu waar** (EU-host afhankelijk van de env-var die Khidr op EU zet + US-instance opzegt).

### Account-delete → alles wat identificeert is weg (migratie `20260718173000_privacy_delete_cleanup`)
- **BEFORE DELETE-trigger op `auth.users`** nult `usage_logs.ip_address` vóór de user weg is (vangt élk delete-pad, ook een toekomstig self-service pad).
- **`payment_attempts`** kreeg een echte `ON DELETE CASCADE`-FK → rijen mét user_id verdwijnen (rauwe Stripe-payload + billing_country).
- **Bewijs (wegwerp-user):** na delete → `usage_logs`-rij blijft maar `ip_address` NULL + `user_id` NULL; `payment_attempts` weg; `profiles`/`auth.users` weg; `master_transcripts` onaangeroerd (755→755). PII-anti-join = 0 herleidbare velden.
- **Belofte "we delete everything that identifies you; anonymized statistics may remain" = nu waar.**

### Correctie op A3 (R2) t.o.v. de diagnose hierboven
- Er zijn **geen per-user R2-objecten**. De per-user `transcripts`-rij bewaart alle content **in Postgres** (`transcript`/`edited_content`/`ai_summary`/`rag_exports` jsonb) → CASCADE-verwijderd. R2 bevat alléén de **gedeelde, video-gekeyede master-cache** (`transcripts/{video_id}__{lang}__{model}.json`, bucket `indxr-transcripts`, geen `user_id`/PII). **R2-purge bij delete is dus niet nodig** — er staat niets persoonlijks. Audio komt **nooit in R2** (lokale temp-file, `os.unlink`/`os.remove` na de job; geen 24u-lifecycle want niet gepersisteerd).

### Bewust behouden (de "geanonimiseerde statistiek die mag blijven" — voor het beleid)
- **`usage_logs`-rijen** ná scrub: `user_id` NULL + `ip_address` NULL, alleen gedrags-metadata (video_id, type, credits, timestamp).
- **`master_transcripts`** (video-gekeyed, geen PII) + de bevroren **`finance_daily_snapshot`** (geaggregeerd, geen per-user PII).

### Subverwerkers voor het privacy-beleid (1.18)
- **PostHog (EU)** — product-analytics, nu cookieless/IP-loos/geen replay.
- **Sentry** — error tracking; **kan IP's en (bij replay) DOM bevatten** → moet in de subverwerkers-alinea.
- Stripe (betaling), Supabase (EU, auth+DB), Cloudflare R2 (transcript-cache), AssemblyAI (audio-transcriptie **én** AI-samenvatting via de EU LLM Gateway `gemini-2.5-flash` — EU-resident, DPA/SCC, ADR-068), Decodo (proxy), Railway/Vercel (hosting). **DeepSeek is verwijderd** (China, geen DPA/SCC — was onrechtmatig voor EU-persoonsgegevens).
- **Crisp** is (nog) niet in de code aanwezig → **niet noemen** tot het er is.

---

## Addendum 2026-07-19 — Sentry PII/replay-scrubbing + backend-telemetrie EU (privacy-hardening)

**Sentry blijft fouten vangen, zonder PII** (scrubben, geen uitschakelen). Geverifieerd: een testfout behoudt de exception (message/stacktrace), alle PII eruit.
- **Client (beide apps):** `sendDefaultPii: false`, `beforeSend: scrubSentryEvent` (verwijdert user-e-mail/IP/username, cookies, auth/token/secret-headers, request-body). **Session Replay UIT** voor launch: `replaysSessionSampleRate: 0` + `replaysOnErrorSampleRate: 0` + `replayIntegration()` verwijderd → geen replay-payload (kan gevoelige scherminhoud vastleggen; later evt. terug mét volledige masking).
- **Server + edge (Next.js, beide apps):** `sendDefaultPii: false` + dezelfde `beforeSend`-scrub.
- **Backend (Python `sentry_sdk`, `main.py` + `worker.py`):** `send_default_pii=False` + `before_send=sentry_scrub` (`backend/sentry_scrub.py`) — verwijdert user-e-mail/IP, cookies, auth-headers en de request-body. Geverifieerd: exception behouden, PII weg.
- Gedeelde scrubber: `packages/shared/src/lib/sentry-scrub.ts` (client/server/edge) + `backend/sentry_scrub.py` (Python).

**Backend-PostHog EU-hardening** (was hardgecodeerd `app.posthog.com` = US, negeerde de env die Khidr net op EU zette): nu `posthog.host = os.getenv("POSTHOG_HOST", "https://eu.i.posthog.com")` (expliciete EU-fallback — lege env valt nooit stil naar de SDK-US-default) + `posthog.disable_geoip = True` (geen IP/geo) in alle drie de init-plekken (`main.py`, `worker.py`, `transcription_pipeline.py`). Geen e-mail/PII in capture. Geverifieerd op de echte Railway-config: host = `eu.i.posthog.com`, `disable_geoip = True`. Mirrort de client-side EU-fix.

**Subverwerker-status voor het beleid:**
- **BAA niet nodig** (dat is HIPAA — n.v.t. voor een YouTube-transcript-SaaS zonder gezondheidsgegevens). De AVG-grondslag is EU-residency + DPA/SCC's van de subverwerkers.
- **ZDR** (AssemblyAI LLM Gateway) blijft **uitgesteld** — vereist een uitgevoerde overeenkomst + niet-publiek-gedocumenteerde header; EU-residency + DPA dragen de rechtmatigheid (ADR-068).
- **Beslissing:** het privacy-beleid noemt **onze eigen bewaartermijnen** (wat wij bewaren/verwijderen); partner-specifieke details (welke subverwerker wat hoe lang bewaart) blijven **intern** (subverwerkerslijst hierboven) i.p.v. in het publieke beleid — houdt het beleid leesbaar en onderhoudbaar zonder per-partner-drift.

**Sluit de Sentry-PII/replay-control** waar de LIA (Legitimate Interest Assessment) op leunt. *(Let op: dit is niet roadmap-item 1.31 — dat is Sentry noise-filtering; zie priorities.md.)*

---

## Addendum 2026-07-20 — Privacy Policy v3 gepubliceerd op `/privacy`

De volledige v3-beleidstekst staat live op `apps/marketing/src/app/privacy/page.tsx` (was een `[KHIDR]`-stub met genummerde lege secties). **Last updated: 2026-07-20.** Layout ongewijzigd overgenomen van de bestaande stub (`container … max-w-2xl`, `prose-content`-secties, `<Footer/>`); geen nieuwe styling. Footer linkte `/privacy` al (`packages/shared/src/components/Footer.tsx`) → geen wijziging.

- **Controller:** Tiny Web Ventures, **KvK 98828762**, Nederland. *(KvK-nummer kwam uit de aangeleverde v3-tekst — het staat **nergens in de codebase** (grep op `kvk`/nummer/`tiny web`/company-constants = 0 hits), dus niet onafhankelijk uit code geverifieerd.)*
- **Kern-claims** (consistent met de addenda hierboven): cookieless/IP-loze EU-analytics + Do-Not-Track; transcripts nooit gelezen/verkocht/getraind; AssemblyAI EU voor transcriptie **én** AI-samenvatting, audio niet voor training; self-service account-delete; audio nooit opgeslagen; transcript-cache los van persoon; betaalrecords 7 jaar (NL fiscaal); SCC's voor niet-EU-subverwerkers; contact `privacy@indxr.ai`.

---

## Addendum 2026-07-20 — Terms of Service v1 gepubliceerd op `/terms`

Volledige ToS-tekst live op `apps/marketing/src/app/terms/page.tsx` (was `[KHIDR]`-stub met lege genummerde secties). **Last updated: 2026-07-20.** Layout identiek aan `/privacy` (`container … max-w-2xl`, `prose-content`-secties, `<Footer/>`, accent-`mailto`-links naar `support@indxr.ai`); geen nieuwe styling. Footer linkte `/terms` al → geen wijziging. 14 secties (Who we are → Contact). §14-adres was in de aangeleverde tekst al ingevuld (Oranjeplein 9, 3331XM Zwijndrecht) — geen open placeholders. **Openstaand (priorities.md, pre-launch legal):** §7 (herroepingsverlies) vereist een checkout-consent-checkbox om waterdicht te zijn; ingelogde app-users hebben nog geen route naar `/terms`/`/privacy`/`/docs`.
