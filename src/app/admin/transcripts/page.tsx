import { createAdminClient } from "@/utils/supabase/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TranscriptDeleteButton } from "./TranscriptDeleteButton"

const PER_PAGE = 50

export default async function AdminTranscriptsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    method?: string
    from?: string
    to?: string
  }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const methodFilter = params.method ?? ""
  const from = params.from ?? ""
  const to = params.to ?? ""

  const admin = createAdminClient()
  const offset = (page - 1) * PER_PAGE

  let query = admin
    .from("transcripts")
    .select(
      "id, user_id, title, processing_method, source_type, credits_used, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PER_PAGE - 1)

  if (methodFilter) query = query.eq("processing_method", methodFilter)
  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", to + "T23:59:59")

  const { data: transcripts, count } = await query

  // Fetch user emails
  const userIds = [...new Set(transcripts?.map((t) => t.user_id) ?? [])]
  const emailMap: Record<string, string> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data.user?.email) emailMap[id] = data.user.email
    })
  )

  const totalPages = count ? Math.ceil(count / PER_PAGE) : 1

  const paginationHref = (p: number) =>
    `/admin/transcripts?page=${p}${methodFilter ? `&method=${methodFilter}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transcripts</h1>
        <p className="text-fg-muted text-sm">All transcripts across all users</p>
      </div>

      <form className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-fg-muted">Method</label>
          <select
            name="method"
            defaultValue={methodFilter}
            className="border rounded-md px-3 py-1.5 text-sm bg-bg"
          >
            <option value="">All methods</option>
            <option value="whisper">Whisper</option>
            <option value="auto-captions">Auto-captions</option>
            <option value="upload">Upload</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-fg-muted">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border rounded-md px-3 py-1.5 text-sm bg-bg"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-fg-muted">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border rounded-md px-3 py-1.5 text-sm bg-bg"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm border rounded-md bg-bg hover:bg-surface-elevated"
        >
          Filter
        </button>
        <a
          href="/admin/transcripts"
          className="px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
        >
          Reset
        </a>
      </form>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!transcripts?.length && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-fg-muted py-8"
                >
                  No transcripts found
                </TableCell>
              </TableRow>
            )}
            {transcripts?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs max-w-[180px] truncate text-fg-muted">
                  {emailMap[t.user_id] ?? t.user_id.slice(0, 8) + "…"}
                </TableCell>
                <TableCell className="max-w-[260px] truncate text-sm">
                  {t.title ?? "Untitled"}
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-surface-elevated px-1.5 py-0.5 rounded">
                    {t.processing_method ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-fg-muted">
                  {t.source_type ?? "—"}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {t.credits_used ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-fg-muted">
                  {new Date(t.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/admin/transcripts/${t.id}`}
                      className="text-xs text-fg-muted hover:text-fg underline underline-offset-2"
                    >
                      View
                    </a>
                    <TranscriptDeleteButton transcriptId={t.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-fg-muted">
        <span>
          Page {page} of {totalPages} · {count ?? 0} total
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <a
              href={paginationHref(page - 1)}
              className="px-3 py-1 border rounded hover:bg-surface-elevated"
            >
              ← Prev
            </a>
          )}
          {page < totalPages && (
            <a
              href={paginationHref(page + 1)}
              className="px-3 py-1 border rounded hover:bg-surface-elevated"
            >
              Next →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
