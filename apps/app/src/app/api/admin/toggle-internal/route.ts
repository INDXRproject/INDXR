import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

// Marks a profile internal/external. Internal accounts are excluded from EVERY real-economy
// figure (finance/growth) — the admin_*_summary RPCs filter on profiles.is_internal, so the
// change takes effect on the next dashboard load.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { userId, isInternal } = await req.json()
  if (!userId || typeof isInternal !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ is_internal: isInternal })
    .eq("id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, isInternal })
}
