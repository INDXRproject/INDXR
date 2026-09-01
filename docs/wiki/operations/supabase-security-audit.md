# Supabase Security Advisor — audit 2026-09-02

**Status:** afgerond (1 item bewust open, zie eind)
**Aanleiding:** de Supabase security-advisor-mail van 31 aug 2026 meldde `rls_disabled_in_public`
op `summary_cost_baseline_log` (gedicht in commit `c578a8e`, migratie `20260901210140`). Bij het
oppakken bleek de bredere advisorlijst nog vol te staan — 40 WARN + 14 INFO. Deze pagina werkt die
lijst volledig af: gefixt wat gefixt hoort, gedocumenteerd wat bedoeld is. Niets blijft
ongeclassificeerd.

Dit is het gezaghebbende auditverslag. `auth-and-security.md` verwijst hierheen i.p.v. te dupliceren.
De kritieke cross-user-lek (`transcription_jobs`) heeft een eigen ADR: [ADR-104](../decisions/104-transcription-jobs-rls-leak.md).

---

## Beginstand (exacte telling per lint)

| Lint | Level | Aantal | Wat het was |
|---|---|---:|---|
| `rls_disabled_in_public` | ERROR | 1 | `summary_cost_baseline_log` zonder RLS — **al gedicht** in `c578a8e` (vorige sessie) |
| `rls_policy_always_true` | WARN | 1 | `transcription_jobs` policy `USING true` voor `{public}` — **cross-user datalek** |
| `security_definer_function_executable` (anon) | WARN | 14 | DEFINER-functies aanroepbaar door niet-ingelogde bezoekers |
| `security_definer_function_executable` (authenticated) | WARN | 17 | DEFINER-functies aanroepbaar door élke ingelogde user |
| `function_search_path_mutable` | WARN | 7 | Functies zonder vastgezet `search_path` |
| `auth_leaked_password_protection` | WARN | 1 | HIBP-lekwachtwoordcontrole staat uit |
| `rls_enabled_no_policy` | INFO | 14 | Backend-only tabellen: RLS aan, geen policy (bedoeld) |

Totaal aangepakt in deze sessie: **40 WARN + 14 INFO** (de ERROR was al weg).

---

## Wat is gevonden en gedicht (met blootstellingsperiode)

### 1. KRITIEK — cross-user datalek op `transcription_jobs` (`rls_policy_always_true`)
De tabel had twee PERMISSIVE policies, beide `roles={public}`:
`"Service role can do everything"` (`cmd=ALL, USING true, WITH CHECK true`) én
`"Users can view own jobs"` (`SELECT, auth.uid()=user_id`). PERMISSIVE-policies combineren met **OR**,
dus `USING true` overrulede de eigenaarscheck. De naam suggereerde service_role, maar de policy gold
voor **PUBLIC** (anon + authenticated); service_role/postgres hebben `BYPASSRLS` en hadden 'm nooit nodig.

**Bewezen blootstelling (echte REST-calls, vóór de fix):**
- anon-key, niet ingelogd → `content-range 0-0/300`: **alle 300 jobs van alle 7 users leesbaar**.
- ingelogde `test1` (bezit 7 jobs) → **300/300 zichtbaar**, over alle 7 users heen.
- ook schrijfbaar/verwijderbaar (`USING true`+`WITH CHECK true` op `ALL`, anon+auth CRUD-grants).

**Blootstellingsperiode:** de policy zit al in de baseline-squash `20260630155944_baseline.sql`
(2026-06-30) → open van ≥ 2026-06-30 tot de fix op 2026-09-02.

**Fix** (`20260901220226`): `DROP POLICY "Service role can do everything"`. Alleen
`"Users can view own jobs"` blijft. Geen enkele client schrijft `transcription_jobs`
(callsites zijn puur SELECT: `useJobStatus`/`ActiveJobsIndicator`/`SummaryTab`/`useCompletionReceipt`);
de backend schrijft via service_role (BYPASSRLS). Realtime `useJobStatus` blijft werken (SELECT-own).

**Bewezen ná de fix:** anon → `*/0`; `test1` → `0-0/7` (alleen eigen, 1 distinct user);
`test1` UPDATE op andermans job → 0 rijen; anon INSERT → 401; `test1` leest eigen job → 200.
Zie [ADR-104](../decisions/104-transcription-jobs-rls-leak.md).

### 2. FINANCIEEL — credit-RPC `settle_credits` aanroepbaar door elke ingelogde user
`settle_credits` (credit-settlement) hoort service_role-only te zijn (ADR-054, lockdown
`20260711170300_lock_credit_rpcs`). Op **2026-08-07** werd de functie herbouwd met een extra
`p_product_type`-parameter (`20260807204301_settle_credits_product_type.sql`); die `CREATE OR REPLACE`
herstelde de default `EXECUTE`-grant aan PUBLIC zonder opnieuw te REVOKE'n. Gevolg: van 2026-08-07 tot
2026-09-02 kon élke ingelogde user (en anon) `/rest/v1/rpc/settle_credits` aanroepen.

