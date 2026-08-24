#!/usr/bin/env bash
# Enforce the shared playlist free-slots fixture across BOTH languages.
#
# The Python helper (backend/credit_manager.playlist_free_ids) and the TS helper
# (packages/shared/src/lib/pricing.playlistFreeIds) must agree — a divergence would
# make the reservation (Python) and the receipt/UI (TS) disagree about which videos
# are free, i.e. an over/under-charge. Both read test-fixtures/playlist_free_slots.json.
#
# There is NO CI in this repo, so nothing runs these two tests automatically. This
# script IS the enforcement: run it as part of the verification gate before committing
# a change that touches the free-slots rule, the reservation, or the receipt.
#
#   Run:  ./scripts/check-playlist-free-slots.sh
#   CI:   none — invoked manually per CLAUDE.md "Verification gates".
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "── Python fixture test (backend/test_playlist_free_slots.py) ──"
( cd backend && venv/bin/python3 test_playlist_free_slots.py )

echo
echo "── TypeScript fixture test (packages/shared/src/hooks/receiptAggregation.test.ts) ──"
node --experimental-strip-types packages/shared/src/hooks/receiptAggregation.test.ts

echo
echo "✅ Both fixture tests passed — Python and TS free-slots helpers agree."
