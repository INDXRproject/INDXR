// Maps Supabase Auth password errors to readable, inline copy — never a raw provider string.
//
// Why this exists (ADR: supabase-security-audit, 2026-09-02): when "leaked password protection"
// (HaveIBeenPwned) is enabled on the Supabase project, GoTrue rejects a compromised password with
// an AuthWeakPasswordError (code 'weak_password', reasons include 'pwned') on BOTH signUp AND
// updateUser({ password }). That means /reset-password and the logged-in change-password card get
// the same rejection as signup — so all three surfaces must translate it into human copy, or a
// user in the middle of the Ads campaign hits a cryptic string and silently churns.

type MaybeAuthError = { code?: string | null; message?: string | null } | null | undefined

const LEAKED_MSG =
  "That password has appeared in a known data breach, so it can’t be used. Please choose a different, unique password."

// True for the HIBP / weak-password rejection specifically. Kept separate so signup can override
// only this case and leave its other error messages (rate-limit, already-exists) untouched.
export function leakedPasswordMessage(error: MaybeAuthError): string | null {
  if (!error) return null
  const code = (error.code ?? "").toLowerCase()
  const msg = (error.message ?? "").toLowerCase()
  if (code === "weak_password" || /pwned|leaked|compromis|data breach|known to be weak/.test(msg)) {
    return LEAKED_MSG
  }
  return null
}

// Full mapper for the password-set surfaces (reset-password, change-password). ALWAYS returns a
// friendly string — the raw Supabase message is never shown.
export function mapPasswordError(error: MaybeAuthError): string {
  const leaked = leakedPasswordMessage(error)
  if (leaked) return leaked
  const code = (error?.code ?? "").toLowerCase()
  const msg = (error?.message ?? "").toLowerCase()
  if (code === "same_password" || /different from the old|should be different/.test(msg)) {
    return "Your new password must be different from your current one."
  }
  if (/at least.*character|too short|minimum length/.test(msg)) {
    return "Password is too short — please use at least 8 characters."
  }
  if (/session|expired|not authenticated|auth session missing/.test(msg)) {
    return "Your reset link has expired. Please request a new one and try again."
  }
  return "We couldn’t update your password. Please try a different one."
}
