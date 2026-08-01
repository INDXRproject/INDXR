"use client"

import { useState } from "react"
import { CheckCircle, AlertCircle, Clock, Paperclip, X } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"
import { cn } from "@indxr/shared/lib/utils"
import { createClient } from "@indxr/shared/utils/supabase/client"

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024 // 5 MB — matches the bucket limit
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

interface Transcript {
  id: string
  title: string | null
}

interface Props {
  transcripts: Transcript[]
}

type ResultState =
  | { type: "success"; ticketId: string }
  | { type: "rate-limit" }
  | { type: "error"; message: string }

const CATEGORIES = [
  { value: "feedback", label: "Feedback", description: "A suggestion or compliment" },
  { value: "billing",  label: "Billing",  description: "Credits, payments, invoices" },
  { value: "bug",      label: "Bug",      description: "Something isn't working as expected" },
] as const

type Category = typeof CATEGORIES[number]["value"]

export function SupportClient({ transcripts }: Props) {
  const [category, setCategory]     = useState<Category>("feedback")
  const [subject, setSubject]       = useState("")
  const [body, setBody]             = useState("")
  const [transcriptId, setTranscriptId] = useState("")
  const [file, setFile]             = useState<File | null>(null)
  const [fileError, setFileError]   = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState<ResultState | null>(null)

  const pickFile = (f: File | null) => {
    setFileError(null)
    if (!f) { setFile(null); return }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError("Please attach a PNG, JPG, WebP or GIF image.")
      return
    }
    if (f.size > MAX_ATTACHMENT_BYTES) {
      setFileError("That image is larger than 5 MB.")
      return
    }
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setResult(null)

    try {
      // Upload the screenshot first (private bucket, own folder) so we can attach its path.
      let attachmentPath: string | undefined
      if (file) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setResult({ type: "error", message: "You need to be signed in to attach a screenshot." }); return }
        const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png"
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from("support-attachments")
          .upload(path, file, { contentType: file.type, upsert: false })
        if (upErr) { setResult({ type: "error", message: "We couldn't upload that screenshot. Please try again." }); return }
        attachmentPath = path
      }

      const res = await fetch("/api/support/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          body: body.trim(),
          ...(transcriptId ? { transcript_id: transcriptId } : {}),
          ...(attachmentPath ? { attachment_path: attachmentPath } : {}),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult({ type: "success", ticketId: data.ticketId })
        setSubject("")
        setBody("")
        setTranscriptId("")
        setFile(null)
        return
      }

      if (res.status === 429) {
        setResult({ type: "rate-limit" })
        return
      }

      setResult({ type: "error", message: "Something went wrong. Please try again later." })
    } catch {
      setResult({ type: "error", message: "No connection. Check your internet and try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-semibold text-fg">Support</h1>
      </div>

      {/* Result banners */}
      {result?.type === "success" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-fg">Ticket submitted</p>
            <p className="text-sm text-fg-muted mt-0.5">
              We&apos;ve received your message and will get back to you as soon as possible.
            </p>
          </div>
        </div>
      )}

      {result?.type === "rate-limit" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-fg">
            You can send at most 5 tickets per hour. Please try again later.
          </p>
        </div>
      )}

      {result?.type === "error" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-error shrink-0 mt-0.5" />
          <p className="text-sm text-fg">{result.message}</p>
        </div>
      )}

      {/* Form */}
      {result?.type !== "success" && (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Category */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">Category</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "text-left px-4 py-3 rounded-lg border transition-colors",
                    category === cat.value
                      ? "border-accent bg-accent-subtle text-accent"
                      : "border-border bg-surface text-fg hover:bg-surface-elevated"
                  )}
                >
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className={cn("text-xs mt-0.5", category === cat.value ? "text-accent/70" : "text-fg-muted")}>
                    {cat.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label htmlFor="subject" className="text-sm font-medium text-fg">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              placeholder="Brief summary of your question or issue"
              required
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            {subject.length > 160 && (
              <p className={cn("text-xs", subject.length >= 200 ? "text-error" : "text-fg-muted")}>
                {subject.length}/200
              </p>
            )}
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label htmlFor="body" className="text-sm font-medium text-fg">
              Message
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 5000))}
              placeholder="Describe your question, issue or feedback as clearly as possible."
              required
              rows={6}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
            {body.length > 4000 && (
              <p className={cn("text-xs", body.length >= 5000 ? "text-error" : "text-fg-muted")}>
                {body.length}/5000
              </p>
            )}
          </div>

          {/* Transcript (optional) */}
          {transcripts.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="transcript" className="text-sm font-medium text-fg">
                Related transcript{" "}
                <span className="text-fg-muted font-normal">(optional)</span>
              </label>
              <select
                id="transcript"
                value={transcriptId}
                onChange={(e) => setTranscriptId(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="">— No specific transcript —</option>
                {transcripts.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title ?? "Untitled transcript"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Screenshot (optional) */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-fg">
              Screenshot <span className="text-fg-muted font-normal">(optional)</span>
            </p>
            {!file ? (
              <label className="flex items-center gap-2 w-fit cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted hover:bg-surface-elevated hover:text-fg transition-colors">
                <Paperclip className="h-4 w-4" />
                Attach an image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
                <img src={URL.createObjectURL(file)} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                <span className="text-sm text-fg truncate flex-1" title={file.name}>{file.name}</span>
                <button type="button" onClick={() => pickFile(null)} className="text-fg-muted hover:text-fg shrink-0" aria-label="Remove screenshot">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-fg-muted">PNG, JPG, WebP or GIF · up to 5 MB.</p>
            {fileError && <p className="text-xs text-error">{fileError}</p>}
          </div>

          <Button type="submit" disabled={submitting || !subject.trim() || !body.trim()}>
            {submitting ? "Sending…" : "Submit ticket"}
          </Button>
        </form>
      )}

      {/* After success: option to submit another */}
      {result?.type === "success" && (
        <Button
          variant="ghost"
          onClick={() => setResult(null)}
          className="text-fg-muted hover:text-fg"
        >
          Submit another ticket
        </Button>
      )}
    </div>
  )
}
