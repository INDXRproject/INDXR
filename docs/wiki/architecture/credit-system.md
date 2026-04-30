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

| Pakket | Prijs | Credits | €/credit | Volume-korting |
|--------|-------|---------|----------|---------------|
| **Try** | €2.49 | 200 | €0.01245 | — |
| **Basic** | €5.99 | 500 | €0.01198 | 4% |
| **Plus** ★ | €11.99 | 1.100 | €0.01090 | 12% |
| **Pro** | €24.99 | 2.600 | €0.00961 | 23% |
| **Power** | €49.99 | 5.500 | €0.00909 | 27% |

★ = "Meest populair" in UI

**Credits verlopen niet.** Eenmalige aankoop, geen abonnement.

Zie [ADR-012](../decisions/012-pricing-tiers.md) voor de rationale achter deze tiers.

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
1. Gebruiker selecteert pakket op /pricing
2. Frontend: POST /api/stripe/checkout met {plan: 'try' | 'basic' | 'plus' | 'pro' | 'power'}
3. Next.js checkout route:
   a. Verifieert auth + suspension check
   b. Maakt Stripe Checkout Session aan met server-side price_data
   c. Slaat {userId, credits} op in session.metadata
   d. Returns {url: checkout_url}
4. Gebruiker betaalt op Stripe-pagina
5. Stripe stuurt POST /api/stripe/webhook
6. Webhook handler:
   a. Verifieert Stripe-signature (STRIPE_WEBHOOK_SECRET)
   b. Event type: checkout.session.completed
   c. Extraheert userId + credits uit session.metadata
   d. Roept add_credits RPC aan
   e. Slaat 'paid user status' op in profiles (has_ever_purchased = true)
   f. Tracks 'credits_purchased' event in PostHog
7. Credits direct beschikbaar in gebruikersaccount
```

**Beveiligingsaspect:** De prijs is server-side vastgelegd in `PACKAGES` object (`checkout/route.ts`). De client stuurt alleen de pakket-naam — nooit de prijs.

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
1. Gebruiker registreert
2. Frontend roept claimWelcomeRewardAction() aan (Server Action)
3. Defense-in-depth check:
   a. Controleer of er al een 'Welcome reward' entry bestaat
   b. Roep claim_welcome_reward RPC aan (atomisch idempotent)
4. +25 credits toegevoegd
```

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

`refreshCredits()` aanroepen na succesvolle aankoop of verbruik om de UI bij te werken.

---

## Credit Transaction History

Momenteel zichtbaar: laatste 20 transacties onder Account > Billing & Credits.

**Openstaande vraag:** Gebruikers willen volledige historiek. Overwegingen:
- Supabase storage per transactie is verwaarloosbaar (~100 bytes/rij)
- Bij 10.000 gebruikers × 100 transacties = 1M rijen → nog steeds verwaarloosbaar
- Implementeer hogere/onbeperkte cut-off als post-launch verbetering
- Integreer ook in admin dashboard (processing times + transacties per tijdvenster)
