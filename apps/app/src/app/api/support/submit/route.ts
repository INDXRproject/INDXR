import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { notifyAdmin } from "@/lib/mail"

const schema = z.object({
  category:        z.enum(["feedback", "billing", "bug"]),
  subject:         z.string().min(1).max(200),
  body:            z.string().min(1).max(5000),
  transcript_id:   z.string().uuid().optional(),
  attachment_path: z.string().max(256).optional(),
})

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  rate_limit_exceeded: { status: 429, message: "You can submit up to 5 tickets per hour. Please try again later." },
  transcript_not_found: { status: 400, message: "We couldn't find that transcript on your account." },
  invalid_attachment:   { status: 400, message: "That attachment isn't valid." },
  not_authenticated:    { status: 401, message: "You need to be signed in to do this." },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "You need to be signed in to do this." }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Some of the details don't look right. Please check and try again.", details: parsed.error.flatten() }, { status: 400 })
  }

  const { category, subject, body: ticketBody, transcript_id, attachment_path } = parsed.data

  // Defense in depth: an attachment path must live in the caller's own storage folder
  // (the RPC re-checks this too).
  if (attachment_path && !attachment_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "That attachment isn't valid." }, { status: 400 })
  }

  const { data: ticketId, error } = await supabase.rpc("submit_support_ticket", {
    p_category:        category,
    p_subject:         subject,
    p_body:            ticketBody,
    p_transcript_id:   transcript_id ?? null,
    p_attachment_path: attachment_path ?? null,
  })

  if (error) {
    const known = Object.entries(RPC_ERRORS).find(([key]) => error.message.includes(key))
    if (known) return NextResponse.json({ error: known[1].message }, { status: known[1].status })
    console.error("[support/submit] rpc error:", error.message)
    return NextResponse.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 })
  }

  // Admin notification — fail-safe, no user opt-out (this goes to contact@indxr.ai)
  await notifyAdmin({
    ticketId:  String(ticketId),
    category,
    subject,
    body:      ticketBody,
    userEmail: user.email ?? "",
  })

  return NextResponse.json({ ticketId })
}
