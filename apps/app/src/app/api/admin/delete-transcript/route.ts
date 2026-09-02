import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { transcriptId } = await req.json()
  if (!transcriptId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("transcripts").delete().eq("id", transcriptId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
