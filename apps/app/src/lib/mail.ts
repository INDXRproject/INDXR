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
