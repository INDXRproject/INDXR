#!/usr/bin/env bash
# Enforce the shared playlist invariants across BOTH languages: the free-slots fixture AND the hard
# playlist/job limits. Python and TS must agree, and (for the limits) the TS mirror must match the
# backend enforcer.
#
#   1. Free slots — backend/credit_manager.playlist_free_ids vs packages/shared/src/lib/pricing.
#      playlistFreeIds, both against test-fixtures/playlist_free_slots.json. A divergence would make
#      the reservation (Python) and the receipt/UI (TS) disagree about which videos are free.
#   2. Hard limits — the backend literals (backend/main.py MAX_PLAYLIST_VIDEOS + MAX_CONCURRENT_JOBS,
#      backend/transcription_pipeline.py MAX_TRANSCRIPTION_SECONDS) and the TS mirror
#      packages/shared/src/lib/limits.ts, both against test-fixtures/playlist_limits.json. A divergence
#      would let the article / docs / app UI show a limit the backend does not actually enforce.
#
# There is NO CI in this repo, so nothing runs these tests automatically. This script IS the
# enforcement: run it as part of the verification gate before committing a change that touches the
# free-slots rule, the reservation/receipt, or any of the four hard limits.
#
#   Run:  ./scripts/check-playlist-free-slots.sh
#   CI:   none — invoked manually per CLAUDE.md "Verification gates".
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "── Free slots · Python (backend/test_playlist_free_slots.py) ──"
( cd backend && venv/bin/python3 test_playlist_free_slots.py )

echo
echo "── Free slots · TypeScript (packages/shared/src/hooks/receiptAggregation.test.ts) ──"
node --experimental-strip-types packages/shared/src/hooks/receiptAggregation.test.ts

echo
echo "── Hard limits · Python vs backend (backend/test_playlist_limits.py) ──"
( cd backend && venv/bin/python3 test_playlist_limits.py )

echo
echo "── Hard limits · TypeScript mirror (packages/shared/src/lib/limits.test.ts) ──"
node --experimental-strip-types packages/shared/src/lib/limits.test.ts

echo
echo "✅ All playlist invariants agree — free-slots helpers and the four hard limits are in sync."
