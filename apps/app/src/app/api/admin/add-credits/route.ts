import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { userId, amount, reasonCategory, note } = await req.json()
  if (!userId || !amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Grant-reden-enum voor het GELD-dashboard (given credits per reason).
  const GRANT_REASONS = ["Testing", "Welcome", "Refund", "Goodwill"]
  const category = GRANT_REASONS.includes(reasonCategory) ? reasonCategory : "Testing"
  const cleanNote = typeof note === "string" ? note.trim() : ""
  const reasonText = cleanNote ? `${category}: ${cleanNote}` : category

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reasonText,
    p_metadata: { granted_by: user.id, grant_reason: category },
    p_kind: "grant",
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
