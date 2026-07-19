// Minimal structural shape of the parts of a Sentry event we scrub. Kept dependency-free (no
// @sentry import) so packages/shared doesn't need @sentry/nextjs; a generic keeps it assignable to
// Sentry's `beforeSend` in both apps (the concrete ErrorEvent satisfies this shape).
type ScrubbableEvent = {
  user?: { ip_address?: unknown; email?: unknown; username?: unknown } | null
  request?: {
    cookies?: unknown
    data?: unknown
    headers?: Record<string, unknown>
  } | null
}

// Header names that must never reach Sentry (auth / tokens / secrets).
const SENSITIVE_HEADER = /^(authorization|cookie|proxy-authorization|x-backend-secret)$/i
const SENSITIVE_HEADER_SUFFIX = /(-token|-secret|-api-key)$/i

/**
 * `beforeSend` scrubber: errors stay fully intact (message/stacktrace), only PII is stripped —
 * user e-mail/IP/username, cookies, auth/token headers, and the request body (may carry transcript
 * text or e-mail addresses). This is scrubbing, NOT disabling: the event is always returned.
 */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T, _hint?: unknown): T {
  if (event.user) {
    delete event.user.ip_address
    delete event.user.email
    delete event.user.username
  }
  const req = event.request
  if (req) {
    delete req.cookies
    // Request body can contain personal data (transcript text, e-mails) → never send it.
    delete req.data
    if (req.headers) {
      for (const h of Object.keys(req.headers)) {
        if (SENSITIVE_HEADER.test(h) || SENSITIVE_HEADER_SUFFIX.test(h)) delete req.headers[h]
      }
    }
  }
  return event
}
