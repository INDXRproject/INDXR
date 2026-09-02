import { NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: tickets, error } = await admin
    .from("support_tickets")
    .select("id, user_id, category, subject, body, transcript_id, attachment_path, status, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve emails for unique user_ids
  const userIds = [...new Set((tickets ?? []).map((t) => t.user_id))]
  const emailMap: Record<string, string> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  // Signed URLs for screenshot attachments (private bucket, 1h) — admin-only view.
  const result = await Promise.all(
    (tickets ?? []).map(async (t) => {
      let attachment_url: string | null = null
      if (t.attachment_path) {
        const { data: signed } = await admin.storage
          .from("support-attachments")
          .createSignedUrl(t.attachment_path, 3600)
        attachment_url = signed?.signedUrl ?? null
      }
      return { ...t, user_email: emailMap[t.user_id] ?? null, attachment_url }
    })
  )
  return NextResponse.json(result)
}
