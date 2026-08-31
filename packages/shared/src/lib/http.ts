// Safe fetch-response reader (ADR-079/080 follow-up). A missing Next.js route returns the HTML
// error page, and calling res.json() on it throws a raw "Unexpected token '<', <!DOCTYPE" SyntaxError
// that used to land verbatim in the UI (the marketing playlist bug). Never JSON.parse a response
// without checking status + content-type first: on a non-JSON body this throws a typed ResponseError
// carrying a stable `code`, so callers land on a clean message / ErrorCard with a visible code instead.
export class ResponseError extends Error {
  code: string
  status: number
  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = "ResponseError"
    this.code = code
    this.status = status
  }
}

/**
 * Read a fetch Response as JSON. If the body is not JSON (an HTML error page, a proxy error, an
 * empty 404), throw a ResponseError with a code (`http_<status>` for a non-ok response, else
 * `unexpected_response`) rather than a raw SyntaxError. A JSON body is returned as-is even on a
 * non-ok status, so callers keep their own `if (!res.ok)` handling for structured backend errors.
 */
export async function readJson<T = unknown>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    // Drain the body so the connection can be reused; we deliberately discard the HTML.
    await res.text().catch(() => "")
    throw new ResponseError(
      `The server returned an unexpected response (HTTP ${res.status}).`,
      res.ok ? "unexpected_response" : `http_${res.status}`,
      res.status,
    )
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new ResponseError(
      "The server returned an unreadable response.",
      "unexpected_response",
      res.status,
    )
  }
}
