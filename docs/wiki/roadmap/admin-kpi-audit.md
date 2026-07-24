# Admin Dashboard & KPI Audit

**Opgesteld:** 2026-07-24 · **Scope:** admin control center (`apps/app/src/app/admin/`) — Finance, Growth, Operations — + launch-readiness + **wat capturen we vs. wat willen we capturen**. Geverifieerd tegen live code, migraties en de bestaande finance-audit. **Optimalisatie is bewust buiten scope** — dit is de kaart om later verder aan te werken.

> **De één regel die er het meest toe doet:** UI kun je later bouwen over data die je bewaard hebt; **niet-gecaptureerde data is permanent verloren**. De hoogste-waarde pre-launch actie is daarom **capture-gaten dichten**, niet dashboards bouwen. Dit document eindigt met precies die lijst (§7).

---

## 1. Executive summary

| Pijler | Volwassenheid | Kernoordeel |
|---|---|---|
| **Finance** | 🟢 Volwassen | Top-down P&L, per-methode COR, recognized/deferred, VAT-per-land, bank-brug. Getal-voor-getal geaudit: **31 JA / 0 NEE** (`finance-audit.md`). Weinig te doen. |
| **Growth** | 🟡 Structuur klaar, leeg by design | Funnel (acquisitie→activatie→conversie→retentie) + LTV bestaat. Pre-launch grotendeels 0. **CAC = NULL** tot ad-spend bestaat. Mist: churn, DAU/WAU/MAU, cohort-retentie, ARPU-over-all. |
| **Operations** | 🟢 Werkt, één regressie-gat | Job-success, error-types, queue-depth, latency, watchdog. **Provider-saldi-widget is verwijderd** (ADR-068 dropte DeepSeek-poll). Geen uptime-monitoring in-house. |
| **Launch-readiness** | 🟡 Betaalketen live, randvoorwaarden open | Stripe live+getest, finance klopt. Open: uptime-alerting, anti-abuse, rate-limiting (noop in prod), DB-backups, cookie-consent, chargeback-capture. |

**Antwoord op "capturen we alles wat we willen?":** grotendeels **ja voor het geld** en **ja voor de operations**, maar met **drie echte capture-gaten** die vóór launch dicht moeten omdat ze anders onherstelbaar data verliezen:
1. ~~**Stripe disputes/chargebacks + geld-refunds** — nergens een webhook-handler~~ ✅ **Capture live (2026-07-24, Sprint 1):** `payment_reversals`-tabel + webhook-handlers (`charge.refunded`/`charge.dispute.*`). Resteert: endpoint-event-types aanzetten (Khidr) + P&L-verrekening (follow-up). §7.1.
2. **Eigen daily-active snapshot** (DAU/WAU/MAU + cohort-retentie) — DB houdt alleen `last_sign_in_at` (overschreven, geen historie); PostHog vangt het wel op (§7.2). 🟠
3. **Eigen daily-active snapshot** (DAU/WAU/MAU + cohort-retentie) — DB houdt alleen `last_sign_in_at` (overschreven, geen historie); PostHog vangt het wel op (§7.2). 🟠

> **Correctie 2026-07-24 (na review):** `has_ever_purchased` stond eerder als capture-gat — **onterecht**. Het onderscheid betaald/gratis is géén verlies-risico: elke Stripe-aankoop schrijft permanent een `credit_transactions`-rij met `stripe_session_id`, en paid/free wordt daar overal al **live** uit afgeleid (`broadcast.ts:getPaidUserIds`, admin Paid Users, growth-conversie). De kolom bestaat niet eens en niets leest hem. Een `has_ever_purchased`-vlag zou puur een gemaks-/performance-cache zijn — nuttig voor snelle client-side gating, maar altijd herafleidbaar. Verplaatst naar 🟡 (§7.3).

Alle overige "ontbrekende" KPI's zijn **wél al ergens vastgelegd** (Supabase-kolommen of de PostHog-eventstroom) en kunnen later worden geaggregeerd zonder dataverlies (§6). Dat is een UI/RPC-taak, geen capture-taak.

---

## 2. Admin-structuur (feitelijk, tegen code)

