import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Prevent admin from deleting themselves
  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Prevent deleting the admin account by email
  const { data: targetUser } = await admin.auth.admin.getUserById(userId)
  if (targetUser.user?.email === process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Cannot delete admin account" }, { status: 403 })
  }

  // Manually delete dependent data in correct order before removing auth user.
  // Some tables may not have ON DELETE CASCADE, so we delete explicitly.
  await admin.from("transcripts").delete().eq("user_id", userId)
  await admin.from("collections").delete().eq("user_id", userId)
  await admin.from("credit_transactions").delete().eq("user_id", userId)
  await admin.from("user_credits").delete().eq("user_id", userId)
  await admin.from("profiles").delete().eq("id", userId)

  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
