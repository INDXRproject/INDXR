import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { listAllUsers } from "@/lib/broadcast"

// Admin-only email search for the manual-selection target. listUsers has no
// server-side email filter, so we page through all users and substring-match.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { query } = await req.json().catch(() => ({}))
  const q = (typeof query === "string" ? query : "").trim().toLowerCase()
  if (q.length < 2) {
    return NextResponse.json({ users: [] })
  }

  try {
    const admin = createAdminClient()
    const all = await listAllUsers(admin)
    const matches = all
      .filter((u) => u.email && u.email.toLowerCase().includes(q))
      .slice(0, 25)
      .map((u) => ({ id: u.id, email: u.email }))
    return NextResponse.json({ users: matches })
  } catch (err) {
    console.error("[broadcast/search-users]", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
