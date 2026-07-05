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

  for (let i = 0; i < params.recipients.length; i += BATCH) {
    const chunk = params.recipients.slice(i, i + BATCH)
    const payload = chunk.map((r) => ({
      from,
      to: r.email,
      reply_to: "contact@indxr.ai",
      subject: params.subject,
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
