import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { notifyUser } from "@/lib/mail"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { id } = await params
  const { title, body } = await req.json()
  if (!title || !body || typeof title !== "string" || typeof body !== "string") {
    return NextResponse.json({ error: "title en body zijn verplicht." }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .select("user_id")
    .eq("id", id)
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: "Ticket niet gevonden." }, { status: 404 })
  }

  const { error } = await admin.from("messages").insert({
    user_id:     ticket.user_id,
    title,
    body,
    type:        "support",
    ticket_id:   id,
    sender_role: "admin",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // User notification — respects email_notifications opt-out (fail-safe)
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.indxr.ai"}/dashboard/messages?tab=support`
  await notifyUser({
    userId:  ticket.user_id,
    subject: `Re: ${title}`,
    appUrl,
  })

  return NextResponse.json({ success: true })
}
