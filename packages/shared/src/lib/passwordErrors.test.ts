// Runnable test for the password-error mapper. No test runner in this repo — run with:
//   node --experimental-strip-types packages/shared/src/lib/passwordErrors.test.ts
//
// Proves both outcomes of the HIBP flow at the app layer: a leaked/weak-password rejection becomes
// readable copy (used by signup + reset-password + change-password), and no branch ever leaks the
// raw Supabase string.

import assert from "node:assert"
import { leakedPasswordMessage, mapPasswordError } from "./passwordErrors.ts"

const RAW_HIBP = "Password is known to be weak and easy to guess, please choose a different one."

// ── 1. The leaked/weak-password rejection (HIBP) → friendly copy, on both the code and message shapes.
assert.equal(
  leakedPasswordMessage({ code: "weak_password", message: RAW_HIBP })?.includes("data breach"),
  true,
  "weak_password code maps to the breach copy",
)
assert.equal(
  leakedPasswordMessage({ message: "This password has been found in a data breach (pwned)." })?.includes("data breach"),
  true,
  "pwned message maps even without the code",
)
assert.equal(leakedPasswordMessage({ code: "over_email_send_rate_limit", message: "rate limited" }), null,
  "a non-password error is NOT treated as leaked (signup keeps its own message)")
assert.equal(leakedPasswordMessage(null), null, "null is safe")

// ── 2. mapPasswordError ALWAYS returns friendly copy — never the raw provider string.
assert.equal(mapPasswordError({ code: "weak_password", message: RAW_HIBP }).includes("data breach"), true,
  "reset/change surface maps the leaked case")
assert.notEqual(mapPasswordError({ message: RAW_HIBP }), RAW_HIBP, "raw Supabase string is never surfaced")
assert.equal(mapPasswordError({ code: "same_password", message: "New password should be different from the old password." }),
  "Your new password must be different from your current one.", "same_password mapped")
assert.equal(mapPasswordError({ message: "Password should be at least 8 characters." }),
  "Password is too short — please use at least 8 characters.", "too-short mapped")
assert.equal(mapPasswordError({ message: "Auth session missing!" }),
  "Your reset link has expired. Please request a new one and try again.", "expired session mapped")
assert.equal(mapPasswordError({ message: "some unknown provider text" }),
  "We couldn’t update your password. Please try a different one.", "unknown → generic friendly fallback, not raw")

console.log("passwordErrors: ALL ASSERTS GREEN")
