import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { userId, amount, reason } = await req.json()
  if (!userId || !amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason ?? "Admin credit grant",
    p_metadata: { granted_by: user.id },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