**Bewezen (vóór):** `test1` → HTTP 400 met `P0001` **uit de functiebody** ("vereist p_job_id") = de
functie draaide (grant aanwezig). **Ná de lockdown:** HTTP 403. Body **byte-identiek** (md5
`fc1776cf018fad07422d00d73caca3eb` vóór en ná — alleen de grant is gewijzigd, niet de logica).

### 3. Admin-financiële RPC's publiek aanroepbaar
`admin_operations_v3`, `admin_summary_cost_panel`, `admin_summary_cost_per_user` (admin Finance/Operations,
sinds o.a. `20260824135000`, ADR-096/098) waren anon+authenticated-uitvoerbaar. **Bewezen (vóór):**
anon én `test1` → HTTP 200 met admin COR/marge-data. Ze worden alleen server-side via
`createAdminClient()` (service_role) aangeroepen. **Ná:** anon 401 / authenticated 403.

---

## Wat per groep is gedaan

### `security_definer_function_executable` — 31 → 5 (intended)
Per functie geclassificeerd tegen de **callsites** (niet de lint-tekst):

| Groep | Functies | Actie | Waarom |
|---|---|---|---|
| Admin | `admin_operations_v3`, `admin_summary_cost_panel`, `admin_summary_cost_per_user` | REVOKE anon+auth, GRANT service_role | alleen `createAdminClient()` (service_role) |
| Intern/metering/nachtelijk | `bump_caption_proxy_bytes`, `check_summary_cost_baseline`, `watchdog_unrefunded_reserved` | idem service_role-only | alleen de Python-backend/worker |
| Credit-mutatie | `settle_credits` | idem service_role-only | ADR-054-drift (zie boven) |
| Trigger-functies | `handle_new_user`, `handle_new_user_acquisition`, `transcripts_library_bytes_trigger` | REVOKE anon+auth | vuren als table-owner; EXECUTE-grant onnodig |
| Dood | `deduct_credits(uuid,int,text,jsonb)`, `reset_monthly_quota(uuid)` | **DROP** | geen callers/trigger/cron (zie hieronder) |
| User-facing (blijft) | `submit_support_ticket`, `library_storage_is_full` | REVOKE **alleen anon**, houd authenticated | echte authenticated-client-callsites |
| User-facing (was al goed) | `get_user_credits`, `deduct_credits_atomic`, `claim_welcome_reward` | ongewijzigd | interne `auth.uid()`-guard / eigen-data |

**Resterend na de fix: 5 × `authenticated_security_definer_function_executable`** — `get_user_credits`,
`deduct_credits_atomic`, `claim_welcome_reward`, `submit_support_ticket`, `library_storage_is_full`.
Dit zijn **bedoelde** user-facing RPC's die DEFINER nodig hebben om RLS te bypassen voor de eigen data
van de aanroeper; de lint (0029) blijft ze markeren. Geen anon-executable DEFINER-functie meer (0).

### Dode functies gedropt
- `deduct_credits(uuid, integer, text, jsonb)` — muteerde de orphan-kolom `profiles.credits` +
  dode `credit_transactions.balance_after`/`transaction_type`. Enige "caller" in code =
  `deduct_credits_atomic` (andere functie). CLAUDE.md-orphan. **Gedropt.**
- `reset_monthly_quota(uuid)` — oud quota-systeem (`profiles.playlist_quota_*`). Geen caller in
  `apps/`/`packages/`/`backend/`, geen trigger, geen pg_cron, geen proc-referentie. **Gedropt.**

