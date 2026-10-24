import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { notFound } from "next/navigation"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

// Snelle balie — veilige, onraadbare link (growth-plan.md §6.2 Onderdeel B). Geen auth: het
// token ZELF is de toegangscontrole (32 random bytes, hex), gevalideerd server-side met de
// service-role key — die key gaat nooit naar de client. Read-only, geen RLS-policy nodig omdat
// deze route nooit de browser-Supabase-client gebruikt.
interface PageProps {
  params: Promise<{ token: string }>
}

export default async function SecureTranscriptPage({ params }: PageProps) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: transcript } = await admin
    .from("transcripts")
    .select("title, channel, transcript, duration, created_at")
    .eq("guest_access_token", token)
    .single()

  if (!transcript) {
    return notFound()
  }

  const segments = (transcript.transcript as { text: string; offset: number }[] | null) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-fg mb-1">{transcript.title || "Your transcript"}</h1>
      {transcript.channel && <p className="text-sm text-fg-muted mb-6">{transcript.channel}</p>}
      <div className="rounded-lg border border-border bg-surface p-6 space-y-3 text-sm text-fg leading-relaxed">
        {segments.length === 0 && <p className="text-fg-muted">No transcript text available.</p>}
        {segments.map((seg, i) => (
          <p key={i}>{seg.text}</p>
        ))}
      </div>
      <p className="text-xs text-fg-subtle mt-6">
        This link is private to you — don't share it.{" "}
        <a href={marketingHref("/login")} className="text-[var(--link)] hover:underline">
          Create a free account
        </a>{" "}
        to save this transcript and get more credits.
      </p>
    </div>
  )
}
