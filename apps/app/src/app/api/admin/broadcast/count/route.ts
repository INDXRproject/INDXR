import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { resolveRecipients, type BroadcastTarget } from "@/lib/broadcast"

const TARGETS: BroadcastTarget[] = ["all", "paid", "free", "manual"]

// Admin-only recipient count preview for a target. No side effects.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { target, manualIds } = await req.json().catch(() => ({}))
  if (!TARGETS.includes(target)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const recipients = await resolveRecipients(
      admin,
      target,
      Array.isArray(manualIds) ? manualIds : [],
    )
    // Only recipients with an email can receive the email channel.
    const withEmail = recipients.filter((r) => r.email).length
    return NextResponse.json({ count: recipients.length, withEmail })
  } catch (err) {
    console.error("[broadcast/count]", err)
    return NextResponse.json({ error: "Failed to resolve recipients" }, { status: 500 })
  }
}
