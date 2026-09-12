#!/usr/bin/env node
/**
 * E2E runner shim. In this pnpm workspace neither @playwright/test nor @supabase/supabase-js is
 * hoisted to the repo-root node_modules, so `playwright test` at root can't load playwright.config.ts
 * (which imports @playwright/test) or the specs (which import @supabase/supabase-js). This resolves
 * both from the pnpm store and runs the @playwright/test CLI with a NODE_PATH that satisfies them —
 * version-agnostic, no install required.
 *
 * Usage:  node tests/playwright/e2e-runner.mjs [playwright test args…]
 *   BASE_URL=https://app.indxr.ai node tests/playwright/e2e-runner.mjs specs/00-provisioning-smoke.spec.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in env or repo-root .env.local so
 * global-setup can provision accounts (see helpers/provision.ts).
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PNPM = path.join(ROOT, 'node_modules', '.pnpm')

function findPkgDir(prefix) {
  // e.g. prefix '@playwright+test@' → node_modules/.pnpm/@playwright+test@1.59.1/node_modules
  const match = fs.readdirSync(PNPM).find((d) => d.startsWith(prefix))
  if (!match) throw new Error(`could not find ${prefix}* in ${PNPM} — run pnpm install`)
  return path.join(PNPM, match, 'node_modules')
}

const pwTest = findPkgDir('@playwright+test@')
const sbJs = findPkgDir('@supabase+supabase-js@')
const cli = path.join(pwTest, '@playwright', 'test', 'cli.js')

const res = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${pwTest}${path.delimiter}${sbJs}` },
})
process.exit(res.status ?? 1)