Root `apps/app/src/app/admin/`. Toegangspoort in `layout.tsx:19` (redirect naar `/dashboard` tenzij `user.email === ADMIN_EMAIL`). Nav in `AdminNav.tsx`: **Overview · Finance · Growth · Operations · Users · Transcripts · Support · Announcements**. `credits/` en `paid-users/` bestaan nog als URL-bereikbare pagina's maar zijn **uit de nav** (ADR-056, bewust).

ADR-056 (redesign naar tabs) is **volledig geïmplementeerd en klopt met de code**. Vier RPC's voeden alles: `admin_finance_summary`, `admin_geld_summary`, `admin_growth_summary`, `admin_operations_summary` — er zijn er niet meer.

Test/intern wordt overal geweerd: auto-flag trigger `flag_internal_test_account()` zet `profiles.is_internal=true` bij `@indxr-test.com` of `+test` (migratie `20260713141556`); growth/ops filteren `WHERE NOT is_internal`; finance splitst `external` vs `internal` scope met een UI-toggle.

---

## 3. Finance-tab — 🟢 volwassen

**Data:** `admin_finance_summary(from,to)` per scope + directe reads van `finance_daily_snapshot`, `opex_expenses`, `cost_config`. `force-dynamic`.

**Wat het toont** (`FinanceView.tsx`, 810 regels):
- **Hero:** Net profit (met delta vs vergelijkbaar venster), Revenue delivered (ex-VAT) + deferred obligation.
- **Income statement (top-down P&L):** Revenue → −COR (uitklapbare per-methode tabel: ai_transcription/caption/ai_summary/rag + storage, elk Cost/Credits/€-per-credit + against-revenue-vs-goodwill split + Stripe-fee recognized/deferred) → Gross profit + marge → −OPEX (entered lines, Radar, goodwill, free-caption funnel, proxy overhead, Decodo-reconciliatie) → Net profit + marge.
- **Bank-brug** "Where the cash sits": Charged → −VAT (NL/OSS/outside) → ex-VAT → −Stripe fee → Yours to keep → Settled.
- **Revenue by region** (NL/EU/Intl, net-na-VAT) + Radar-guard-indicator.
- **Deferred card:** balance, credits outstanding, −deferred fee, est. cost to deliver, est. future gross ("insufficient data" i.p.v. €0 bij stille maand).
- **Trend chart:** bevroren `finance_daily_snapshot` + live entered-OPEX overlay.

**Controls:** period-picker (This week … All time + custom + ◄►), internal/test-toggle, refresh, Settings-dialog (expenses/tariffs/deferred-mix).

**Kwaliteit:** getal-voor-getal geverifieerd tegen live data — **31 JA / 0 NEE / 0 weet-niet** (`finance-audit.md`, 2026-07-15, tarief-update 07-20). Dit is de rijpste pijler; geen bekende foute cijfers.

**Kleine gaten:**
- BTW leunt op het reconcile-veld `invoice_tax` i.p.v. Stripe `amount_tax` (checkout mist `automatic_tax` — provenance-detail, getal klopt).
- Proxy-COR is een **ondergrens** (niet alle Decodo-bytes gemeten op error/retry/non-job-paden — ADR-065/066); de reconciliatie-regel vangt het gat op zodra Decodo-data binnenkomt.

---

## 4. Growth-tab — 🟡 structuur klaar, pre-launch leeg

**Data:** `admin_growth_summary()` (migratie `20260713141556:29-96`, nooit herzien). Alleen **externe/echte** users (`WHERE NOT is_internal`). **Geen datumfilter — alles is lifetime-to-date.**

| Stage | UI-getal | Formule/bron |
|---|---|---|
| 1 Acquisition | signups + `by_source` bars | `count(profiles NOT is_internal)`; `GROUP BY COALESCE(signup_source,'direct')` |
| 2 Activation | `activation.rate` | `count(DISTINCT user_id WHERE type='debit' AND product_type IS NOT NULL) / total` — **activatie = eerste credit-uitgave** |
| 3 Monetization | `conversion` | dedup Stripe-sessies `paying / total` |
| — | LTV avg/total | `Σ amount_paid` (dedup sessie) / payers |
| 4 Retention | `repeat_rate` | `count(users HAVING ≥2 sessies) / paying` |
| Unit econ | CAC · LTV:CAC | **CAC = hardcoded NULL** tot ad-spend in `opex_expenses`; ratio client-side |

