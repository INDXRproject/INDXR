import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { resolveRecipients, type BroadcastTarget } from "@/lib/broadcast"
import { sendBroadcastEmails } from "@/lib/mail"
import { signUnsubscribe } from "@/lib/unsubscribe-token"

// A broadcast can email the whole user base — give the batched email loop room.
export const maxDuration = 300

const TARGETS: BroadcastTarget[] = ["all", "paid", "free", "manual"]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { title, body, target, manualIds, sendEmail, confirmCount } = await req.json().catch(() => ({}))

  if (!title || typeof title !== "string" || !body || typeof body !== "string") {
    return NextResponse.json({ error: "title en body zijn verplicht." }, { status: 400 })
  }
  if (!TARGETS.includes(target)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 })
  }
  if (typeof confirmCount !== "number") {
    return NextResponse.json({ error: "confirmCount is verplicht (bevestigingsstap)." }, { status: 400 })
  }

  const admin = createAdminClient()

  let recipients
  try {
    recipients = await resolveRecipients(admin, target, Array.isArray(manualIds) ? manualIds : [])
  } catch (err) {
    console.error("[broadcast] resolve failed", err)
    return NextResponse.json({ error: "Failed to resolve recipients" }, { status: 500 })
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients for this target." }, { status: 400 })
  }

  // Confirmation gate: the admin confirmed an exact count; refuse to send if the
  // freshly-resolved set no longer matches (cohort changed between preview and send).
  if (recipients.length !== confirmCount) {
    return NextResponse.json(
      { error: "Recipient count changed since confirmation. Re-check the count and confirm again.", actual: recipients.length },
      { status: 409 },
    )
  }

  // ── In-app channel: one messages row per recipient (always) ────────────────
  const rows = recipients.map((r) => ({
    user_id: r.id,
    title,
    body,
    type: "system",
    ticket_id: null,
    sender_role: "admin",
  }))
  let inserted = 0
  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await admin.from("messages").insert(chunk)
    if (error) {
      console.error("[broadcast] messages insert failed", error)
      return NextResponse.json(
        { error: `In-app delivery failed after ${inserted} messages: ${error.message}` },
        { status: 500 },
      )
    }
    inserted += chunk.length
  }

  // ── Email channel (optional) ───────────────────────────────────────────────
  let emailed = 0
  let emailFailed = 0
  let skippedUnsubscribed = 0
  if (sendEmail === true) {
    // Honour marketing_unsubscribed (NOT email_notifications — that's support mail).
    // A missing profiles row means the user has never opted out → still emailed.
    const ids = recipients.map((r) => r.id)
    const unsubscribed = new Set<string>()
    for (let i = 0; i < ids.length; i += 1000) {
      const idChunk = ids.slice(i, i + 1000)
      const { data } = await admin
        .from("profiles")
        .select("id, marketing_unsubscribed")
        .in("id", idChunk)
      for (const p of data ?? []) {
        if ((p as { marketing_unsubscribed?: boolean }).marketing_unsubscribed) {
          unsubscribed.add((p as { id: string }).id)
        }
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.indxr.ai"
    const emailRecipients = recipients
      .filter((r) => r.email && !unsubscribed.has(r.id))
      .map((r) => ({
        email: r.email as string,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=${encodeURIComponent(signUnsubscribe(r.id))}`,
      }))
    skippedUnsubscribed = recipients.filter((r) => r.email && unsubscribed.has(r.id)).length

    const result = await sendBroadcastEmails({ recipients: emailRecipients, subject: title, body })
    emailed = result.sent
    emailFailed = result.failed
  }

  return NextResponse.json({
    success: true,
    recipients: recipients.length,
    inApp: inserted,
    email: { requested: sendEmail === true, sent: emailed, failed: emailFailed, skippedUnsubscribed },
  })
}
