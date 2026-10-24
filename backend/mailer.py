"""
Transactional email for the quick-checkout flow (growth-plan.md §6.2 Onderdeel B), sent directly
from the backend via Resend's HTTP API. Mirrors apps/app/src/lib/mail.ts's sendResend() graceful-
degradation pattern (missing env vars => no-op, never raises) rather than routing through Next.js —
the backend already owns the transcription-completion signal, so sending from here avoids a new
backend-to-frontend callback for something Resend's plain REST API handles in one POST.

Requires RESEND_API_KEY + RESEND_FROM set in the Railway environment (same names Next.js uses).
"""
import logging
import os

import httpx

logger = logging.getLogger("indxr-mailer")


def send_quick_checkout_ready_email(email: str, secure_links: list) -> None:
    """secure_links: list of {filename, url}. Best-effort — never raises; a failed email must not
    affect the already-completed, already-paid-for transcription."""
    api_key = os.getenv("RESEND_API_KEY")
    from_addr = os.getenv("RESEND_FROM")
    if not api_key or not from_addr or not secure_links:
        if not api_key or not from_addr:
            logger.warning("RESEND_API_KEY/RESEND_FROM not set on the backend — quick-checkout email skipped")
        return

    lines = ["Your transcript" + ("s are" if len(secure_links) > 1 else " is") + " ready.", ""]
    for link in secure_links:
        lines.append(f"{link['filename']}: {link['url']}")
    lines += ["", "These links are private to you — don't share them.", "", "— INDXR.AI"]

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            json={
                "from": from_addr,
                "to": email,
                "reply_to": "contact@indxr.ai",
                "subject": "Your INDXR.AI transcript is ready",
                "text": "\n".join(lines),
            },
            timeout=10.0,
        )
        if resp.status_code >= 300:
            logger.warning(f"[mailer] quick-checkout email non-ok: {resp.status_code}")
    except Exception as e:
        logger.warning(f"[mailer] quick-checkout email failed (non-blocking): {e}")
