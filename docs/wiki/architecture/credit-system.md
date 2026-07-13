# Credit Systeem

## Overzicht

Credits zijn de interne valuta van INDXR.AI. Gebruikers kopen credits via Stripe en gebruiken ze voor betaalde features. Caption-extractie voor enkelvoudige video's is altijd gratis.

**Het systeem in twee zinnen:**
> "Captions zijn gratis. Playlists, AI-transcriptie en samenvattingen kosten credits — 1 credit per playlist-video, 1 credit per minuut AI-transcriptie, 3 credits per samenvatting."

---

## Credit kosten per actie

| Actie | Kosten | Eenheid |
|-------|--------|---------|
| Enkelvoudige video auto-captions | **Gratis** | — |
| Playlist auto-captions (eerste 3 video's) | **Gratis** | Per extractie |
| Playlist auto-captions (overige video's) | **1 credit** | Per video |
| AI-transcriptie (YouTube, geen captions) | **1 credit** | Per minuut (afgerond naar boven) |
| AI-transcriptie (audio upload) | **1 credit** | Per minuut (afgerond naar boven) |
| AI samenvatting (DeepSeek) | **3 credits** | Flat per samenvatting |
| RAG JSON export (eerste export) | **1 credit per 15 min** | `ceil(duration_s / 900)`, min 1 |
| RAG JSON export (re-download) | **Gratis** | Altijd gratis na eerste betaalde export |
| Bulk RAG JSON export (nieuwe transcripts) | **1 credit per 15 min** | Per niet-eerder-geëxporteerd transcript |
| Bulk RAG JSON export (al geëxporteerde transcripts) | **Gratis** | Re-download-pad ook in bulk |
| Welcome bonus (eenmalig bij registratie) | **+25 credits** | — |

**Geen dubbele rekening bij AI-transcriptie in playlists:** Als een playlist-video geen captions heeft, betaalt de gebruiker alleen het AI-transcriptie tarief (1 cr/min) — niet bovenop de 1 credit/video voor captions. Zie [ADR-010](../decisions/010-playlist-pricing.md).

---

## Credit formule (AI-transcriptie)

```python
# backend/credit_manager.py
credits = math.ceil(duration_seconds / 60.0)
minimum = 1
```

| Video duur | Credits |
|-----------|---------|
| 0–1 min | 1 |
| 5 min | 5 |
| 12 min | 12 |
| 30 min | 30 |
| 1 uur | 60 |
| 2 uur | 120 |

**Versiehistorie:** Het oude model (vóór 2026-04-14) gebruikte `duration_seconds / 600` (1 credit = 10 minuten). Zie [ADR-009](../decisions/009-credit-granularity.md) voor de rationale van de switch.

---

## Credit pakketten (Stripe)

| Tier | Prijs (incl. BTW) | Credits | Bruto €/cr | Netto €/cr (÷1,21) |
|------|-------------------|---------|-----------|--------------------|
| **Test** | €3,49 | 100 | €0,03490 | €0,02884 |
| **Starter** | €9,99 | 400 | €0,02498 | €0,02064 |
| **Plus** ★ | €24,99 | 1.300 | €0,01922 | €0,01589 |
| **Power** | €49,99 | 3.100 | €0,01613 | €0,01333 |

★ = anker ("Meest populair") in UI

**Credits verlopen nooit.** Eenmalige aankoop, geen abonnement. Prijzen BTW-inclusief; netto omzet = prijs ÷ 1,21.

Zie [ADR-052](../decisions/052-pricing-restructure-4-tiers.md) voor de rationale (supersedet ADR-012) en [pricing.md](../business/pricing.md) voor de volledige marge-matrix.

---

## Wat je kunt doen per pakket

| Pakket | Playlist-video's | AI-transcriptie | Audio uploads | AI samenvattingen |
|--------|----------------|----------------|---------------|------------------|
| Try (200) | 200 video's | 3,3 uur | 3,3 uur | 66 |
| Basic (500) | 500 video's | 8,3 uur | 8,3 uur | 166 |
| Plus (1.100) | 1.100 video's | 18,3 uur | 18,3 uur | 366 |
| Pro (2.600) | 2.600 video's | 43,3 uur | 43,3 uur | 866 |
| Power (5.500) | 5.500 video's | 91,7 uur | 91,7 uur | 1.833 |

---

## Volledige Credit Flow

### Aankoop (Stripe)

```
1. Gebruiker selecteert pakket op /pricing of /dashboard/billing
2. Frontend: POST /api/stripe/checkout met {plan: 'try' | 'starter' | 'plus' | 'power'}
3. Next.js checkout route:
   a. Verifieert auth + suspension check
   b. getOrCreateStripeCustomer → één Customer per user (profiles.stripe_customer_id)
   c. Maakt Stripe Checkout Session aan met server-side price_data, customer,
      customer_update (address/name auto) en tax_id_collection (B2B BTW-nummer)
   d. Slaat {userId, credits} op in session.metadata
   e. Returns {url: checkout_url}
4. Gebruiker betaalt op Stripe-pagina
5. Stripe stuurt POST /api/stripe/webhook
6. Webhook handler:
   a. Verifieert Stripe-signature (STRIPE_WEBHOOK_SECRET) — in productie fail-closed
      (leeg secret → request geweigerd; geen ongeverifieerde body-parse)
   b. Event type: checkout.session.completed
   c. Extraheert userId + credits uit session.metadata
   d. Roept add_credits RPC aan (metadata: stripe_session_id, amount_paid, currency)
   e. Tracks 'credits_purchased' event in PostHog
7. Credits direct beschikbaar in gebruikersaccount
```

**Beveiligingsaspect:** De prijs is server-side vastgelegd in `PACKAGES` (`pricing.ts` → `checkout/route.ts`). De client stuurt alleen de pakket-naam — nooit de prijs.

### Factuur (on-demand)

Aankopen krijgen **geen** automatische factuur. Op de account-pagina (`/dashboard/account`, betaalhistorie) kan de gebruiker per aankoop een BTW-factuur opvragen (`POST /api/stripe/invoice`): Stripe Customer → Invoice (`automatic_tax`) → InvoiceItem (`tax_behavior: 'inclusive'`, `tax_code txcd_10000000`) → `finalizeInvoice` → `pay(paid_out_of_band)`. Inclusive houdt het totaal exact gelijk aan het betaalde brutobedrag met een correcte BTW-regel; de factuur-metadata koppelt aan de originele betaling (`original_payment_intent`). URL wordt gecachet in `credit_transactions.metadata.invoice_url` (geen dubbele aanmaak). Zie [ADR-053](../decisions/053-on-demand-invoicing.md).

---

### Verbruik (AI-transcriptie)

```
1. Gebruiker vraagt AI-transcriptie aan
2. Python backend: check_user_balance(user_id)
   → supabase.rpc('get_user_credits', {'p_user_id': user_id})
3. Berekening: math.ceil(duration_seconds / 60.0), min 1
4. Voldoende credits? → deduct_credits_atomic()
   → PostgreSQL row-level lock voorkomt race conditions
5. Transcriptie uitgevoerd
6. Bij fout: add_credits(user_id, amount, "Refund: ...")
```

### Verbruik (RAG JSON export — per transcript)

```
1. Gebruiker klikt "RAG JSON" in de TranscriptViewer export-dropdown
2. Als rag_exports.length > 0 (al eerder geëxporteerd):
   → Gratis re-download, geen Server Action aanroepen
3. Als rag_exports.length === 0 (eerste export):
   a. Modal toont kosten: Math.max(1, ceil(duration_seconds / 900))
   b. Bevestiging door gebruiker
   c. deductRagExportCreditsAction() (Server Action, packages/shared/src/actions/rag-export.ts)
   d. RPC: deduct_credits_atomic(user_id, cost, 'RAG JSON Export')
   e. Log entry in transcripts.rag_exports JSONB: {chunk_size, exported_at, credits_spent}
4. buildRagJson() genereert JSON client-side (geen AI-generatie, puur format-conversie)
5. Browser-download
```

**Guard-lagen:** Render-guard in `dashboard/library/[id]/page.tsx` + component-level fallback in `RagExportView.tsx` zorgen dat de re-download-view nooit zichtbaar is zonder eerdere betaalde export.

### Verbruik (RAG JSON export — bulk)

```
1. Gebruiker selecteert meerdere transcripts in Library, kiest "RAG JSON ✦" in bulk-dropdown
2. Preview-fetch: id, title, duration, rag_exports per transcript (lichtgewicht)
3. Bereken per transcript:
   - rag_exports.length > 0 → cost = 0 (gratis re-download)
   - rag_exports.length === 0 → cost = Math.max(1, ceil(duration_s / 900))
4. Bevestigingsdialoog toont:
   - Per transcript: gratis of X credits
   - Totaal: "N new · Y credits · M already exported, free"
   - Beschikbaar saldo (indien onvoldoende: knop geblokkeerd, melding)
5. Op bevestiging:
   a. bulkDeductRagExportCreditsAction() (packages/shared/src/actions/rag-export.ts)
   b. Één deduct_credits_atomic RPC voor het TOTAAL van alle nieuwe exports
      → Atomisch: óf alles wordt afgetrokken, óf niets (geen partial charge)
   c. Per transcript log entry in rag_exports JSONB (best-effort na aftrek)
6. Fetch volledige transcript-content, genereer ZIP met _rag_60s.json per transcript
7. Browser-download ZIP
```

**Chunk-grootte bulk:** altijd 60s (balanced). Per-transcript keuze alleen in de viewer.
**Onvoldoende saldo:** client-side blokkering (credits < totalCost) + server-side via RPC.

### Verbruik (AI samenvatting)

```
1. Backend: check_user_balance(user_id) — ≥3 credits?
2. deduct_credits_atomic(user_id, 3, "AI Summarization")
3. DeepSeek V3 verwerkt transcript
4. Bij ELKE fout: add_credits(user_id, 3, "Refund: ...")
```

### Verbruik (Playlist)

Geïmplementeerd conform ADR-010. Zie `backend/worker.py` → `process_playlist_video()` en `process_playlist_retries()`. (`run_playlist_job` verwijderd in Fase 3b.2, 2026-04-28.)

```
1. Eerste 3 video's (idx < 3), captions: 0 credits (gratis)
2. Eerste 3 video's (idx < 3), Whisper: math.ceil(duration_seconds / 60.0) credits
   → Whisper op idx 0-2 is NIET gratis — alleen captions zijn gratis
3. Vanaf video 4 (idx >= 3), captions: 1 credit per video
4. Vanaf video 4 (idx >= 3), Whisper: math.ceil(duration_seconds / 60.0) credits
5. Geen dubbele rekening: Whisper-pad vervangt caption-krediet (nooit opgeteld)
6. De retry-pass (na bot_detection/timeout) deducts ook correct: orig_idx bepaalt tier
```

De frontend (`PlaylistAvailabilitySummary.tsx`) spiegelt deze logica:
- `freeVideoIds` bevat alleen de eerste 3 video's met `has_captions` (niet Whisper)
- `captionCredits` = aantal caption-video's op idx ≥ 3
- `whisperCredits` = som van `ceil(duration/60)` voor alle Whisper-video's
- `totalExtractionCredits` = `captionCredits + whisperCredits`

### Welcome Reward

```
1. Gebruiker registreert → onboarding
2. updateProfileAction (onboarding-voltooiing) roept claim_welcome_reward RPC aan
3. RPC-guards (atomisch, FOR UPDATE-lock):
   a. welcome_reward_claimed (per-account boolean) → 1× per account
   b. Canoniek-e-mail-dedup → 1× per CANONIEK adres (zie hieronder)
4. +25 credits + welkomstbericht (alleen als beide guards doorlaten)
```

**Anti-abuse: canoniek-e-mail-dedup (migratie `20260712220428_welcome_reward_canonical_email_dedup`).**
Zonder deze laag kon één Gmail-user via `naam+test1@`, `naam+test2@`, `na.am@` … oneindig "nieuwe"
accounts maken (Gmail negeert alles na `+` en negeert puntjes) → oneindig 25 gratis credits
(~€0,60 echte kost elk). Feitelijk aangetoond: `contact+test1@indxr.ai` kreeg een volwaardige
eigen grant naast `contact@indxr.ai`.

`claim_welcome_reward` normaliseert nu het e-mailadres via `normalize_email(text)` — strip `+tag`,
en voor `gmail.com`/`googlemail.com` de puntjes uit het local-part (+ domein-canonicalisatie) — en
verleent de welkomst-grant **max één keer per canoniek adres**. Aliassen van een reeds-beloond adres
worden geweigerd (`{"success":false,"error":"Welcome reward already claimed for this email"}`), maar
het account blijft geldig: inloggen + gratis captions werken, alleen de eenmalige grant wordt
gededupt. `pg_advisory_xact_lock` op het canonieke adres maakt concurrent grants race-veilig.
Bewust op **grant-niveau** (niet signup-block): breekt geen bestaande accounts en geen legitieme
`+addressing`-gebruikers. Geverifieerd (rolled-back DB-test): fresh signup → 25 cr ✓; `+alias` → 0 cr,
0 welcome-txns, profiel als claimed gemarkeerd ✓.

**Eerlijke, geaccepteerde grens:** normalisatie stopt de `+`/puntjes-truc, **niet** tien écht
verschillende mailadressen. Dat is inherent aan een gratis-instapmodel zonder betaalmuur. Een
zwaardere laag (device-fingerprint / betaalmethode-vereiste, ADR-024) is bewust **niet** nu gebouwd
→ [backlog](../roadmap/backlog.md). Zie ook [auth-and-security.md](auth-and-security.md).

---

## Atomic Deduction (PostgreSQL)

De `deduct_credits_atomic` RPC:
1. Lock de `user_credits`-rij van de gebruiker (`SELECT ... FOR UPDATE`)
2. Controleer of `user_credits.credits >= p_amount`
3. Ja → decrement `user_credits.credits` + INSERT in `credit_transactions` (beide in dezelfde transactie), return `{success: true, previous_balance, new_balance}`
4. Nee → return `{success: false, error: "Insufficient credits"}`

Dit is atomisch — parallelle requests kunnen credits niet dubbel verbruiken.

---

## Playlist Caption Deductie via RPC (Fase 4)

Sinds Fase 4 wordt credit-aftrek voor playlist caption-videos atomisch uitgevoerd in de `update_playlist_video_progress` RPC, in dezelfde transactie als de `video_results` JSONB-update. Dit voorkomt dubbele aftrek bij worker-restarts (`ack_late`-equivalent).

De RPC accepteert `p_amount` (default `0` voor gratis video's) en `p_reason`. Bij `p_status='success'` en `NOT v_already_done`:
- `UPDATE user_credits SET credits = credits - p_amount`
- `INSERT INTO credit_transactions (...)`

Beide in dezelfde transactie. **Idempotent** via de `v_already_done`-check op `video_results` JSONB: als de video al met dezelfde status geregistreerd is, worden credits niet opnieuw afgetrokken.

Whisper-pad gebruikt nog steeds `deduct_credits_atomic`, met idempotency via de `credits_deducted` vlag op `transcription_jobs` (M1, Fase 4).

---

## Paid User Status

**⚠️ Gedeeltelijk geïmplementeerd.** De `isPremium`-check in API routes werkt via `total_credits_purchased > 0` (uit de `get_user_credits` RPC). Een apart `has_ever_purchased` veld in `profiles` en een `isPaidUser` boolean in AuthContext bestaan **nog niet** in de code.

Huidig gedrag:
- Premium = gebruiker heeft ooit een positieve credit-transactie gehad (gecheckt ad-hoc per API route)
- Bij saldo 0 zonder ooit gekochte credits: geen premium rate-limit bypass
- Rate limiting bypass: `total_credits_purchased > 0` per verzoek

Wat de bedoeling is (nog te implementeren):
- Permanente paid user status, ook bij saldo 0
- `has_ever_purchased = true` in `profiles` na eerste Stripe-aankoop
- `isPaidUser: boolean` in AuthContext

Welcome credits (25 gratis) geven GEEN paid user status.

Zie [ADR-013](../decisions/013-welcome-credits-freemium.md).

---

## Database Schema (credits)

**`user_credits` tabel (balance):**
```sql
user_id    UUID        PRIMARY KEY REFERENCES auth.users(id)
credits    INTEGER     NOT NULL DEFAULT 0
updated_at TIMESTAMPTZ DEFAULT now()
```

**`credit_transactions` tabel (audit-log):**
```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID        REFERENCES auth.users(id)
amount      INTEGER     NOT NULL  -- positief = toevoeging, negatief = aftrek
type        TEXT        NOT NULL DEFAULT 'debit'  -- 'debit' | 'credit'
reason      TEXT        NOT NULL  -- "Purchased 200 Credits", "AI Summarization", etc.
metadata    JSONB       -- {stripe_session_id, amount_paid, transcript_id, etc.}
created_at  TIMESTAMPTZ DEFAULT now()
```

**Werking:** `user_credits.credits` is de canonieke balance. `credit_transactions` is de audit-log van alle mutaties. Beide worden atomisch bijgewerkt door RPC's (`deduct_credits_atomic`, `add_credits`, en sinds Fase 4 ook `update_playlist_video_progress` voor playlist-caption-deductie).

**Beschikbare RPC's:**
- `get_user_credits(p_user_id)` → `{credits, playlist_quota_used, playlist_quota_remaining, quota_resets_at}`
- `deduct_credits_atomic(p_user_id, p_amount, p_reason, p_metadata)` → `{success, error, previous_balance, new_balance}`
- `add_credits(p_user_id, p_amount, p_reason)` → resultaat
- `claim_welcome_reward(p_user_id)` → idempotent welkomst-bonus (25 credits)

---

## Frontend State

Credits bijgehouden in `AuthContext` (`src/contexts/AuthContext.tsx`):
```typescript
interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  credits: number | null       // huidig saldo
  quota: UserCredits | null    // {credits, playlistQuotaUsed, playlistQuotaRemaining, quotaResetsAt}
  loading: boolean
  refreshCredits: () => Promise<void>
}
```

**Let op:** `isPaidUser` bestaat **niet** in AuthContext. De `isPremium`-check in API routes haalt `total_credits_purchased` direct op via RPC.

`refreshCredits()` aanroepen na succesvolle aankoop of verbruik om de UI bij te werken. **Sinds ADR-050 fase 3 ook bij job-START** (`VideoTab`/`AudioTab`/`PlaylistTab`, direct na `setActiveJobId`) — de reservering is server-side al gecommit vóór `job_id` terugkomt, dus zonder deze aanroep loopt de topbar-balans achter (hij toonde 114 terwijl de backend al naar 53 gereserveerd had). Er is géén polling/realtime op `user_credits`; refresh is puur deze handmatige aanroepen.

---

## Credit Transaction History

Momenteel zichtbaar: laatste 20 transacties onder Account > Billing & Credits.

**Openstaande vraag:** Gebruikers willen volledige historiek. Overwegingen:
- Supabase storage per transactie is verwaarloosbaar (~100 bytes/rij)
- Bij 10.000 gebruikers × 100 transacties = 1M rijen → nog steeds verwaarloosbaar
- Implementeer hogere/onbeperkte cut-off als post-launch verbetering
- Integreer ook in admin dashboard (processing times + transacties per tijdvenster)

---

## Completion Receipt / reserve-transparantie (ADR-050 fase 3)

Eén herbruikbaar, read-only receipt-component toont ná afloop van elke job eerlijk wat er gebeurde. Principe: **stilte bij succes, uitleg bij afwijking**.

- **Component:** `packages/shared/src/components/ui/CompletionReceipt.tsx` (variant-gedreven, gemodelleerd op `FeedbackCard`). Ingebouwd in de drie completion-oppervlakken: `VideoTab`, `AudioTab` (vervangen de oude banners) en `PlaylistManager` (embedded bovenaan de Final Summary View).
- **Data-hook:** `packages/shared/src/hooks/useCompletionReceipt.ts` — **read-only**, muteert nooit credits. Leest onder RLS: de job/playlist-rij (`credits_reserved/credits_refunded/credits_cost`, `video_results`, `video_metadata`) + `credit_transactions`. De vier cijfers (reserved → used → refunded → net) komen uit de **gestructureerde `metadata` van de refund-rij** (`{reserved, consumed, refunded, applied, failed_count, total}`); de reason-string wordt NOOIT geparsed. Per-video (playlist): settlement-rijen (`metadata.video_id` → `amount`) ⋈ `video_results` (status/error_type). charged = settlement-amount; success zonder settlement = free; error = skipped (niet afgerekend).
- **States:** A = schone job (één regel, alleen wat betaald is); B = refund aanwezig (reserved→used→refunded + uitklapbare per-video-lijst, "not used — refunded"); C = alléén upload-overschatting (`kind='upload' && reserved > used`, ffprobe-fallback) → geruststellings-strook. Een playlist met mislukte video's is B (normale transparantie), **geen** C.
- **Playlist-retries (collection-scoped aggregatie):** een per-video retry én "Retry all" draaien als APARTE playlist-jobs met een eigen `playlist_id` maar dezelfde `collection_id`. Een job-scoped read van de eerste run zou bevriezen op zijn snapshot ("2 skipped — 30 refunded") en de retry-settlements nooit zien. Daarom aggregeert de playlist-tak van de hook over `collection_id`: alle jobs in de collectie worden gemerged (per video wint success van error) en settlements/refunds gesommeerd → het receipt toont de echte eindstaat ná retries (bv. 12 transcribed / 0 skipped / net-verbruik). De verrekening zelf blijft correct (reserve==settle per job, refund uitgesteld tot ná de retry-pass) — dit is puur weergave. Een `refreshToken`-param her-fetcht wanneer een retry voltooit (het anker-id verandert niet). Zonder `collection_id` valt de hook terug op job-scoped.
- Zie ADR-050 en [[reserve-bedrag-realistisch-vóór-de-gate-betekenis-heeft]] (LESSONS).

## Concurrency cap (max 3 gelijktijdige jobs)

Een user mag maximaal **3** gelijktijdige jobs draaien. De cap is financieel-kritiek geplaatst: **vóór elke credit-reservering**, zodat een geweigerde job nooit al credits vastzet.

- **Backend (`main.py`):** `_count_active_jobs(supabase, user_id)` telt niet-terminale, verse jobs over `transcription_jobs` (`pending/downloading/transcribing/saving`) + `playlist_extraction_jobs` (`running/retry_pending`), met de dedup-versheidsfilter (`created_at` <30m OF `last_heartbeat_at` <10m) zodat zombie/stale jobs niet meetellen. `interrupted` is een watchdog-herstelstaat → bewust NIET geteld. De check draait in `/api/transcribe/whisper` (ná dedup, vóór job-insert + `reserve_credits`) en in `/api/playlist/extract` (vóór job-insert + reserve). Bij `count >= 3` → **HTTP 429** `{code: "too_many_jobs"}`; de Next.js-routes forwarden status + `error` door. Geldt ook voor retry / Retry-all (zelfde endpoint).
- **Frontend (`ActiveJobsIndicator`):** toont het werkelijke aantal via dezelfde filter, geteld met de browser-Supabase-client onder RLS (twee count-queries). Vervangt de oude sessionStorage-teller die twee gelijktijdige same-type jobs als "1" telde. **Houd de statuslijsten in sync met `_count_active_jobs`** (zie LESSONS: active-job filter).

---

## GELD-blok / money-model (admin, etappe 1) — ADR-055

Het admin-dashboard toont een volledige P&L-keten uit één auditeerbare RPC. Interne/test-accounts worden uit **élk** cijfer gefilterd.

- **`product_type`-stempel** (`credit_transactions.product_type`): leaf-types `ai_transcription / ai_summary / rag / caption` die credits consumeren. **`playlist` is GEEN leaf** — een playlist is een composiet (`playlist_id IS NOT NULL`) over caption + ai_transcription. Gestempeld zonder RPC-signature-wijziging: `settle_credits`→`'ai_transcription'`, `update_playlist_video_progress`→`'caption'`, `deduct_credits_atomic`→`p_metadata->>'product_type'` (caller: summary='ai_summary', legacy AssemblyAI='ai_transcription', RAG='rag'). Historische rijen eenmalig gebackfilld via reason-mapping; reserveringen/refunds bewust NULL.
- **`profiles.is_internal`**: interne/test-accounts, uitgesloten van alle geldcijfers. Uitbreidbaar via `UPDATE profiles SET is_internal=true WHERE id=…`.
- **Revenue = purchased-only, granted-first**: alleen Stripe-aankopen dragen omzet; verbruik van *granted* credits = acquisitiekost (OPEX). Bij gepoolde credits: verbruikt-purchased = `LEAST(purchased, GREATEST(0, consumed−granted))`. Recognized = verbruikt-purchased × €/credit; Deferred = rest-purchased × €/credit.
- **`opex_expenses(period, category, channel, eur)`**: losse ads/marketing + periodieke opex, los van `cost_config` (tarieven). CAC-basis etappe 2.
- **`admin_geld_summary()`** (SECURITY DEFINER, **service_role-only**): geeft beide scopes (external=echt, internal=test) + tarieven + globale OPEX. COR-per-type uit job-tabellen (AssemblyAI-minuten + Decodo-egress gemeten; **caption-COR geschat** — playlist-egress niet per-video gemeten; RAG=€0). Balans altijd uit `user_credits` (niet purchased−consumed afgeleid).

**Toestand bij oplevering (2026-07-13):** ná filter is de echte externe economie €0 (pre-revenue) — alle gemeten activiteit stond op interne accounts. Het GELD-blok toont dit eerlijk + een intern/test-panel als bewijs dat de berekening werkt.
