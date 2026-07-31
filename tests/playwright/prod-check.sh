#!/usr/bin/env bash
# Authenticated production DOM check. Resolves @playwright/test + @supabase/supabase-js from the
# pnpm store so the CJS script runs without installing anything. See prod-check.cjs for what it does.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PW="$(ls -d "$ROOT"/node_modules/.pnpm/@playwright+test@*/node_modules 2>/dev/null | head -1)"
NODE_PATH="$PW:$ROOT/apps/app/node_modules:$ROOT/node_modules" exec node "$ROOT/tests/playwright/prod-check.cjs" "$@"
