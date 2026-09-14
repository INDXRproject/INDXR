# Testen — accounts, Playwright, headless prod-checks

Praktische gids: hoe kom je aan werkende testaccounts en hoe draai je de E2E-specs +
de herbruikbare authenticated productie-check.

## Testaccounts — VASTE POOL (sinds 2026-09-14)

**Er worden GEEN wachtwoorden in de repo opgeslagen en GEEN accounts opgestapeld.** Historie: het oude
`tests/test_accounts.json` (vaste `test1-4@indxr-test.com` + gedeeld wachtwoord) dreef stil weg (accounts
verwijderd, wachtwoord verlopen); de daaropvolgende per-run-provisioning (`e2e-<runId>-<n>@…`) loste de
drift op maar liet in 6 runs 24 accounts achter (teardown stond default uit). Beide zijn vervangen.

`global-setup.ts` bereidt nu een **VASTE POOL van 4 accounts** voor die één keer bestaan en BLIJVEN
bestaan (`helpers/provision.ts`, `preparePool`):

| Account | Rol |
|---------|-----|
| `e2e-1@indxr.ai` | auto-captions |
| `e2e-2@indxr.ai` | whisper |
| `e2e-3@indxr.ai` | playlist |
| `e2e-4@indxr.ai` | stress |

Per run, per poolaccount (find-or-create, self-healing):
- **Wachtwoord roteren** via `admin.updateUserById` (nieuw account → `createUser`). Per run gegenereerd,
  alleen in de ephemere, git-genegeerde `tests/playwright/.e2e-run-accounts.json` (die `config/accounts.ts`
  leest) — nergens duurzaam bewaard, dus geen drift/lek.
- **State reset**: prior-run-transcripts van DIT poolaccount wissen (strikt op eigen `user_id`; nooit een
  echte user — rule #227 gaat over ACCOUNTS, transcripts mogen); credits terug tot de startvloer (200) via
  de `add_credits`-RPC (nooit directe INSERT/UPDATE).
- `is_internal = true` + onboarding voltooid (`username` + `onboarding_completed`) → buiten de dashboards
  en geen `/dashboard`→`/onboarding`-bounce.

**Geen teardown, geen accumulatie** → rule #227 wordt niet eens benaderd (er wordt nooit een account
verwijderd). De `E2E_TEARDOWN`-flag en `global-teardown.ts` zijn verwijderd.

**Fallback** (geen service-role key): één vast account uit env-vars `E2E_FALLBACK_EMAIL` /
`E2E_FALLBACK_PASSWORD` / `E2E_FALLBACK_USER_ID`. Credentials dus uit env-vars, nooit uit een repo-bestand.
De service-role key + `NEXT_PUBLIC_SUPABASE_URL` komen uit env-vars (of, lokaal, repo-root `.env.local`).

**Parallelle runs:** Playwright draait hier serieel (`workers:1`, `fullyParallel:false`) en runs worden
handmatig één-voor-één gestart (single-dev repo). Twee GELIJKTIJDIGE `pnpm test:e2e`-invocaties zouden
op dezelfde 4 accounts racen (beide roteren wachtwoord + resetten) — dat scenario gebruikt deze repo
niet. Voor CI-sharding: geef elke shard een eigen pool-suffix (`e2e-<shard>-1..4`) via een env-var.

### Draaien

pnpm-isolatie hoist `@playwright/test`/`@supabase/supabase-js` niet naar de repo-root → `playwright test`
aan root faalt. Draai daarom via de shim:

```bash
BASE_URL=https://app.indxr.ai pnpm test:e2e specs/00-provisioning-smoke.spec.ts
```

`specs/00-provisioning-smoke.spec.ts` is de canary: bewijst dat een poolaccount inlogt en op
`/dashboard` blijft. Rood daar = authed-specs kunnen niet draaien.

> **Historie:** de oude `test1-4@indxr-test.com` bestonden 2026-09-13 niet meer in `auth.users`;
> `test_accounts.json` verwees naar opgeruimde accounts. Vervangen door bovenstaande provisioning.

## Playwright E2E-specs

Config: `playwright.config.ts` (`baseURL` default `http://localhost:3000`, override met `BASE_URL`).
Specs in `tests/playwright/specs/`. `global-setup.ts` topt credits bij (leest `.env.local` uit de root).

**Login is cookie-injectie, geen UI-formulier.** De headless UI-login (PKCE) is flaky en blijft niet
staan over navigaties heen. `helpers/auth.ts` → `loginAs()` mint daarom een Supabase-sessie via de
anon-client en injecteert de auth-cookie in de browsercontext (zelfde techniek als de prod-check).
Betrouwbaar tegen prod én lokaal; domein wordt afgeleid uit `BASE_URL`.

Draaien (tegen productie, met de pnpm-store op `NODE_PATH` zodat `@playwright/test` +
`@supabase/supabase-js` resolven):

```bash
ROOT="$(pwd)"
PW="$ROOT/node_modules/.pnpm/@playwright+test@1.59.1/node_modules"
SB="$ROOT/node_modules/.pnpm/@supabase+supabase-js@2.105.3/node_modules"
BASE_URL=https://app.indxr.ai NODE_PATH="$PW:$SB:$ROOT/apps/app/node_modules:$ROOT/node_modules" \
  node "$PW/@playwright/test/cli.js" test specs/03-library.spec.ts --reporter=list
```

Lokaal: start `pnpm dev:app` + backend, laat `BASE_URL` weg (of zet op `http://localhost:3001`).

> `npx playwright test` pakt soms de losse `playwright` package (v1.58, "unknown command test") — draai
> daarom via de `@playwright/test`-cli zoals hierboven.

## Herbruikbare headless productie-check

`tests/playwright/prod-check.cjs` (+ `.sh`-wrapper) drijft `app.indxr.ai` als een echte test-user
(cookie-injectie) en assert op de live DOM — geen dev-server nodig. Exporteert `withAuthedProd(fn)`
voor eigen ad-hoc checks (seed → assert → cleanup, RLS-scoped als de user). Zie de bestaande suite in
dat bestand voor het patroon.

## Twee-profiel-regel

Bij één profiel is fout niet te onderscheiden van juist. Isolatie-checks (Library toont alleen eigen
data, vreemd transcript-id onbereikbaar, collecties gescheiden) draai je altijd als een **tweede**
gebruiker (test2). RLS is de bron van waarheid; de UI is de dubbelcheck.
