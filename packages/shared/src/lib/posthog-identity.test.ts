// Runnable guard test for the PostHog identity bridge (ADR-103). No test runner in this repo — run with:
//   node --experimental-strip-types packages/shared/src/lib/posthog-identity.test.ts
//
// This proves the *plumbing* is correct (the right id travels, garbage is rejected, the strip is clean).
// It is NOT the end-to-end merge proof — that requires the live PostHog persons API (see
// scripts/verify-posthog-bridge.mjs and monitoring.md). Do not treat a green here as "the merge works".

import assert from "node:assert"
import { isValidDistinctId, appendPhDid, PH_DID_PARAM } from "./posthog-identity.ts"

// ── 1. The security-critical guard: only a real UUID passes. Anything else is rejected so a copied
//       link, a garbage value, or a foreign id can never alias two different people together.
assert.equal(isValidDistinctId("0192f8a1-3b4c-7d2e-8f10-abcdef123456"), true, "valid UUIDv7 passes")
assert.equal(isValidDistinctId("01a05db4-14b9-4a2c-8f10-000000000000"), true, "valid UUID passes")
assert.equal(isValidDistinctId(""), false, "empty fails")
assert.equal(isValidDistinctId(null), false, "null fails")
assert.equal(isValidDistinctId(undefined), false, "undefined fails")
assert.equal(isValidDistinctId("not-a-uuid"), false, "garbage fails")
assert.equal(isValidDistinctId("01a05db4-14b9"), false, "the truncated broken id from the export fails")
assert.equal(isValidDistinctId("0192f8a1-3b4c-7d2e-8f10-abcdef123456'; DROP TABLE"), false, "injection fails")
assert.equal(isValidDistinctId("0192f8a1-3b4c-7d2e-8f10-abcdef123456 x"), false, "trailing junk fails")
assert.equal(isValidDistinctId(12345), false, "non-string fails")

// ── 2. appendPhDid (the real login-bridge helper): a valid id is threaded onto the redirect target
//       (relative OR absolute); an invalid/absent one leaves the target untouched → no merge downstream.
const GOOD = "0192f8a1-3b4c-7d2e-8f10-abcdef123456"
assert.equal(
  appendPhDid("https://app.indxr.ai/dashboard", GOOD),
  "https://app.indxr.ai/dashboard?ph_did=0192f8a1-3b4c-7d2e-8f10-abcdef123456",
  "absolute target, no existing query → ?ph_did",
)
assert.equal(
  appendPhDid("/onboarding?next=%2Fbilling", GOOD),
  "/onboarding?next=%2Fbilling&ph_did=0192f8a1-3b4c-7d2e-8f10-abcdef123456",
  "relative target with existing query → &ph_did",
)
assert.equal(appendPhDid("/dashboard", "garbage"), "/dashboard", "invalid id → target untouched")
assert.equal(appendPhDid("/dashboard", "01a05db4-14b9"), "/dashboard", "truncated id → target untouched")
assert.equal(appendPhDid("/dashboard", null), "/dashboard", "absent id → target untouched")

// ── 3. The strip (mirror of the AuthContext replaceState): read on arrival, delete after use, other
//       params survive.
const arrived = new URL("https://app.indxr.ai/dashboard?next=/x&ph_did=" + GOOD)
assert.equal(arrived.searchParams.get(PH_DID_PARAM), GOOD, "id readable on arrival")
arrived.searchParams.delete(PH_DID_PARAM)
assert.equal(arrived.searchParams.has(PH_DID_PARAM), false, "id stripped after use")
assert.equal(arrived.searchParams.get("next"), "/x", "other params survive the strip")

console.log("✅ posthog-identity: guard + appendPhDid + strip — all assertions passed")
