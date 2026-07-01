import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { MessagesClient } from "./MessagesClient"

export const metadata: Metadata = {
  title: "Messages — INDXR.AI",
  robots: { index: false },
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const params = await searchParams
  const initialTab = params.tab === "support" ? "support" : "inbox"

  const [
    { data: messages },
    { data: tickets },
    { data: transcripts },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("id, title, body, type, read, archived, ticket_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("support_tickets")
      .select("id, category, subject, body, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("transcripts")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  return (
    <MessagesClient
      initialMessages={messages ?? []}
      initialTickets={tickets ?? []}
      transcripts={transcripts ?? []}
      initialTab={initialTab}
    />
  )
}