Ook berekend maar niet prominent getoond: `acquisition.by_utm` (UTM-breakdown).

**Wat groei MIST (niet berekend door de RPC):**
- **CAC** — NULL; wacht op ad-spend-invoer + attributie (input-gat, geen capture-gat).
- **Churn / dormancy** — n.v.t.-achtig voor een credit-model, maar "kocht ooit, al 90d inactief" wordt niet berekend.
- **DAU/WAU/MAU** — niet berekend; en de bron ontbreekt in-house (§7.2).
- **Cohort-retentie (D1/D7/D30)** — niet berekend.
- **ARPU over álle users** (niet alleen payers) — triviaal toe te voegen.
- **Signup→eerste-aankoop tijd**, **email-verificatie-funnel**, **onboarding-funnel** — data bestaat (§6), niet geaggregeerd.
- De RPC leest **nooit `auth.users`** activiteits-timestamps — dus geen enkele activiteits-KPI.

---

## 5. Operations-tab — 🟢 werkt, provider-saldi-gat

**Data:** `admin_operations_summary()` — laatste definitie `20260719121500_admin_operations_summary_drop_deepseek.sql`. **Alle jobs, niet economy-gefilterd** (bewust). Geen datumfilter.

| UI | Bron |
|---|---|
| Success rate | `complete/(complete+error)` op `transcription_jobs` |
| Failed / In flight / Stuck | status-buckets; in-flight = vers (heartbeat<10min of created<30min), stuck = zelfde status maar stale |
| Error-distributie (donut) | `GROUP BY error_type WHERE status='error'` — dynamisch |
| Queue depth / avg queue wait / avg processing | `count(pending,downloading)`; `avg(started−created)`; `avg(processing_time_seconds)` |
| Playlist jobs + watchdog recoveries | `playlist_extraction_jobs`; `watchdog_attempts>0` |

