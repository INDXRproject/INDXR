import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

async function sendResend(payload: Record<string, unknown>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM
  if (!apiKey || !from) return
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body:    JSON.stringify({ from, ...payload }),
    })
    if (!res.ok) console.warn("[mail] resend non-ok:", res.status)
  } catch (err) {
    console.warn("[mail] resend failed (non-blocking):", err)
  }
}

// Notify admin (contact@indxr.ai) on new ticket. Always sent if env vars present.
export async function notifyAdmin(params: {
  ticketId: string
  category: string
  subject:  string
  body:     string
  userEmail: string
}): Promise<void> {
  await sendResend({
    to:       "contact@indxr.ai",
    reply_to: params.userEmail,
    subject:  `[INDXR Support] ${params.category} — ${params.subject}`,
    text:     `New support ticket (#${params.ticketId})\n\nCategory: ${params.category}\nUser: ${params.userEmail}\n\n${params.body}`,
  })
}

// ── Email-safe HTML template (broadcast) ────────────────────────────────────
// Email clients (Gmail/Outlook/Apple Mail) strip <style> blocks, ignore
// flexbox/grid, drop custom fonts and don't support OKLCH. So: table-based
// layout, every style inline, web-safe font stack, brand colours as hex
// (translated from tokens.css OKLCH light-mode values), and a plain-text
// fallback is always sent alongside (see the `text` field in the payload).
const EMAIL_FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Admin types a plain-text message → render as escaped paragraphs, preserving
// blank-line paragraph breaks and single line breaks.
function bodyToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p style="margin:0 0 16px 0;">${escapeHtml(para).replace(/\n/g, "<br />")}</p>`,
    )
    .join("")
}

// Full branded, email-safe HTML. The footer variant is driven purely by
// `includeUnsubscribe` (the same flag the send-route already passes): marketing
// gets an "Unsubscribe" text-link (raw token URL hidden behind the word);
// service gets a privacy-policy link and no unsubscribe.
function renderBroadcastEmailHtml(params: {
  bodyText: string
  includeUnsubscribe: boolean
  unsubscribeUrl?: string
  logoUrl: string
  privacyUrl: string
}): string {
  const { bodyText, includeUnsubscribe, unsubscribeUrl, logoUrl, privacyUrl } = params

  const footer =
    includeUnsubscribe && unsubscribeUrl
      ? `You're receiving this because you have an INDXR.AI account.<br />` +
        `<a href="${unsubscribeUrl}" style="color:#643400;text-decoration:underline;">Unsubscribe</a> from these emails.`
      : `You're receiving this account notification from INDXR.AI.<br />` +
        `Read our <a href="${privacyUrl}" style="color:#643400;text-decoration:underline;">Privacy Policy</a>.`

  // Wrapped in a full document so the <head> can carry color-scheme declarations
  // (light dark) — these tell Gmail/Apple Mail that dark mode is handled and damp
  // aggressive full-inversion. Images are never inverted by clients, so the logo
  // sits on a genuine-dark (#141414, not pure #000 which Apple Mail auto-flips)
  // header bar with the WHITE wordmark — readable in both light and dark mode.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
