import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { notifyAdmin } from "@/lib/mail"
import { z } from "zod"

const Schema = z.object({
  body: z.string().min(1).max(5000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: ticketId } = await params

  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { body } = parsed.data

  // Fetch ticket via user client — RLS ensures user only sees own tickets
  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .select("id, category, subject, status")
    .eq("id", ticketId)
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  }
  if (ticket.status !== "open") {
    return NextResponse.json({ error: "Ticket is closed" }, { status: 409 })
  }

  // Insert reply via admin client (no user INSERT policy on messages)
  const admin = createAdminClient()
  const { error: insertErr } = await admin.from("messages").insert({
    user_id:     user.id,
    title:       `Re: ${ticket.subject}`,
    body,
    type:        "support",
    ticket_id:   ticketId,
    sender_role: "user",
  })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Notify admin — fail-safe
  try {
    await notifyAdmin({
      ticketId,
      category:  ticket.category,
      subject:   `[User reply] ${ticket.subject}`,
      body,
      userEmail: user.email ?? "(no email)",
    })
  } catch {
    // non-blocking
  }

  return NextResponse.json({ success: true })
}
