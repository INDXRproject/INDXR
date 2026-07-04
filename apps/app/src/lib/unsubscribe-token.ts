import crypto from "crypto"

// HMAC-signed unsubscribe token. The user id is embedded (base64url) and signed,
// so a token cannot be forged for another user without the secret — editing the
// URL to target someone else's account fails signature verification. No stored
// token column is needed, so it works uniformly even for users that have no
// profiles row yet. Falls back to the service-role key as the HMAC secret when a
// dedicated UNSUBSCRIBE_SECRET is not set (both are server-only, never exposed).
function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
}

export function signUnsubscribe(userId: string): string {
  const sig = crypto.createHmac("sha256", secret()).update(userId).digest("base64url")
  return `${Buffer.from(userId).toString("base64url")}.${sig}`
}

export function verifyUnsubscribe(token: string): string | null {
  const parts = (token || "").split(".")
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  let userId: string
  try {
    userId = Buffer.from(parts[0], "base64url").toString("utf8")
  } catch {
    return null
  }
  if (!userId) return null
  const expected = crypto.createHmac("sha256", secret()).update(userId).digest("base64url")
  const a = Buffer.from(parts[1])
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  return userId
}