</head>
<body style="margin:0;padding:0;color-scheme:light dark;background-color:#fcfaf7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf7;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #dbd7d2;border-radius:12px;overflow:hidden;font-family:${EMAIL_FONT};">
        <tr>
          <td style="padding:24px 32px;background-color:#141414;border-top-left-radius:12px;border-top-right-radius:12px;">
            <img src="${logoUrl}" alt="INDXR.AI" height="28" style="height:28px;width:auto;display:block;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0 32px;">
            <div style="height:3px;width:44px;background-color:#d79628;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px 32px;color:#27231f;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;">
            ${bodyToHtmlParagraphs(bodyText)}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px 32px;">
            <div style="border-top:1px solid #dbd7d2;padding-top:16px;color:#77726d;font-family:${EMAIL_FONT};font-size:13px;line-height:1.5;">
              ${footer}
            </div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <tr>
          <td align="center" style="padding:16px 32px;color:#77726d;font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;">
            INDXR.AI &mdash; YouTube transcripts &amp; summaries
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// Broadcast email sent via Resend's batch endpoint (<=100 messages/call) with a
// throttle between batches so a large send never hits the API — or the domain
// reputation — in one burst. Two legal flavours, driven by `includeUnsubscribe`:
//   • marketing (includeUnsubscribe=true): consent-based, MUST carry the
//     unsubscribe footer + List-Unsubscribe header. Callers MUST have already
//     filtered out marketing-unsubscribed recipients (honours
//     marketing_unsubscribed, NOT email_notifications).
//   • service (includeUnsubscribe=false): legitimate-interest account/outage
//     notices to everyone — no unsubscribe footer, no List-Unsubscribe header,
//     and MUST NOT contain promotional content (that would make it marketing).
// Deliberately separate from notifyUser (transactional support mail).
export async function sendBroadcastEmails(params: {
  recipients: { email: string; unsubscribeUrl?: string }[]
  subject: string
  body: string
  includeUnsubscribe: boolean
}): Promise<{ sent: number; failed: number }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) return { sent: 0, failed: params.recipients.length }

  let sent = 0
  let failed = 0
  const BATCH = 100
  const THROTTLE_MS = 600

  // Absolute asset URLs (email can't resolve relative paths). WHITE wordmark on a
  // dark header bar so it reads in both light and dark mode (images aren't
  // inverted by clients). Same env fallbacks the send-route uses.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.indxr.ai"
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://indxr.ai"
  const logoUrl = `${appUrl}/logo/indxr-wordmark-white-transparent.png`
  const privacyUrl = `${marketingUrl}/privacy`

  for (let i = 0; i < params.recipients.length; i += BATCH) {
    const chunk = params.recipients.slice(i, i + BATCH)
    const payload = chunk.map((r) => ({
      from,
      to: r.email,
      reply_to: "contact@indxr.ai",
      subject: params.subject,
      html: renderBroadcastEmailHtml({
        bodyText: params.body,
        includeUnsubscribe: params.includeUnsubscribe,
        unsubscribeUrl: r.unsubscribeUrl,
        logoUrl,
        privacyUrl,
      }),
      // Plain-text fallback (required by some clients/spam filters). Marketing
      // shows the unsubscribe URL in text (a link can't hide behind a word here);
      // service sends the bare body.
      text: params.includeUnsubscribe && r.unsubscribeUrl
        ? [
            params.body,
            "",
            "—",
            "You're receiving this because you have an INDXR.AI account.",
            `Unsubscribe from broadcast emails: ${r.unsubscribeUrl}`,
          ].join("\n")
        : params.body,
      ...(params.includeUnsubscribe && r.unsubscribeUrl
        ? { headers: { "List-Unsubscribe": `<${r.unsubscribeUrl}>` } }
        : {}),
    }))
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        sent += chunk.length
      } else {
        failed += chunk.length
        console.warn("[mail] broadcast batch non-ok:", res.status)
      }
    } catch (err) {
      failed += chunk.length
      console.warn("[mail] broadcast batch failed (non-blocking):", err)
    }
    if (i + BATCH < params.recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS))
    }
  }
  return { sent, failed }
}

// Notify user on admin reply. Respects email_notifications opt-out.
export async function notifyUser(params: {
  userId:  string
  subject: string
  appUrl:  string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM
  if (!apiKey || !from) return

  try {
    const admin = createAdminClient()

    const [{ data: profile }, { data: authData }] = await Promise.all([
      admin.from("profiles").select("email_notifications").eq("id", params.userId).single(),
      admin.auth.admin.getUserById(params.userId),
    ])

    if (!profile?.email_notifications) return

    const userEmail = authData.user?.email
    if (!userEmail) return

    await sendResend({
      to:       userEmail,
      reply_to: "contact@indxr.ai",
      subject:  params.subject,
      text: [
        "You've received a reply on your support ticket.",
        "",
        "View the reply in the app:",
        params.appUrl,
        "",
        "You're receiving this email because you have email notifications enabled.",
        "You can turn this off in your app settings.",
        "",
        "Please reply through the app — it keeps the conversation in one place.",
      ].join("\n"),
    })
  } catch (err) {
    console.warn("[mail] notifyUser failed (non-blocking):", err)
  }
}