**Wat operations MIST:**
- **Provider-saldi** — de DeepSeek-balanswidget is **verwijderd** (ADR-068: provider-swap naar AssemblyAI; AssemblyAI heeft geen balance-API, Decodo-saldo zit in de finance-reconciliatie). Er is nu **geen** saldo-/prepaid-waarschuwing in Operations. `service_metrics` + de nachtelijke `fetch_service_metrics` ARQ-cron bestaan nog — herbruikbaar voor een AssemblyAI/Decodo-saldo als er ooit een bron is.
- **Uptime/beschikbaarheid** — 🔴 niet gemeten. Geen BetterStack/healthchecks (priorities 1.14 open). Alleen Railway-logs; geen proactieve alert bij downtime.
- **Caption-latency** — `usage_logs.duration_ms` wordt **wél** gecaptured (ADR-071) maar **niet** in Operations getoond.
- **Vercel server-side API-error-rate** — Sentry blinde vlek (#17604, bewust onopgelost).
- Geen worker-count/replica-health voorbij de heartbeat-afgeleide stuck/in-flight-split.

---

## 6. De KPI-capture-matrix (het hart van de audit)

Drie toestanden per KPI:
- ✅ **Captured + surfaced** — gemeten én in een admin-tab zichtbaar.
- 🟡 **Captured, niet surfaced** — data bestaat (kolom of PostHog-event); alleen een RPC/UI-taak. **Geen dataverlies-risico** — later te bouwen.
- 🔴 **Niet captured** — wordt nergens weggeschreven → **permanent verloren zonder instrumentatie nu**.

### Acquisitie
| KPI | Status | Bron / opmerking |
|---|---|---|
| Signups (totaal, per bron) | ✅ | `admin_growth_summary`; `profiles.signup_source` |
| UTM-breakdown | 🟡 | `by_utm` berekend, nauwelijks getoond |
| Marketing-traffic → signup-conversie | 🟡 | PostHog pageviews (retained); niet in DB/RPC |
| Anoniem tool-gebruik → signup | 🟡 | PostHog `transcript_extracted` (anon distinct_id); niet geaggregeerd |
| CAC | 🔴* | NULL tot ad-spend in `opex_expenses` — *input-gat, niet capture-gat |

### Activatie & engagement
| KPI | Status | Bron / opmerking |
|---|---|---|
| Activatie = eerste credit-uitgave | ✅ | `admin_growth_summary.activation` |
| Activatie = eerste geslaagde transcript (incl. gratis) | 🟡 | afleidbaar uit `transcripts`/`usage_logs`; niet geaggregeerd |
| Onboarding-completion | 🟡 | `profiles.onboarding_completed` (boolean, **geen timestamp/event** → timing verloren) |
| Email-verificatie-rate | 🟡 | `auth.users.email_confirmed_at` per user; niet geaggregeerd |
| DAU/WAU/MAU | 🔴 | DB heeft alleen `last_sign_in_at` (overschreven). **PostHog vangt het op**; in-house niet — zie §7.2 |
| Cohort-retentie (D1/D7/D30) | 🔴 | idem — PostHog wel, eigen DB niet |

### Monetisatie
| KPI | Status | Bron / opmerking |
|---|---|---|
| Paying users / free→paid conversie | ✅ | `admin_growth_summary` |
| Revenue (recognized/deferred) | ✅ | `admin_finance_summary` |
| LTV avg (payers) / ARPPU | ✅ | growth `ltv_avg` |
| ARPU over álle users | 🟡 | triviale add (revenue / external_total) |
| Repeat-purchase-rate | ✅ | growth `retention.repeat_rate` |
| Credit-liability (outstanding) | ✅ | finance deferred obligation |
| Time-to-first-purchase | 🟡 | afleidbaar (signup vs eerste sessie); niet berekend |
| Failed/blocked betalingen | ✅ | `payment_attempts` → finance Radar-regel |
| **Geld-refund-rate** | 🟡 | **captured (2026-07-24):** `charge.refunded` → `payment_reversals`; nog niet in dashboard/P&L — §7.1 |
| **Chargeback/dispute-rate** | 🟡 | **captured (2026-07-24):** `charge.dispute.*` → `payment_reversals`; nog niet in dashboard/P&L — §7.1 |

### Product-gebruik
| KPI | Status | Bron / opmerking |
|---|---|---|
| Volume per methode (caption/AI/playlist/RAG/summary) | 🟡 | `transcripts` + PostHog events; finance splitst COR per methode, geen usage-dashboard |
| Export-formaat-populariteit | 🟡 | PostHog `export_clicked` (9 formaten) |
| Whisper-upsell-funnel | 🟡 | PostHog `whisper_upsell_clicked`/`whisper_toggle_enabled` |
| Cache-hit-rate | 🟡 | PostHog `caption_cache_hit/miss` + `usage_logs.cache_hit`; finance toont besparing |

### Operations & betrouwbaarheid
| KPI | Status | Bron / opmerking |
|---|---|---|
| Job-success-rate, error-types, queue-depth, latency, processing-time, watchdog/retries | ✅ | `admin_operations_summary` |
| Caption-latency (`duration_ms`) | 🟡 | gecaptured (ADR-071), niet in Operations getoond |
| Uptime/beschikbaarheid | 🔴 | geen monitor (priorities 1.14) |
| Provider-saldi (Decodo/AssemblyAI/DeepSeek) | 🔴 | DeepSeek-widget verwijderd; geen bron voor de andere twee in Operations |
| Vercel server-side API-error-rate | 🔴 | Sentry blinde vlek (#17604) |

### Wat we al capturen maar in géén enkel dashboard staat
`payment_attempts` (Radar/failed) · `usage_logs` (per-caption `duration_ms`/`proxy_bytes`/`cache_hit`, **live**) · volledige PostHog-eventstroom (exports, whisper-funnel, cache-hits, audio-uploads, summary-requests) · `auth.users` (created_at/last_sign_in_at/email_confirmed_at) · `onboarding_completed` · `terms_acceptances` (consent-funnel).

---

## 7. Capture-gaten gerangschikt op permanentie-risico (dit vóór launch)

### 7.1 ✅ Stripe disputes/chargebacks + geld-refunds — CAPTURE LIVE (2026-07-24, Sprint 1)
Was: de webhook handelde alleen geslaagde/mislukte betalingen; teruggestroomd geld werd nergens vastgelegd → dispute-rate onmeetbaar, netto-revenue overschat, fraude-signaal verloren, **onherstelbaar**.
- **Gebouwd:** migratie `20260724214548` — tabel **`payment_reversals`** (refunds + disputes, `dedupe_key`-idempotent, service-role RLS) + handlers in `apps/app/src/app/api/stripe/webhook/route.ts` voor `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Join-sleutel `stripe_payment_intent_id` → `credit_transactions.metadata.payment_intent_id`. Build groen; idempotentie DB-geverifieerd (dispute `created`→`closed` = 1 rij).
- **Openstaand:** (a) **Khidr** zet de drie event-types aan op de live webhook-endpoint (Stripe Dashboard) — anders levert Stripe ze niet af. (b) **Follow-up:** de reversals verrekenen in `admin_finance_summary` (netto-revenue-correctie) + een dispute-rate-tegel in Operations/Finance. Geen dataverlies meer — dat kan later over bewaarde data.

### 7.2 🟠 Eigen daily-active snapshot (DAU/WAU/MAU + cohorten)
DB houdt alleen `last_sign_in_at` (overschreven — geen historie). **PostHog vangt de activiteit wél op**, dus dit is MEDIUM: HIGH als je activiteits-KPI's in je eigen admin/P&L wilt zonder PostHog-afhankelijkheid, LOW als PostHog-dashboards volstaan.
- **Fix (indien in-house gewenst):** nachtelijke `daily_active_users`-snapshot (goedkoop, zoals `finance_daily_snapshot` al doet) → DAU/WAU/MAU + cohort-retentie later afleidbaar. Zonder snapshot is historische activiteit in je eigen DB permanent weg.

### 7.3 🟡 `has_ever_purchased` — gemaksvlag, GEEN capture-gat (gecorrigeerd)
De kolom bestaat niet in de migraties en niets in de code leest hem; `isPaidUser`/`has_ever_purchased` = 0 hits in `apps/*/src`. Paid/free wordt vandaag **live afgeleid** uit `credit_transactions` (`type='credit'` + `metadata->>stripe_session_id`) in `broadcast.ts:getPaidUserIds`, admin Paid Users, en de growth-conversie-RPC. Omdat elke aankoop permanent een rij schrijft, is de betaald-status **altijd herafleidbaar** → **geen dataverlies**. Een `has_ever_purchased`-vlag (+ zetten in `checkout.session.completed` + backfill) is puur een **cache** voor snelle client-side gating (bijv. upsells verbergen voor payers). Nuttig, goedkoop, maar geen permanentie-risico — daarom 🟡, niet 🔴/🟠.

**Gebouwd (2026-07-24, Sprint 1):** kolom `profiles.has_ever_purchased` toegevoegd (migratie `20260724214548`), gezet door de webhook ná geslaagde `add_credits`, gebackfilld uit bestaande aankopen. Nog geen lezer in de app — bestaat als cache voor toekomstige gating; paid/free blijft intussen live-afgeleid werken.

### 7.4 🟡 Goedkope instrumentatie-verbeteringen (klein verlies, doe mee als je toch bezig bent)
- Onboarding-**timestamp** i.p.v. alleen boolean (funnel-timing).
- PostHog-event bij **welcome-credit-claim** en **onboarding-completed** (nu geen event → funnel onvolledig).
- `monitoring.md` is **stale** (mist cache/export/whisper/audio-events; claimt nog DeepSeek + email in identify) — bijwerken zodat de eventstroom gedocumenteerd is.

---

## 8. Launch-readiness — "hoe ver zijn we?"

**Live en bewezen:** Stripe live + 2 echte betalingen end-to-end (2026-07-24) · finance-keten klopt (31/0/0) · custom SMTP (Resend) · email-verificatie aan · RLS op 25 tabellen · watchdog/crash-recovery · contact-form live · messages/support-systeem live · PostHog session-replay uit + privacy-policy ingevuld (GDPR-hardening dicht 2026-07-24).

**Open vóór launch** (uit `priorities.md` + `known-issues.md`):

| Item | Prio | Status |
|---|---|---|
| **Chargeback/refund-capture** (§7.1) | 🔴 nieuw | niet gedaan |
| Uptime-monitoring / alerting (1.14) | 🔴 | niet gedaan — geen enkele outage-alert |
| Anti-abuse op welcome-credits (1.12) | 🔴 | niet gedaan — credit-farming-risico bij launch |
| Rate-limiting activeren (Upstash env vars terug) | 🟠 | `noopLimiter` in prod; caption-cache uit |
| Supabase DB-backups configureren | 🟠 | niet gedaan (Railway-SPOF-risico) |
| `has_ever_purchased` gemaksvlag (§7.3) | 🟢 | optioneel — paid/free werkt al live |
| Cookie-consent-mechanisme (1.18) | 🟠 | privacy-policy ✅, consent-UI onduidelijk |
| `LOG_LEVEL=WARNING` op Railway | 🟢 | logs lopen vol op INFO |
| Crisp support-chat (1.15) | 🟢 | niet gedaan (contact-form dekt deels) |
| `credit-coin.png` committen | 🟢 | 404 in prod (topbar/sidebar-icoon stuk) |

**Admin-schaalbaarheid (geen launch-blocker, wel bekend):**
- Overview "Total users" gecapt op **1000** (`listUsers({perPage:1000})`) — ondertelt daarboven.
- Users-**zoek** filtert alleen binnen de huidige 50-rijen-pagina, niet DB-breed.
- Paid-users laadt **alle** aankopen in geheugen vóór JS-paginering; geen `is_internal`-exclusie daar (test-aankopen tonen mee).
- Per-rij `getUserById`-fan-out op Transcripts/Credits/Paid-users/Support (N calls/pagina).

---

## 9. Aanbevolen fasering (voor later)

1. **Pre-launch, capture-first (klein, onherstelbaar-anders):** §7.1 chargeback/refund-handler + tabel (de enige echte permanent-verlies-fix) · §7.2 daily-active snapshot (alleen als in-house gewenst; PostHog dekt het anders) · §7.4 welcome-claim/onboarding events. Optioneel-goedkoop: §7.3 `has_ever_purchased`-gemaksvlag. — *Bewaart data; UI volgt later.*
2. **Pre-launch, operationeel:** uptime-monitor (1.14) · anti-abuse (1.12) · rate-limiting + DB-backups.
3. **Post-launch, surfacing (geen capture-risico):** ARPU-over-all + time-to-first-purchase in growth · email-verificatie- & onboarding-funnel · product-usage-dashboard (methode-volume, export-populariteit, whisper-funnel, cache-hit-rate) uit de bestaande PostHog-stroom · caption-latency + (indien bron) provider-saldi terug in Operations.
4. **Schaal-hygiëne (als user-aantal groeit):** admin-paginering DB-side, DB-brede zoek, paid-users server-side aggregatie.

---

## Bronnen
- Frontend-map: `apps/app/src/app/admin/**` (geverifieerd 2026-07-24).
- RPC's: `supabase/migrations/20260713141556` (growth/ops + auto-flag), `20260719121500` (ops drop-deepseek), `20260714225726`+follow-ups (finance).
- Capture: `20260711100500_profiles_acquisition.sql`, `20260713222920_usage_logs_per_caption_event.sql`, `20260715151000_payment_attempts_and_radar_rate.sql`, `20260720120000_terms_acceptances.sql`.
- Webhook-coverage: `apps/app/src/app/api/stripe/webhook/route.ts` (geen dispute/refund).
- Finance-correctheid: [`finance-audit.md`](../architecture/finance-audit.md) (31/0/0), [`finance-map.md`](../architecture/finance-map.md).
- Launch: [`priorities.md`](priorities.md), [`known-issues.md`](../operations/known-issues.md).
