# Eindrapport — 5-takenreeks (2026-09-13)

Cold-read voor Khidr. Eén taak = één commit = één push = één deploy-verificatie. Taak 1 deblokkeerde
de rest (testtoegang). Alle 5 taken afgerond.

## Per taak

| # | Taak | Status | Commit(s) | Deploy / verificatie |
|---|------|--------|-----------|----------------------|
| 1 | Testtoegang: deblokkeren + structureel oplossen | ✅ done | `e506ea5` | provisioning-smoke PASSED tegen prod |
| 2 | Openstaande verificaties (2a/2b) + frame3 (2c) | ✅ done (2a admin-helft [~]) | `467b901` | live tegen prod (demo@) + frame3 @2880×1728 |
| 3 | Watchdog 504-retry + alert-drempel | ✅ done | `7b00ea0`, `02feee6` | Railway 7b00ea0 SUCCESS; 13 schone cron-runs, 0 degraded |
| 4 | trackActivation transaction_id | ✅ done | `135daf7` | API-deploy SUCCESS; `user_id` live in `/api/jobs`; payload 8/8 |
| 5 | Summary stap-2 retry overslaan bij max_tokens | ✅ done | `f714a83` | unit 2/2; ADR-106 addendum; live-signatuur [~] |

## Verificatiebewijs (kort)

- **T1:** test1-4@indxr-test.com bestaan **niet meer** in `auth.users` → `test_accounts.json` verouderd
  (nooit in git-history, al gitignored — geen wachtwoord-lek). demo@ login werkt (geen drift; saldo 1957
  = 1958 − mijn 12-09-verificatietranscriptie; last_active 12-09 = diezelfde login). Structureel:
  nieuw per-run provisioning-model (`helpers/provision.ts` + `global-setup`/`global-teardown`): verse
  users via `admin.createUser`, `is_internal`+onboarding+credits, wachtwoord gegenereerd (alleen in
  gitignored runtime-file), env-var fallback, teardown achter `E2E_TEARDOWN=1` (default uit, rule #227).
  Smoke-spec groen tegen prod. Runner-shim `pnpm test:e2e` lost pnpm-hoisting op.
- **T2a:** user-facing `/dashboard/credits` live (demo@): gegroepeerd, som van zichtbare regels = **1957
  = get_user_credits** ✓. Admin-UI + samueltrevino-eigen-pagina **[~]** (demo is geen admin; ADMIN_USER_ID
  = Khidr's account; samueltrevino-som=14 was vorige ronde read-only bewezen, weergavelogica gedeeld).
- **T2b:** playlist dedup live: availability toont *"2 video(s) already in your library — existing
  transcripts will be skipped"*; de geskipte zijn **AI-in-library** video's die voor een **caption**-
  verzoek worden overgeslagen (de TAAK 3-fix). DB: 0 dubbele rijen. Credit-kosten skipped = 0.
- **T2c:** frame3 opnieuw geschoten @2880×1728 (light+dark): nieuwe tabvolgorde **Upload|YouTube|Playlist**,
  nieuwe subhead, live "Extracting playlist" queue. Andere 8 frames UI-geldig.
- **T3:** `_retry_read` (truncated exp backoff + full jitter, max 4, deadline 20s) om **alle** watchdog-
  leesquery's (0a/0b/1a/1b/2/2b/2c/summary-reaper/reap-running); muterende stappen niet blind geretried.
  Alert: transient/enkele degraded run = WARNING, ERROR pas bij 3 **opeenvolgende** degraded runs
  (Redis-streak, fail-safe → ERROR). Unit 15 groen (incl. 504-simulatie). **Live: 13 schone runs, 0 degraded.**
- **T4:** `trackActivation(userId?)` → `transaction_id: activation_<userId>` (exact, geen drift).
  `user_id` komt uit de `/api/jobs` poll-respons (beide fire-paden pollen) — **live geverifieerd** dat de
  respons `user_id` bevat. Payload 8/8 tegen echte gtag.ts; build 2/2.
- **T5:** `_run_section` slaat de same-model retry over bij `finish_reason ∈ {max_tokens, length}` →
  direct fallback. Unit 2/2 (max_tokens → 2 calls; niet-truncatie → 3 calls). Refund/ledger/breaker
  ongemoeid; kost kan alleen omlaag.

## Niet gefixt (bewust / buiten scope)

- **T4 trackPurchase:** heeft al een stabiele `transaction_id` (Stripe session-id) + localStorage-guard →
  correct, **ongemoeid** gelaten (gerapporteerd, niet gewijzigd).
- **Watchdog muterende passes** (refunds, CAS-claims, reaper-updates): bewust **niet** geretried — bij
  twijfel laten falen en de volgende cron-run (2 min) pakt het idempotent op (refunds idempotent via de
  `(job_id/playlist_id,'refund')`-sleutel).

## Open beslissingen (met aanbeveling)

1. **T2a admin-UI-verificatie** blijft open zolang er geen admin-sessie beschikbaar is. Aanbeveling:
   Khidr checkt samueltrevino's credit-history in de echte admin-UI (som moet 14 zijn) — de transform is
   read-only bewezen, alleen de live admin-render ontbreekt.
2. **T5 live 5-summaries:** de meetbare handtekening is dat nieuwe runs **geen** `recovery='retry'`-rijen
   mét `finish_reason='max_tokens'` meer in `ai_summary_usage_log` produceren. Monitor bij de eerstvolgende
   echte samenvattingen; de wijziging is puur control-flow (kan kost/kwaliteit niet verslechteren).
3. **base_max stap-2-cap** (aparte afweging, ADR-106): ophogen zou de truncatie-frequentie zelf verlagen
   i.p.v. alleen de verspilde retry weg te nemen — raakt token-kost, dus een bewuste pricing-keuze.

## Losse eindjes

- **24 `e2e-<runId>-*`-accounts** aangemaakt tijdens T1-verificatie (6 runs × 4), allemaal `is_internal=true`
  → vervuilen de dashboards niet. Niet verwijderd (rule #227); opruimbaar met `E2E_TEARDOWN=1`.
- **demo@ library:** T2c-extractie voegde ~10 linear-algebra caption-transcripts toe + reserveerde 7
  credits (1957→1950). Een toekomstige re-shoot van frame1/frame2 toont die content; verwijderbaar door
  Khidr indien ongewenst (ik verwijder niets — rule #227).
- **`tests/test_accounts.json`** is nu dood (verwijst naar niet-bestaande accounts) maar gitignored en
  lokaal; de nieuwe loader gebruikt hem niet meer. Kan lokaal weg; staat niet in de repo.
- **CLAUDE.md** noemt nog "tests/test_accounts.json aanwezig" als E2E-vereiste — verouderd door de
  provisioning; `docs/wiki/operations/testing.md` is bijgewerkt naar het nieuwe model.
