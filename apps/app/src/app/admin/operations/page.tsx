import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import {
  pct, resolveWindow, errorMeta, FAULT_META, HEALTH_CLS, successHealth, queueWaitHealth,
  type OperationsSummary, type Health,
} from "../adminTypes"
import { DashboardControls } from "../_components/DashboardControls"
import { InfoHint } from "../_components/InfoHint"

export const dynamic = "force-dynamic"

// Pure-SVG donut: each segment is a dashed circle stroked in currentColor (set via a Tailwind text-* class).
function Donut({ data }: { data: { label: string; value: number; cls: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 42
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-surface-sunken" />
      {total > 0 &&
        data.map((d, i) => {
          const len = (d.value / total) * c
          const seg = (
            <circle key={i} cx="50" cy="50" r={r} fill="none" strokeWidth="12" stroke="currentColor"
              className={d.cls} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
          )
          offset += len
          return seg
        })}
    </svg>
  )
}

function Metric({ label, value, sub, tone = "neutral", info }: {
  label: string; value: string; sub?: string; tone?: Health; info?: string
}) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="flex items-center text-xs uppercase tracking-wide text-fg-muted">{label}{info && <InfoHint text={info} />}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${HEALTH_CLS[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-fg-muted">{sub}</p>}
    </div>
  )
}

function secs(n: number | null): string {
  return n == null ? "—" : n < 60 ? `${n.toFixed(1)}s` : `${(n / 60).toFixed(1)}m`
}

export default async function AdminOperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const win = resolveWindow(sp.w)
  const excludeInternal = sp.test === "real"

  const admin = createAdminClient()
  const { data } = await admin.rpc("admin_operations_summary", {
    p_from: win.from, p_to: win.to, p_exclude_internal: excludeInternal,
  })
  const o = data as OperationsSummary | null

  if (!o) {
    return <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">Operations data unavailable.</div>
  }

  const finished = o.jobs.complete + o.jobs.error
  const errorData = Object.entries(o.error_types)
    .map(([slug, value]) => ({ slug, value, meta: errorMeta(slug) }))
    .sort((a, b) => b.value - a.value)
  const donut = errorData.map((e) => ({ label: e.meta.label, value: e.value, cls: FAULT_META[e.meta.fault].cls }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operations</h1>
          <p className="text-sm text-fg-muted">
            Job health · {win.label}{excludeInternal ? " · real users only" : " · all traffic incl. test"}
          </p>
        </div>
        <DashboardControls showTest />
      </div>

      {/* Live now — independent of the selected window (real-time status). */}
      <div className="rounded-xl border bg-surface-sunken p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-fg-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" /> Live right now
          <InfoHint text="Real-time job states this instant, independent of the window above. 'Stuck' = an in-progress job whose heartbeat went stale (the watchdog will recover or refund it)." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><p className="text-2xl font-bold tabular-nums">{o.jobs.in_flight}</p><p className="text-xs text-fg-muted">processing</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{o.capacity.queue_depth_now}</p><p className="text-xs text-fg-muted">in queue</p></div>
          <div>
            <p className={`text-2xl font-bold tabular-nums ${o.jobs.stuck > 0 ? "text-error" : "text-fg-strong"}`}>{o.jobs.stuck}</p>
            <p className="text-xs text-fg-muted">stuck</p>
          </div>
        </div>
      </div>

      {/* Windowed KPIs. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Success rate" value={pct(o.success_rate)} tone={successHealth(o.success_rate, finished)}
          sub={`${o.jobs.complete} ok · ${o.jobs.error} failed`}
          info="Completed ÷ (completed + failed) AI/playlist jobs in this window. Free caption extraction and live-now jobs aren't counted. Stays neutral (grey) until at least 5 jobs finished, so one bad job doesn't flash red." />
        <Metric label="Jobs processed" value={o.jobs.total.toLocaleString()} sub={win.label}
          info="AI transcription and playlist jobs created in this window. Free caption extractions are logged separately (usage_logs), not here." />
        <Metric label="Avg queue wait" value={secs(o.capacity.avg_queue_wait_sec)} tone={queueWaitHealth(o.capacity.avg_queue_wait_sec)}
          sub="created → started"
          info="Average time a job sat in the queue before processing started (created → started), in this window. Green ≤30s, amber ≤2m, red above." />
        <Metric label="Avg processing" value={secs(o.capacity.avg_processing_sec)} sub="AI jobs run minutes"
          info="Average end-to-end processing time of completed jobs in this window. Several minutes is normal for AI transcription; captions are near-instant." />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-surface p-5">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-muted">Errors · {win.label}</h2>
          {errorData.length === 0 ? (
            <p className="py-6 text-sm text-fg-subtle">
              {o.jobs.total === 0 ? `No jobs in the ${win.label} — try a wider window.` : "No errors in this window. 🎉"}
            </p>
          ) : (
            <div className="flex items-center gap-5">
              <Donut data={donut} />
              <div className="min-w-0 flex-1 space-y-1.5">
                {errorData.map((e) => (
                  <div key={e.slug} className="flex items-start gap-2 text-xs" title={e.meta.hint}>
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full bg-current ${FAULT_META[e.meta.fault].cls}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-fg">{e.meta.label}</span>
                        <span className="font-semibold tabular-nums text-fg">{e.value}</span>
                      </div>
                      <span className={`text-[11px] ${FAULT_META[e.meta.fault].cls}`}>{FAULT_META[e.meta.fault].label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 border-t pt-2 text-[11px] text-fg-subtle">
            "Our system" errors are on us to fix; "YouTube" and "User" errors are expected. Hover a row for detail.
          </p>
        </div>

        <div className="rounded-xl border bg-surface p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-muted">Reliability · {win.label}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-fg-muted">Playlist jobs completed</span>
              <span className="font-semibold tabular-nums">{o.playlist.complete}/{o.playlist.total}</span></div>
            <div className="flex justify-between"><span className="text-fg-muted">Playlist retries</span>
              <span className="tabular-nums">{o.retries.playlist_retried}</span></div>
            <div className="flex justify-between"><span className="text-fg-muted">Watchdog recoveries</span>
              <span className="tabular-nums">{o.retries.watchdog}</span></div>
          </div>
          <p className="mt-3 border-t pt-2 text-[11px] text-fg-subtle">
            Watchdog recoveries = stalled jobs the system automatically re-queued or refunded. A rising count means
            jobs are getting stuck.
          </p>
        </div>
      </div>
    </div>
  )
}
