# Beslissing 104: `transcription_jobs` cross-user RLS-lek gedicht (always-true policy)

**Status:** Geaccepteerd
**Datum:** 2026-09-02
**Gerelateerde code:** `supabase/migrations/20260901220226_fix_transcription_jobs_always_true_rls_leak.sql`, `packages/shared/src/hooks/useJobStatus.ts`, `docs/wiki/operations/supabase-security-audit.md`

## Context
De Supabase security-advisor meldde `rls_policy_always_true` op `public.transcription_jobs`. De tabel
had twee PERMISSIVE policies, **beide `roles={public}`**:
- `"Service role can do everything"` — `cmd=ALL, USING true, WITH CHECK true`
- `"Users can view own jobs"` — `cmd=SELECT, USING (auth.uid() = user_id)`

PERMISSIVE-policies combineren met **OR**. De `USING true`-policy gold voor **PUBLIC** (anon +
authenticated), niet voor service_role — de naam was misleidend. Daardoor overrulede `USING true` de
eigenaarscheck volledig. Gecombineerd met de default CRUD-grants aan anon+authenticated was elke rij
lees- én schrijfbaar door iedereen met de (publieke) anon-key.

**Bewezen blootstelling (echte REST-calls vóór de fix):**
- anon-key, niet ingelogd → `content-range 0-0/300`: alle **300 jobs van 7 verschillende users** leesbaar.
- ingelogde `test1` (bezit 7 jobs) → **300/300** zichtbaar, over alle 7 users.
- schrijf-/verwijderpad even open (`WITH CHECK true` op `ALL`).

**Blootstellingsperiode:** de policy zit al in de baseline-squash `20260630155944_baseline.sql` →
open van ≥ 2026-06-30 tot de fix op 2026-09-02.

## Beslissing
`DROP POLICY "Service role can do everything" ON public.transcription_jobs`. Er wordt **geen**
service_role-policy toegevoegd: `service_role` en `postgres` hebben `BYPASSRLS` en hebben nooit een
policy nodig. Alleen `"Users can view own jobs"` (SELECT, `auth.uid()=user_id`) blijft over.

## Rationale
- Elke client-callsite op `transcription_jobs` is **read-only** (`useJobStatus`, `ActiveJobsIndicator`,
  `SummaryTab`, `useCompletionReceipt`) — geen enkele client schrijft de tabel. Alle writes lopen via
  de Python-backend met de service-role key (BYPASSRLS). Het weghalen van de allow-all-write-policy
  breekt dus geen enkel clientpad.
- De `auth.uid()=user_id`-policy is precies het model dat `useJobStatus.ts` al documenteert; Realtime
  gebruikt diezelfde SELECT-policy, dus job-polling/Realtime blijft werken voor eigen jobs.
- `user_id IS NULL`-jobs bestaan niet (0 rijen); de anonieme marketing-extractie schrijft geen
  `transcription_jobs` (caption-only), dus de eigenaarscheck breekt geen uitgelogd pad.

## Consequenties
- **Bewezen ná de fix:** anon → `*/0`; `test1` → `0-0/7` (alleen eigen, 1 distinct user); `test1`
  UPDATE op andermans job → 0 rijen; anon INSERT → 401; `test1` leest eigen job → 200. Realtime intact.
- `rls_policy_always_true` is weg uit de advisor.
- Bredere les vastgelegd in `docs/LESSONS.md`: **een policy-naam is geen rolbinding** — controleer altijd
  de `roles`-kolom van `pg_policies`, niet de naam.
- Zie de volledige audit (`operations/supabase-security-audit.md`) voor de rest van de advisorlijst,
  inclusief een tweede, financieel gevoelige drift (`settle_credits` was ~2026-08-07→2026-09-02 door
  élke ingelogde user aanroepbaar) die in dezelfde sessie is gedicht.
