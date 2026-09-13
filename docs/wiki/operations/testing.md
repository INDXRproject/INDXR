# Testen — accounts, Playwright, headless prod-checks

Praktische gids: hoe kom je aan werkende testaccounts en hoe draai je de E2E-specs +
de herbruikbare authenticated productie-check.

## Testaccounts — per-run provisioning (sinds 2026-09-13)

**Er worden GEEN wachtwoorden meer in de repo opgeslagen.** Het oude `tests/test_accounts.json`
(vaste `test1-4@indxr-test.com` + gedeeld wachtwoord) is **verlaten**: die accounts waren opgeruimd
uit `auth.users`, en een opgeslagen wachtwoord drift stil (een inlogfout is niet te onderscheiden van
een verwijderd account → check ALTIJD eerst `auth.users`). Zie [[docs/LESSONS.md]] 2026-09-13.

`global-setup.ts` provisioneert nu **per run** verse accounts via de admin-API
(`helpers/provision.ts`):

- `admin.createUser({ email, password, email_confirm: true })` met run-prefix
  `e2e-<runId>-<n>@indxr.ai`, één per rol (`auto-captions` / `whisper` / `playlist` / `stress`).
- Profiel gezet op `is_internal = true` (buiten de finance/growth-dashboards) + onboarding voltooid
  (`username` + `onboarding_completed = true` — anders bounce `/dashboard` → `/onboarding` en faalt
  elke spec) + 200 credits via de `add_credits`-RPC.
- Het wachtwoord wordt **per run gegenereerd** en staat alleen in de ephemere, git-genegeerde
  `tests/playwright/.e2e-run-accounts.json` (die `config/accounts.ts` per run leest — niet meer
  `test_accounts.json`).
- **Fallback** als de omgeving geen users kan aanmaken (geen service-role key): een vast account uit
  env-vars `E2E_FALLBACK_EMAIL` / `E2E_FALLBACK_PASSWORD` / `E2E_FALLBACK_USER_ID`. Credentials komen
  dus uit env-vars, nóóit uit een repo-bestand.

De service-role key + `NEXT_PUBLIC_SUPABASE_URL` komen uit env-vars (of, lokaal, repo-root `.env.local`).

### Draaien

pnpm-isolatie hoist `@playwright/test`/`@supabase/supabase-js` niet naar de repo-root → `playwright test`
aan root faalt. Draai daarom via de shim:

```bash
BASE_URL=https://app.indxr.ai pnpm test:e2e specs/00-provisioning-smoke.spec.ts
```

`specs/00-provisioning-smoke.spec.ts` is de canary: bewijst dat een verse account inlogt en op
`/dashboard` blijft. Rood daar = authed-specs kunnen niet draaien.

### Teardown (rule #227 — standaard UIT)

`global-teardown.ts` somt de aangemaakte accounts op en **verwijdert niets** tenzij `E2E_TEARDOWN=1`
expliciet gezet is. Aangemaakte `e2e-<runId>-*`-accounts zijn `is_internal=true` → ze vervuilen de
dashboards niet; opruimen doet Khidr bewust met de flag na controle van de geprinte lijst.

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
