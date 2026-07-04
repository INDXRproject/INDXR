import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { verifyUnsubscribe } from "@/lib/unsubscribe-token"

// Public, no auth. Sets profiles.marketing_unsubscribed = true for the user
// identified by the signed token. POST-only (a GET could be prefetched by an
// email scanner and unsubscribe someone who never clicked). Upsert so a user
// without a profiles row still gets one — every other profiles column defaults.
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: null }))
  const userId = verifyUnsubscribe(typeof token === "string" ? token : "")
  if (!userId) {
    return NextResponse.json({ error: "Invalid or expired unsubscribe link." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .upsert({ id: userId, marketing_unsubscribed: true }, { onConflict: "id" })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
