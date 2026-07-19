"""Sentry before_send scrubber for the Python backend.

Errors stay fully intact (message/stacktrace) — only PII is removed: user e-mail/IP/username,
request cookies, auth/token/secret headers, and the request body (which may carry transcript text
or e-mail addresses). This is scrubbing, NOT disabling: the event is always returned.
"""


def sentry_scrub(event, hint):
    try:
        user = event.get("user")
        if isinstance(user, dict):
            for k in ("email", "ip_address", "username"):
                user.pop(k, None)

        req = event.get("request")
        if isinstance(req, dict):
            req.pop("cookies", None)
            # Request body can contain personal data (transcript text, e-mails) → never send it.
            req.pop("data", None)
            headers = req.get("headers")
            if isinstance(headers, dict):
                for h in list(headers.keys()):
                    hl = h.lower()
                    if (hl in ("authorization", "cookie", "proxy-authorization", "x-backend-secret")
                            or hl.endswith("-token") or hl.endswith("-secret") or hl.endswith("-api-key")):
                        headers.pop(h, None)
    except Exception:
        # A scrubber must never break error reporting; on any issue, send the event unchanged.
        pass
    return event
