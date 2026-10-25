"""
Transactional email for the quick-checkout flow (growth-plan.md §6.2 Onderdeel B), sent directly
from the backend via Resend's HTTP API. Mirrors apps/app/src/lib/mail.ts's sendResend() graceful-
degradation pattern (missing env vars => no-op, never raises) rather than routing through Next.js —
the backend already owns the transcription-completion signal, so sending from here avoids a new
backend-to-frontend callback for something Resend's plain REST API handles in one POST.

Requires RESEND_API_KEY + RESEND_FROM set in the Railway environment (same names Next.js uses).
"""
import html
import logging
import os

import httpx

logger = logging.getLogger("indxr-mailer")

# Same brand constants as the house style (docs/email-templates/reset-password.html,
# apps/app/src/lib/mail.ts renderBroadcastEmailHtml) — hex translations of tokens.css
# OKLCH light-mode values, web-safe font stack (email clients strip custom fonts/CSS).
_EMAIL_FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
_LOGO_URL = "https://app.indxr.ai/logo/indxr-wordmark-white-transparent.png"
_WITHDRAWAL_NOTICE = (
    "As confirmed at checkout, you asked us to start right away, so your 14-day right of "
    "withdrawal on this purchase ended once your transcript was delivered."
)


def _render_html(secure_links: list) -> str:
    plural = len(secure_links) > 1
    heading = "Your transcripts are ready" if plural else "Your transcript is ready"
    intro = (
        "All your files have been transcribed. Download them below — these links are private to "
        "you, so don't share them."
        if plural
        else "Your file has been transcribed. Download it below — this link is private to you, so "
        "don't share it."
    )

    buttons = ""
    for link in secure_links:
        filename = html.escape(str(link["filename"]))
        url = html.escape(str(link["url"]), quote=True)
        buttons += f"""
        <tr>
          <td style="padding:8px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" bgcolor="#141414" style="border-radius:8px;">
                  <a href="{url}" target="_blank" style="display:block;padding:13px 28px;font-family:{_EMAIL_FONT};font-size:15px;font-weight:600;line-height:1.3;color:#ffffff;text-decoration:none;border-radius:8px;">Download &mdash; {filename}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
</head>
<body style="margin:0;padding:0;color-scheme:light dark;background-color:#fcfaf7;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fcfaf7;opacity:0;">{heading}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf7;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #dbd7d2;border-radius:12px;overflow:hidden;font-family:{_EMAIL_FONT};">
        <tr>
          <td style="padding:24px 32px;background-color:#141414;border-top-left-radius:12px;border-top-right-radius:12px;">
            <img src="{_LOGO_URL}" alt="INDXR.AI" height="28" style="height:28px;width:auto;display:block;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0 32px;">
            <div style="height:3px;width:44px;background-color:#d79628;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px 32px;color:#27231f;font-family:{_EMAIL_FONT};">
            <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:600;color:#27231f;">{heading}</h1>
            <p style="margin:0;font-size:16px;line-height:1.6;">{intro}</p>
          </td>
        </tr>
        {buttons}
        <tr>
          <td style="padding:16px 32px 8px 32px;color:#27231f;font-family:{_EMAIL_FONT};font-size:14px;line-height:1.6;">
            <p style="margin:0;">{_WITHDRAWAL_NOTICE}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px 32px;">
            <div style="border-top:1px solid #dbd7d2;padding-top:16px;color:#77726d;font-family:{_EMAIL_FONT};font-size:13px;line-height:1.5;">
              You're receiving this because you requested a transcript from INDXR.AI's quick checkout.<br />
              Read our <a href="https://indxr.ai/privacy" style="color:#643400;text-decoration:underline;">Privacy Policy</a>.
            </div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <tr>
          <td align="center" style="padding:16px 32px;color:#77726d;font-family:{_EMAIL_FONT};font-size:12px;line-height:1.5;">
            INDXR.AI &mdash; YouTube transcripts &amp; summaries
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def _render_text(secure_links: list) -> str:
    lines = ["Your transcript" + ("s are" if len(secure_links) > 1 else " is") + " ready.", ""]
    for link in secure_links:
        lines.append(f"{link['filename']}: {link['url']}")
    lines += [
        "",
        "These links are private to you — don't share them.",
        "",
        _WITHDRAWAL_NOTICE,
        "",
        "— INDXR.AI",
    ]
    return "\n".join(lines)


def send_quick_checkout_ready_email(email: str, secure_links: list) -> None:
    """secure_links: list of {filename, url}. Best-effort — never raises; a failed email must not
    affect the already-completed, already-paid-for transcription."""
    api_key = os.getenv("RESEND_API_KEY")
    from_addr = os.getenv("RESEND_FROM")
    if not api_key or not from_addr or not secure_links:
        if not api_key or not from_addr:
            logger.warning("RESEND_API_KEY/RESEND_FROM not set on the backend — quick-checkout email skipped")
        return

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            json={
                "from": from_addr,
                "to": email,
                "reply_to": "contact@indxr.ai",
                "subject": "Your INDXR.AI transcript is ready",
                "html": _render_html(secure_links),
                "text": _render_text(secure_links),
            },
            timeout=10.0,
        )
        if resp.status_code >= 300:
            logger.warning(f"[mailer] quick-checkout email non-ok: {resp.status_code}")
    except Exception as e:
        logger.warning(f"[mailer] quick-checkout email failed (non-blocking): {e}")
