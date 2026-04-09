import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const type = searchParams.get("type")

  if (!userId || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (type === "transcripts") {
    const { data, error } = await admin
      .from("transcripts")
      .select("id, title, processing_method, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (type === "transactions") {
    const { data, error } = await admin
      .from("credit_transactions")
      .select("id, amount, type, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}
