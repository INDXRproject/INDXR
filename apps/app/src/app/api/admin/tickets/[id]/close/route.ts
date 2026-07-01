import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin
    .from("support_tickets")
    .update({ status: "closed" })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
