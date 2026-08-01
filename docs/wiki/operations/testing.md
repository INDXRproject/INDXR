# Testen — accounts, Playwright, headless prod-checks

Praktische gids: hoe kom je aan werkende testaccounts en hoe draai je de E2E-specs +
de herbruikbare authenticated productie-check.

## Testaccounts

`tests/test_accounts.json` (gitignored — **nooit committen**) bevat 4 accounts op het
`@indxr-test.com`-domein, wachtwoord `TestPassword123!`. Deze zijn geflagd als testaccount in de
admin (op `+test`/`@indxr-test.com`, ADR-056), dus ze vervuilen de finance/growth-cijfers niet.

| Account | Rol (config/accounts.ts) | Notitie |
|---------|--------------------------|---------|
| test1 | auto-captions | Het "hoofd"-account; heeft doorgaans data/credits |
| test2 | whisper | isolatie-tegenpartij |
| test3 | playlist | |
| test4 | stress | |

**Belangrijk:** `@indxr-test.com` heeft geen echte MX, dus **signup via de UI/anon-API weigert
Supabase het** ("Email address invalid"). Testaccounts worden daarom **admin-side** aangemaakt met
`admin.createUser({ email, password, email_confirm: true })` — dat accepteert het domein wél en zet
de mailbevestiging meteen goed.

### Accounts kwijt of wachtwoord onbekend? Opnieuw aanmaken

Als een account niet meer bestaat (verwijderd) of het wachtwoord is geroteerd, maak het opnieuw aan
met de service-role key. Minimaal script:

```js
const { createClient } = require("@supabase/supabase-js");
// URL + SUPABASE_SERVICE_ROLE_KEY uit .env.local (root)
const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const { data } = await admin.auth.admin.createUser({
  email: "test2@indxr-test.com", password: "TestPassword123!", email_confirm: true,
});
// credits materialiseren via de RPC (nooit direct INSERT):
await admin.rpc("add_credits", { p_user_id: data.user.id, p_amount: 50, p_reason: "Test account seed" });
```

Werk daarna **`tests/test_accounts.json`** bij met het nieuwe `user_id` (de `config/accounts.ts`-loader
leest die file). `global-setup.ts` topt bij elke run credits bij tot ≥ 50; als een `user_id` niet meer
in `auth.users` bestaat faalt die top-up met een FK-error op `user_credits_user_id_fkey` — dat is de
tell dat het account opnieuw aangemaakt moet worden.

> **Historie:** test2–4 waren 2026-08-01 verwijderd (FK-fout in global-setup) en zijn toen opnieuw
> aangemaakt met bovenstaand recept. test1 (`f136104d-…`) is al die tijd blijven bestaan.

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
