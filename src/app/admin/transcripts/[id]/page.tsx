import { createAdminClient } from "@/utils/supabase/admin"
import { notFound } from "next/navigation"
import Link from "next/link"

export default async function AdminTranscriptViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: transcript, error } = await admin
    .from("transcripts")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !transcript) {
    notFound()
  }

  const { data: userInfo } = await admin.auth.admin.getUserById(transcript.user_id)
  const email = userInfo.user?.email ?? transcript.user_id

  const content = transcript.content ?? transcript.transcript_data ?? null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/transcripts"
          className="text-sm text-fg-muted hover:text-fg"
        >
          ← Transcripts
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">{transcript.title ?? "Untitled"}</h1>
        <p className="text-sm text-fg-muted mt-1">{email}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-md border p-3">
          <p className="text-xs text-fg-muted">Method</p>
          <p className="font-medium mt-0.5">{transcript.processing_method ?? "—"}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-fg-muted">Source</p>
          <p className="font-medium mt-0.5">{transcript.source_type ?? "—"}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-fg-muted">Credits Used</p>
          <p className="font-medium mt-0.5">{transcript.credits_used ?? "—"}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-fg-muted">Date</p>
          <p className="font-medium mt-0.5">
            {new Date(transcript.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {transcript.video_id && (
        <div className="text-sm">
          <span className="text-fg-muted">YouTube: </span>
          <a
            href={`https://youtube.com/watch?v=${transcript.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            {transcript.video_id}
          </a>
        </div>
      )}

      {content ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wide">
            Transcript Content
          </h2>
          <div className="rounded-md border bg-surface-elevated/30 p-4 text-sm whitespace-pre-wrap max-h-[600px] overflow-y-auto font-mono leading-relaxed">
            {typeof content === "string"
              ? content
              : JSON.stringify(content, null, 2)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">No transcript content stored.</p>
      )}
    </div>
  )
}
