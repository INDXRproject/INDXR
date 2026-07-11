# Beslissing 054: Cost/usage capture-laag + `cost_config` tarief-tabel

**Status:** Geaccepteerd
**Datum:** 2026-07-11
**Gerelateerde code:** `supabase/migrations/20260711100000_cost_config.sql`, `20260711100100_job_cost_capture_columns.sql`, `20260711100200_daily_cost_counters.sql`, `20260711100300_credit_kind_stamping.sql`, `20260711100400_library_bytes_meter.sql`, `20260711100500_profiles_acquisition.sql`; `backend/audio_utils.py`, `backend/assemblyai_client.py`, `backend/transcription_pipeline.py`, `backend/youtube_utils.py`, `backend/credit_manager.py`, `backend/main.py`; `apps/app/src/app/api/stripe/webhook/route.ts`; `packages/shared/src/components/AcquisitionCapture.tsx`, `packages/shared/src/actions/auth-actions.ts`

## Context

Pre-launch audit (2026-07-11) stelde vast dat de meeste **kost-inputs per job/aankoop niet werden gepersisteerd** en dus **onherstelbaar** verloren gingen: Decodo-egress-bytes werden gemeten en weggegooid, het effectieve AssemblyAI-model niet gelezen, DeepSeek-tokens genegeerd, de Stripe-fee/BTW/settlement nergens opgeslagen (alleen bruto), en er was geen acquisitie-bron bij signup. Er bestond bovendien **geen runtime tarief-tabel** — kostentarieven leefden alleen in `docs/wiki/business/unit-economics.md`, dus "kost = usage × tarief" was niet uitrekenbaar en tarieven wijzigen vereiste een deploy. Doel: **capture compleet, weergave licht** — leg nu vast wat we later voor marges/CAC/kost-dashboards nodig hebben, zonder nu dashboard-UI te bouwen.

## Beslissing

Een capture-laag met één runtime tarief-bron:

1. **`cost_config`** (nieuwe tabel) — EUR-tarieven (`decodo_eur_per_gb`, `assemblyai_eur_per_min`, `deepseek_eur_per_1k_input/output_tokens`, `fixed_monthly_infra_eur`) met `effective_from`-historie. Kost = join op de rij die gold op `job.created_at`. Service-role only (RLS aan, geen policies). Tarieven wijzigen = rij toevoegen, geen deploy.
2. **Per-job capture** — `transcription_jobs.proxy_bytes` (rauwe pre-ffmpeg Decodo-egress, gepersisteerd meteen na download), `transcription_jobs.assemblyai_model` (effectief `speech_model_used`), `transcripts.ai_summary_usage` (DeepSeek `{prompt,completion,total,model}`, informationeel — samenvatting blijft flat 3 credits).
3. **Aggregaat capture** — `daily_cost_counters` + `bump_caption_proxy_bytes()` voor de gratis-caption Decodo-bytes (dag-grain, geen per-extractie-rij; `usage_logs` heeft geen writers). R2-eigen-cache-kost blijft een aparte, niet-per-user aggregaat-kostenpost (zie hieronder, niet gebouwd).
4. **Per-aankoop netto** — de Stripe-webhook haalt best-effort `PaymentIntent→Charge→BalanceTransaction` op en slaat `amount_tax` (BTW), `stripe_fee`, `net_settlement`, `settlement_currency` op in de purchase-`metadata`, zodat netto = bruto − BTW − fee exact reconstrueerbaar is. **Nooit blokkerend** voor de credit-grant.
5. **`kind`-classificatie** — `add_credits` krijgt `p_kind`; callers stempelen `purchase`/`grant`/`refund`; `claim_welcome_reward` stempelt `welcome` (CHECK verbreed). Purchased/granted/welcome/refund zijn voortaan zuiver scheidbaar (root-cause van de "Credits Purchased"-conflatie).
6. **Per-user opslag** — `user_credits.library_bytes` (lopend totaal, via trigger op `transcripts` die álle insert-paden vangt) + `library_bytes_cap` (default 5 GiB, grandfather-veilig). Meter/fundering only — géén handhaving, géén credit-sink-UI (post-launch).
7. **Acquisitie** — `profiles.utm_*`/`signup_source`/`signup_referrer`/`signup_landing_path`, first-touch client-side cookie → signup → `raw_user_meta_data` → profiles-trigger.

## Rationale

- **Trigger i.p.v. call-site-wiring voor `library_bytes`:** transcripts worden vanuit meerdere paden geïnserteerd (backend service-role + browser-client onder RLS). Een trigger is de enige O(1), niet-driftende manier om ze allemaal te vangen.
- **`kind`-stempel i.p.v. `metadata`-heuristiek:** metadata-filtering (`stripe_session_id`) werkte al voor purchases, maar granted/welcome/refund waren niet scheidbaar; één kolom lost dat structureel op.
- **EUR-opslag:** de business/settlement-valuta (BTW-inclusief pricing, ADR-052); USD-bronrates omgerekend @ 0.92 met de FX vastgelegd in `usd_eur_rate` + `notes`.
- **Best-effort Stripe-fetch:** `balance_transaction` is niet altijd synchroon beschikbaar; de fee-fetch mag de geld-grant nooit breken → try/catch, bruto-only fallback, backfillbaar.
- **Tokens op `transcripts` i.p.v. `credit_transactions.metadata`:** de summary-metadata wordt vóór de DeepSeek-call gezet (tokens dan onbekend); co-locatie met het artefact vermijdt een fragiele post-hoc lookup. Nadeel: overschrijft bij regeneratie (informationeel, acceptabel).

