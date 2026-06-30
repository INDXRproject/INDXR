import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { MessagesClient } from "./MessagesClient"

export const metadata: Metadata = {
  title: "Messages — INDXR.AI",
  robots: { index: false },
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: messages } = await supabase
    .from("messages")
    .select("id, title, body, type, read, archived, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return <MessagesClient initialMessages={messages ?? []} />
}
