import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { pct, type OperationsSummary } from "../adminTypes"

const PALETTE = ["text-error", "text-warning", "text-sky", "text-indigo", "text-violet", "text-teal"]

// Pure-SVG donut: each segment is a dashed circle stroked in currentColor (set via a Tailwind text-* class).
function Donut({ data }: { data: { label: string; value: number; cls: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 42
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-surface-sunken" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c
            const seg = (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                strokeWidth="12"
                stroke="currentColor"
                className={d.cls}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            )
            offset += len
            return seg
          })}
      </svg>
      <div className="space-y-1">
        {data.length === 0 && <p className="text-xs text-fg-subtle">No errors recorded.</p>}
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 rounded-full bg-current ${d.cls}`} />
            <span className="text-fg-muted">{d.label}</span>
            <span className="font-semibold tabular-nums text-fg">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-fg-muted">{sub}</p>}
    </div>
  )
}

function secs(n: number | null): string {
  return n == null ? "—" : n < 60 ? `${n.toFixed(1)}s` : `${(n / 60).toFixed(1)}m`
}

export default async function AdminOperationsPage() {
  const admin = createAdminClient()
  const { data } = await admin.rpc("admin_operations_summary")
  const o = data as OperationsSummary | null

  if (!o) {
    return <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">Operations data unavailable.</div>
  }

  const errorData = Object.entries(o.error_types)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, cls: PALETTE[i % PALETTE.length] }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations</h1>
        <p className="text-sm text-fg-muted">System health across all transcription &amp; playlist jobs</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Success rate" value={pct(o.success_rate)} sub={`${o.jobs.complete} of ${o.jobs.complete + o.jobs.error} finished`} />
        <Metric label="Failed" value={o.jobs.error.toLocaleString()} sub="terminal errors" />
        <Metric label="In flight" value={o.jobs.in_flight.toLocaleString()} sub="currently processing" />
        <Metric label="Playlist jobs" value={`${o.playlist.complete}/${o.playlist.total}`} sub={`${o.retries.playlist_retried} retried`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-surface p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-muted">Error distribution</h2>
          <Donut data={errorData} />
        </div>

        <div className="rounded-xl border bg-surface p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-muted">Capacity</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold tabular-nums">{o.capacity.queue_depth_now}</p>
              <p className="text-xs text-fg-muted">in queue now</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{secs(o.capacity.avg_queue_wait_sec)}</p>
              <p className="text-xs text-fg-muted">avg queue wait</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{secs(o.capacity.avg_processing_sec)}</p>
              <p className="text-xs text-fg-muted">avg processing</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-fg-subtle">
            Watchdog recoveries: {o.retries.watchdog} · queue wait derived from job created→started timestamps.
          </p>
        </div>
      </div>
    </div>
  )
}
