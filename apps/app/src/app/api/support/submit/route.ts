import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { notifyAdmin } from "@/lib/mail"

const schema = z.object({
  category:      z.enum(["feedback", "billing", "bug"]),
  subject:       z.string().min(1).max(200),
  body:          z.string().min(1).max(5000),
  transcript_id: z.string().uuid().optional(),
})

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  rate_limit_exceeded: { status: 429, message: "Je kunt maximaal 5 tickets per uur indienen." },
  transcript_not_found: { status: 400, message: "Transcript niet gevonden of niet van jou." },
  not_authenticated:    { status: 401, message: "Niet ingelogd." },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer.", details: parsed.error.flatten() }, { status: 400 })
  }

  const { category, subject, body: ticketBody, transcript_id } = parsed.data

  const { data: ticketId, error } = await supabase.rpc("submit_support_ticket", {
    p_category:      category,
    p_subject:       subject,
    p_body:          ticketBody,
    p_transcript_id: transcript_id ?? null,
  })

  if (error) {
    const known = Object.entries(RPC_ERRORS).find(([key]) => error.message.includes(key))
    if (known) return NextResponse.json({ error: known[1].message }, { status: known[1].status })
    console.error("[support/submit] rpc error:", error.message)
    return NextResponse.json({ error: "Er ging iets mis. Probeer het opnieuw." }, { status: 500 })
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