## Consequenties

- Kost-per-job/aankoop en CAC-per-kanaal zijn nu **afleidbaar uit Supabase**; het latere admin-financieel-dashboard (1.24) is pure rewiring op deze kolommen + `cost_config`.
- **Live verificatie vereist** voor de live-only captures (proxy_bytes/model/tokens via een echte job; fee/settlement via een test-betaling) — DB-schema + rolled-back proofs zijn groen, maar echte inserts komen uit de hand-over-checklist.
- **Vervolg 2026-07-11 (Blokken A–F) — gaten grotendeels gedicht:**
  - **(a) OAuth-acquisitie GEDICHT** — guarded upsert in `auth/callback/route.ts` (`.is('signup_source', null)`, best-effort, PKCE ongemoeid). Vereist een profiles-UPDATE-RLS-policy voor de eigen rij; live OAuth-test in de checklist.
  - **(b) Playlist-caption-bytes GEDICHT** — `bump_caption_proxy_bytes` nu ook in `worker.py` (cache-miss, step 2/3). Rest-gap: caption step 1 (`youtube-transcript-api`) bytes blijven ongemeten in beide routes.
  - **(c) DeepSeek — model-migratie + echt tarief** — `deepseek-chat` → `deepseek-v4-flash` (deprecatie 2026-07-24); `cost_config` bijgewerkt met echte pricing (input $0,14/M, output $0,28/M ×0,92, apart in/out).
  - **(d) R2-per-user** — nog steeds video-scoped/gedeeld; niet gebouwd (zie boven).
  - **Credit-kinds vereenvoudigd** — bijschrijf-kant terug naar **exact 3** (`purchase`/`grant`/`refund`); `welcome`+legacy `bonus` gevouwen in `grant`.
  - **`library_bytes_cap`** default 5 GiB → **100 MiB** placeholder (niet-gehandhaafd; enforcement+grandfather+credit-sink = benoemde post-launch storage-monetisatietaak, vereist prijsbeslissing).
- **RPC-privilege-lek GEDICHT (Blok A):** de credit-muterende SECURITY DEFINER-RPC's zijn nu `service_role`-only (de Stripe-webhook is daarvoor omgezet naar de service_role-client); `deduct_credits_atomic`/`claim_welcome_reward` houden `authenticated` op basis van de geverifieerde caller-map; `search_path` gepind. Regel + tabel in [auth-and-security.md](../architecture/auth-and-security.md#rpc-execute-privileges-2026-07-11-adr-054). Openstaand: `get_user_credits` info-leak (andermans saldo leesbaar) — post-launch hardening.

### Vervolg 2026-07-11 (DeepSeek exacte kost + live-capture-verificatie)

- **Live-capture geverifieerd (3 test-jobs).** Betaalde AI-job (`SVfajDS-bj0`): `transcription_jobs.proxy_bytes`=15.392.032 (>0), `assemblyai_model`='universal-3-pro', `credits_cost`/`credits_reserved`=16 (=ceil(921s/60)), `credits_deducted`=false (reserverings-model, ADR-050). Samenvatting: `transcripts.ai_summary_usage` gevuld (model `deepseek-v4-flash`, prompt/completion/total tokens). **`daily_cost_counters` was leeg — GEEN capture-gat:** de gratis-caption-bump (`bump_caption_proxy_bytes`, main.py:432 / worker.py:265) vuurt uitsluitend op een **cache-MISS** (proxied VTT-download → `proxy_bytes>0`); een Redis-cache-hit (30-dagen TTL) én een `master_transcripts`-hit retourneren vóór de download en kosten nul Decodo-egress → terecht niets te tellen. RPC + grants (service_role) + byte-meting (`len(resp.content)`) alle correct (rolled-back proof: bytes=12345 count=1). De test-video zat in de Redis-cache. Live-confirm: een verse, nooit-geëxtraheerde caption-video bumpt de dag-teller.
- **DeepSeek kost = ECHTE kost (Blok B).** Root-cause: kost = tokens×één opgeslagen (cache-miss) tarief is fout zodra DeepSeek afwijkt. De response geeft de **cache-splitsing** (`prompt_cache_hit_tokens`/`prompt_cache_miss_tokens`, geverifieerd tegen een echte response) maar **geen bedrag/piek-vlag**. FIX: `ai_summary_usage` logt nu de splitsing + `deepseek_created` (server-UTC); `cost_config` kreeg `deepseek_eur_per_1k_cache_hit_tokens` (€0,000002576/1k, `numeric(18,10)` want scale-6 zou 16% afronden) + `deepseek_peak_multiplier`(1,0) + `deepseek_peak_windows_utc`(NULL) (migratie `20260711214500`). Echte kost = hit×hit_rate + miss×miss_rate + out×out_rate, ×multiplier binnen een venster. **Live bewezen**: herhaalde call 512 hit/21 miss → €0,000030 echt vs €0,000095 naïef (3,15× overschatting weggenomen); DB-persistentie van de rijkere JSON rolled-back bevestigd. Piekuren staan in config (officiële pagina toont geen tijd-pricing 2026-07-11 → multiplier 1,0; activeren = config-rij, geen deploy). Zie [unit-economics.md](../business/unit-economics.md#deepseek-ai-samenvatting--aparte-kostenpost).