### `function_search_path_mutable` — 7 → 0
Via `ALTER FUNCTION ... SET search_path = public, pg_temp` (nooit `CREATE OR REPLACE` — body ongemoeid;
bewezen met md5-diff op de credit-RPC's): `handle_new_user`, `watchdog_unrefunded_reserved`,
`refund_credits`, `update_playlist_video_progress`, `normalize_email`. De andere twee (`deduct_credits`,
`reset_monthly_quota`) verdwenen door de DROP. Geverifieerd dat **geen** van deze functies een
extensie-schema-functie gebruikt (alleen `public` + `pg_catalog`), dus `public, pg_temp` volstaat en
`extensions` hoefde niet in het pad.

### `rls_enabled_no_policy` (INFO) — 14, bedoeld gedrag
Dit zijn backend-only tabellen waar **policyloze RLS het bedoelde beleid is** (geen policy verzinnen):
`cost_config`, `daily_cost_counters`, `decodo_daily_usage`, `finance_daily_snapshot`, `finance_settings`,
`idempotency_keys`, `master_transcripts`, `opex_expenses`, `ops_config`, `payment_attempts`,
`payment_reversals`, `proxy_usage_log`, `service_metrics`, `summary_cost_baseline_log`. Alleen de
Python-backend / `createAdminClient()` / Stripe-webhook (allemaal service_role, `BYPASSRLS`) raken ze aan;
0 browser/anon-client-reads (geverifieerd met grep). De INFO-lint blijft — dat is correct voor deze
tabellen. **Extra hardening in deze sessie** (`20260901221251`): 10 ervan droegen nog default
anon/authenticated CRUD-grants (residuele exposure bovenop RLS); die zijn ge-`REVOKE`'d zodat ze de
eindstaat van `proxy_usage_log`/`service_metrics`/`decodo_daily_usage` matchen. Bewezen: anon REST op
`payment_attempts`/`cost_config`/`master_transcripts` → 401.

### `auth_leaked_password_protection` (WARN) — bewust open, zie eind

---

## Frontend-hardening (hoort bij het HIBP-item)
HIBP-lekwachtwoordcontrole weigert een gecompromitteerd wachtwoord óók bij `updateUser({password})`,
niet alleen bij `signUp` — dus `/reset-password` en de ingelogde wachtwoord-wijziging krijgen dezelfde
GoTrue-afwijzing als signup. Om te voorkomen dat dat een rauwe Supabase-string toont (stil conversielek
tijdens de campagne), is een gedeelde mapper toegevoegd — `packages/shared/src/lib/passwordErrors.ts`
(`mapPasswordError` / `leakedPasswordMessage`) — en aangesloten op **alle drie** de wachtwoord-oppervlakken:
`signup` (server-action), `/reset-password`, en `SecuritySettingsCard`. Unit-getest
(`passwordErrors.test.ts`, beide takken groen). Zo is het inschakelen van HIBP straks een veilige
één-klik-actie.

---

## Eindstand (advisor opnieuw gedraaid, 2026-09-02)

| Lint | Level | Begin | Eind | Verklaring resterend |
|---|---|---:|---:|---|
| `rls_disabled_in_public` | ERROR | 1 | **0** | gedicht (c578a8e) |
| `rls_policy_always_true` | WARN | 1 | **0** | gedicht (ADR-104) |
| `security_definer_function_executable` | WARN | 31 | **5** | 5× bedoelde user-facing RPC (0 anon) |
| `function_search_path_mutable` | WARN | 7 | **0** | gepind of gedropt |
| `auth_leaked_password_protection` | WARN | 1 | **1** | **OPEN — dashboard-toggle nodig (zie onder)** |
| `rls_enabled_no_policy` | INFO | 14 | **14** | bedoeld: service-role-only tabellen |

**WARN 40 → 6** (5 bedoeld + 1 open), **INFO 14 → 14** (allen bedoeld). Migratieteller **164 → 167**
(exact +3: `20260901220226`, `20260901221134`, `20260901221251`).

### OPEN — vraag voor Khidr: HIBP-lekwachtwoordcontrole inschakelen
`auth_leaked_password_protection` is een **projectinstelling** die alleen via de Management API
(persoonlijke `sbp_`-token) of het dashboard aan kan — niet via de MCP of de service-role key (geen van
beide beschikbaar in deze omgeving). **Actie:** Supabase Dashboard → Authentication → Sign In / Providers
→ (Password) → zet **"Prevent use of leaked passwords"** aan. De frontend is er al op voorbereid (mapper
hierboven), dus inschakelen is veilig — signup/reset/change tonen dan leesbare copy i.p.v. de rauwe string.

---

## Deze audit over 3 maanden herhalen (zonder deze chat)

1. **Draai de advisor:** `get_advisors(security)` via de Supabase MCP op project `uivlvwcplcaixkzuiwsv`,
   of Dashboard → Advisors → Security.
2. **Tafels zonder RLS:** `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;` moet leeg zijn.
3. **Always-true policies:** `SELECT tablename, policyname, roles, cmd FROM pg_policies
   WHERE schemaname='public' AND (qual='true' OR with_check='true');` — een `roles={public}` + `USING true`
   op een user-tabel is een lek (let op: policy-**naam** zegt niets over de rolbinding — check `roles`).
4. **DEFINER-functies aanroepbaar door anon/auth:** `SELECT proname,
   has_function_privilege('anon',oid,'EXECUTE') a, has_function_privilege('authenticated',oid,'EXECUTE') au
   FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef;` — verwacht **0 anon**; de
   authenticated-lijst hoort exact de 5 user-facing RPC's te zijn (get_user_credits, deduct_credits_atomic,
   claim_welcome_reward, submit_support_ticket, library_storage_is_full). Een nieuwe naam = onderzoek de callsite.
5. **search_path:** `SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef
   AND (proconfig IS NULL OR NOT EXISTS(SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%'));`
   moet leeg zijn.
6. **Residuele grants op backend-tabellen:** `has_table_privilege('anon'|'authenticated', <tbl>, 'SELECT')`
   op de service-role-only tabellen moet `false` zijn.
7. **Echte-call-bewijs weegt zwaarder dan een query:** test met de anon-key + een echte user-JWT
   (`tests/test_accounts.json`, `test1@indxr-test.com`) tegen `/rest/v1/...` en `/rest/v1/rpc/...`.
   Zie de commando's in `docs/LOG.md` bij de entry van 2026-09-02.
8. **Vergeet de projectinstelling niet:** HIBP (`auth_leaked_password_protection`) staat los van SQL —
   alleen via dashboard/Management API.
