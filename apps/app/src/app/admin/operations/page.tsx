import type { ReactNode } from "react"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import {
  pct, resolveWindow, errorMeta, FAULT_META, ERROR_META, HEALTH_CLS,
  type OperationsV3, type StatBand, type Health, type ErrorFault,
} from "../adminTypes"
import { DashboardControls } from "../_components/DashboardControls"
import { InfoHint } from "../_components/InfoHint"
import { fetchUptime } from "./betterstack"

export const dynamic = "force-dynamic"

// ── formatters ──────────────────────────────────────────────────────────────────────────────────
function secs(n: number | null): string {
  return n == null ? "—" : n < 60 ? `${n.toFixed(1)}s` : `${(n / 60).toFixed(1)}m`
}
function ms(n: number | null): string {
  return n == null ? "—" : secs(n / 1000)
}
function num(n: number): string {
  return n.toLocaleString()
}

// BetterStack status → dot colour. up=green, down=red, pending/validating=amber, else grey.
function uptimeDot(status: string): string {
  switch (status) {
    case "up": return "bg-success"
    case "down": return "bg-error"
    case "pending":
    case "validating": return "bg-warning"
    default: return "bg-fg-subtle" // paused / maintenance / unknown
  }
}

// ── small building blocks ─────────────────────────────────────────────────────────────────────────
function Card({ title, info, children, className = "" }: {
  title?: string; info?: string; children: ReactNode; className?: string
}) {
  return (
    <div className={`rounded-xl border bg-surface p-5 ${className}`}>
      {title && (
        <h2 className="mb-3 flex items-center text-xs font-medium uppercase tracking-wider text-fg-muted">
          {title}{info && <InfoHint text={info} />}
        </h2>
      )}
      {children}
    </div>
  )
}

function Stat({ label, value, sub, tone = "neutral", info }: {
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

// Below this, a p95/max is just "the slowest of a handful" — false precision. Show median + n only.
const MIN_BAND_SAMPLE = 20

// median / p95 / max band. sample===0 → "no data yet" (empty must never read as 0/instant);
// 0 < sample < MIN_BAND_SAMPLE → median + n only (no p95/max — point 4).
function Band({ label, band, fmt, info, tone = "neutral" }: {
  label: string; band: StatBand; fmt: (n: number | null) => string; info?: string; tone?: Health
}) {
  const empty = band.sample === 0
  const sparse = band.sample > 0 && band.sample < MIN_BAND_SAMPLE
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="flex items-center text-xs uppercase tracking-wide text-fg-muted">{label}{info && <InfoHint text={info} />}</p>
      {empty ? (
        <p className="mt-1 text-sm text-fg-subtle italic">no data yet</p>
      ) : (
        <>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${HEALTH_CLS[tone]}`}>{fmt(band.p50)}<span className="ml-1 text-xs font-normal text-fg-muted">median</span></p>
          {sparse
            ? <p className="text-xs text-fg-muted tabular-nums">n={band.sample}</p>
            : <p className="text-xs text-fg-muted tabular-nums">p95 {fmt(band.p95)} · max {fmt(band.max)} · n={band.sample}</p>}
        </>
      )}
    </div>
  )
}

// horizontal distribution bar list (formats, languages, models, jobtype).
function Bars({ data, tone }: { data: { label: string; value: number; cls?: string }[]; tone?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="py-4 text-sm text-fg-subtle">No data in this window.</p>
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 truncate text-fg-muted" title={d.label}>{d.label}</span>
          <span className="relative h-4 flex-1 overflow-hidden rounded bg-surface-sunken">
            <span className={`absolute inset-y-0 left-0 rounded ${d.cls ?? tone ?? "bg-accent"}`} style={{ width: `${(d.value / total) * 100}%` }} />
          </span>
          <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-fg">{num(d.value)}</span>
        </div>
      ))}
    </div>
  )
}

// Download-failure-by-duration — the incident panel. Colour by failure %, not volume.
function failTone(p: number): string {
  return p >= 10 ? "bg-error" : p >= 5 ? "bg-warning" : "bg-success"
}
function DurationFailure({ rows }: { rows: OperationsV3["errors"]["download_by_duration"] }) {
  const rowsClean = rows.filter((r) => r.total > 0)
  if (rowsClean.length === 0) return <p className="py-4 text-sm text-fg-subtle">No single/upload jobs in this window.</p>
  const maxPct = Math.max(1, ...rowsClean.map((r) => r.pct))
  return (
    <div className="space-y-2">
      {rowsClean.map((r) => {
        const label = r.bucket.replace(/^\d\)\s*/, "")
        return (
          <div key={r.bucket} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-fg-muted">{label}</span>
            <span className="relative h-5 flex-1 overflow-hidden rounded bg-surface-sunken">
              <span className={`absolute inset-y-0 left-0 rounded ${failTone(r.pct)}`} style={{ width: `${(r.pct / maxPct) * 100}%` }} />
            </span>
            <span className="w-24 shrink-0 text-right tabular-nums text-fg">
              <span className="font-semibold">{r.pct}%</span>
              <span className="ml-1 text-fg-subtle">{r.dl_failures}/{r.total}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Daily jobs (bars) + errors (overlaid) sparkline — the trend so "incident vs trend" reads at a glance.
function Daily({ rows }: { rows: OperationsV3["errors"]["daily"] }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-fg-subtle">No jobs in this window.</p>
  const maxJobs = Math.max(1, ...rows.map((r) => r.jobs))
  return (
    <div className="flex items-end gap-1" style={{ height: 72 }}>
      {rows.map((r) => {
        const h = (r.jobs / maxJobs) * 64
        const eh = r.jobs > 0 ? (r.errors / maxJobs) * 64 : 0
        return (
          <div key={r.day} className="group relative flex flex-1 flex-col justify-end" title={`${r.day}: ${r.jobs} jobs, ${r.errors} errors`}>
            <span className="w-full rounded-t bg-surface-sunken" style={{ height: Math.max(2, h) }}>
              {eh > 0 && <span className="block w-full rounded-t bg-error" style={{ height: Math.max(2, eh) }} />}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function successHealthV3(rate: number | null, sample: number): Health {
  if (rate == null || sample < 5) return "neutral"
  return rate >= 0.95 ? "good" : rate >= 0.85 ? "warn" : "bad"
}

// ── Status verdict (mockup 2a) — one-glance "must I act now?", worst active signal wins ──────────────
type Verdict = { level: "red" | "amber" | "green" | "quiet"; headline: string; detail: string }

function topErrorLabel(byType: Record<string, number>): string {
  const top = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]
  return top ? errorMeta(top[0]).label : "unknown"
}

function computeVerdict(o: OperationsV3): Verdict {
  const { traffic, reliability, capacity, provider, errors } = o
  const finished = reliability.ai.complete + reliability.ai.error
  const sr = reliability.ai.success_rate
  const sat = provider.saturation_pct
  const activity = traffic.jobs.ai_total + traffic.jobs.playlist + traffic.captions.total
  if (activity === 0 && capacity.in_flight === 0)
    return { level: "quiet", headline: "Quiet — no jobs in this window", detail: "Nothing to act on. Widen the window to see history." }
  if (capacity.stuck > 0)
    return { level: "red", headline: `${capacity.stuck} job${capacity.stuck === 1 ? "" : "s"} stuck right now`, detail: "A heartbeat went stale — the watchdog will recover or refund, but check the worker if it persists." }
  if (sat != null && sat >= 90)
    return { level: "red", headline: `AssemblyAI at ${sat}% of its concurrency limit`, detail: "New transcriptions may start failing (429). Raise the account limit or shed load." }
  if (sr != null && finished >= 10 && sr < 0.70)
    return { level: "red", headline: `AI success rate ${pct(sr)}`, detail: `Below 70%. Top cause: ${topErrorLabel(errors.by_type)}. Investigate now.` }
  if (sr != null && finished >= 10 && sr < 0.90)
    return { level: "amber", headline: `AI success rate ${pct(sr)} — degraded`, detail: `Top cause: ${topErrorLabel(errors.by_type)}.` }
  if (sat != null && sat >= 60)
    return { level: "amber", headline: `AssemblyAI load ${sat}%`, detail: "Approaching the concurrency limit — watch for queueing." }
  if (capacity.queue_depth_now > 5)
    return { level: "amber", headline: `${capacity.queue_depth_now} jobs queued`, detail: "The worker may be falling behind." }
  return { level: "green", headline: "Normal", detail: "Nothing stuck, success rate healthy, provider not saturated." }
}

const VERDICT_STYLE: Record<Verdict["level"], { ring: string; icon: string }> = {
  red:   { ring: "border-error/40 bg-error-subtle",     icon: "🔴" },
  amber: { ring: "border-warning/40 bg-warning-subtle", icon: "🟡" },
  green: { ring: "border-success/40 bg-success-subtle", icon: "🟢" },
  quiet: { ring: "border-border bg-surface-sunken",     icon: "🟢" },
}

function StatusBanner({ v }: { v: Verdict }) {
  const s = VERDICT_STYLE[v.level]
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${s.ring}`}>
      <span className="text-lg leading-none">{s.icon}</span>
      <div className="min-w-0">
        <p className="flex items-center text-sm font-semibold text-fg-strong">
          {v.headline}
          <InfoHint text="One-glance verdict — the worst active signal wins. Thresholds (any stuck job, success <70%/90% over ≥10 finished, AssemblyAI load ≥60%/90%) are starting guesses; calibrate once real traffic settles." />
        </p>
        <p className="text-xs text-fg-muted">{v.detail}</p>
      </div>
    </div>
  )
}

// ── Full error taxonomy grouped by fault, incl 0-rows (mockup 2c) ────────────────────────────────────
const FAULT_ORDER: ErrorFault[] = ["us", "transient", "youtube", "user", "unknown"]

function FaultTaxonomy({ byType, samples }: { byType: Record<string, number>; samples: Record<string, string[]> }) {
  const known = new Set(Object.keys(ERROR_META))
  const groups: Record<ErrorFault, { slug: string; label: string; count: number; hint: string }[]> =
    { us: [], youtube: [], user: [], transient: [], unknown: [] }
  for (const [slug, meta] of Object.entries(ERROR_META))
    groups[meta.fault].push({ slug, label: meta.label, count: byType[slug] ?? 0, hint: meta.hint })
  for (const [slug, count] of Object.entries(byType))
    if (!known.has(slug)) groups.unknown.push({ slug, label: slug, count, hint: "New/unlabelled code — the raw message is your cue to label it." })

  return (
    <div className="space-y-3">
      {FAULT_ORDER.map((fault) => {
        const rows = groups[fault].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        if (rows.length === 0) return null
        const groupTotal = rows.reduce((s, r) => s + r.count, 0)
        return (
          <div key={fault}>
            <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
              <span className={FAULT_META[fault].cls}>{FAULT_META[fault].label}</span>
              <span className="tabular-nums text-fg-muted">{groupTotal}</span>
            </p>
            <div className="mt-1 space-y-0.5">
              {rows.map((r) => {
                const raw = samples[r.slug] ?? []
                const zero = r.count === 0
                return (
                  <details key={r.slug} className={`group text-xs ${zero ? "opacity-45" : ""}`}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <span className="truncate text-fg">{r.label}{!zero && <span className="ml-1 text-fg-subtle group-open:hidden">▸</span>}</span>
                      <span className="font-semibold tabular-nums text-fg">{r.count}</span>
                    </summary>
                    <div className="mt-0.5 space-y-1 pl-3">
                      <p className="text-[11px] text-fg-subtle">{r.hint}</p>
                      {raw.length > 0
                        ? raw.map((m, i) => (<p key={i} className="truncate rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-fg-muted" title={m}>{m}</p>))
                        : <p className="text-[11px] italic text-fg-subtle">No occurrence with a stored message.</p>}
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Occurred-only error drill-down (playlist unit-level, point 3) — same expandable raw messages.
function OccurredErrors({ byType, samples }: { byType: Record<string, number>; samples: Record<string, string[]> }) {
  const rows = Object.entries(byType).map(([slug, count]) => ({ slug, count, meta: errorMeta(slug) })).sort((a, b) => b.count - a.count)
  if (rows.length === 0) return <p className="py-3 text-sm text-fg-subtle">No playlist-video failures in this window. 🎉</p>
  return (
    <div className="space-y-0.5">
      {rows.map((r) => {
        const raw = samples[r.slug] ?? []
        return (
          <details key={r.slug} className="group text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full bg-current align-middle ${FAULT_META[r.meta.fault].cls}`} />
                <span className="text-fg">{r.meta.label}<span className="ml-1 text-fg-subtle group-open:hidden">▸</span></span>
              </span>
              <span className="font-semibold tabular-nums text-fg">{r.count}</span>
            </summary>
            <div className="mt-0.5 space-y-1 pl-4">
              <p className="text-[11px] text-fg-subtle">{r.meta.hint}</p>
              {raw.length > 0
                ? raw.map((m, i) => (<p key={i} className="truncate rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-fg-muted" title={m}>{m}</p>))
                : <p className="text-[11px] italic text-fg-subtle">No raw message stored.</p>}
            </div>
          </details>
        )
      })}
    </div>
  )
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
  const [{ data }, uptime] = await Promise.all([
    admin.rpc("admin_operations_v3", {
      p_from: win.from, p_to: win.to, p_exclude_internal: excludeInternal,
    }),
    fetchUptime(), // BetterStack live status (option B) — env-gated + graceful
  ])
  const o = data as OperationsV3 | null
  if (!o) {
    return <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">Operations data unavailable.</div>
  }

  const { traffic, reliability, latency, errors, audio, provider, capacity } = o
  const aiFinished = reliability.ai.complete + reliability.ai.error
  const errorPct = traffic.jobs.ai_total > 0 ? errors.total / traffic.jobs.ai_total : null

  const fmtList = (rec: Record<string, number>, cls?: string) =>
    Object.entries(rec).map(([label, value]) => ({ label, value, cls })).sort((a, b) => b.value - a.value)

  // playlist reliability derived
  const pl = reliability.playlist
  const plVideoSuccess = pl.videos_total > 0 ? pl.videos_complete / pl.videos_total : null
  const satTone: Health = provider.saturation_pct == null ? "neutral"
    : provider.saturation_pct >= 90 ? "bad" : provider.saturation_pct >= 60 ? "warn" : "good"
  const workerSatTone: Health = provider.worker_saturation_pct == null ? "neutral"
    : provider.worker_saturation_pct >= 90 ? "bad" : provider.worker_saturation_pct >= 60 ? "warn" : "good"

  // Status verdict (2a) + quiet state (2b): when there's no activity in the window, show the verdict
  // and Live-now only — not a grid of empty cards.
  const verdict = computeVerdict(o)
  const quiet = verdict.level === "quiet"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operations</h1>
          <p className="text-sm text-fg-muted">
            Behaviour, not money · {win.label}{excludeInternal ? " · real users only" : " · all traffic incl. test"}
          </p>
        </div>
        <DashboardControls showTest />
      </div>

      {/* ── STATUS VERDICT (2a) — one glance: must I act now? ── */}
      <StatusBanner v={verdict} />

      {/* ── LIVE NOW — real-time, window-independent ── */}
      <Card className="!bg-surface-sunken">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-fg-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" /> Live right now
          <InfoHint text="Job states this instant, independent of the window above. 'Stuck' = an in-progress job whose heartbeat went stale (the watchdog will recover or refund it). Worker load = jobs actively processing vs the ARQ worker-slot cap (the tight local bottleneck). AssemblyAI load = jobs transcribing now vs the provider concurrency limit (the wide external one)." />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div><p className="text-2xl font-bold tabular-nums">{capacity.in_flight}</p><p className="text-xs text-fg-muted">processing</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{capacity.queue_depth_now}</p><p className="text-xs text-fg-muted">in queue</p></div>
          <div>
            <p className={`text-2xl font-bold tabular-nums ${capacity.stuck > 0 ? "text-error" : "text-fg-strong"}`}>{capacity.stuck}</p>
            <p className="text-xs text-fg-muted">stuck</p>
          </div>
          <div>
            <p className={`text-2xl font-bold tabular-nums ${HEALTH_CLS[workerSatTone]}`}>{provider.worker_saturation_pct == null ? "—" : `${provider.worker_saturation_pct}%`}</p>
            <p className="text-xs text-fg-muted">worker load ({provider.worker_slots_used}/{provider.worker_concurrency_limit ?? "?"})</p>
          </div>
          <div>
            <p className={`text-2xl font-bold tabular-nums ${HEALTH_CLS[satTone]}`}>{provider.saturation_pct == null ? "—" : `${provider.saturation_pct}%`}</p>
            <p className="text-xs text-fg-muted">AssemblyAI load ({provider.in_flight_now}/{provider.concurrency_limit ?? "?"})</p>
          </div>
        </div>
      </Card>

      {/* Windowed detail — hidden when quiet (2b): no wall of empty cards. */}
      {!quiet && (<>
      {/* ── TRAFFIC (Golden Signal) — jobs vs units apart ── */}
      <section className="space-y-3">
        <h2 className="flex items-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Traffic<InfoHint text="How much work came in. Jobs = requests; units = the actual videos processed. A playlist is ONE job but many video-units, so the two counts differ on purpose." />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="AI jobs" value={num(traffic.jobs.ai_total)} sub={`${num(traffic.jobs.single)} single · ${num(traffic.jobs.upload)} upload`}
            info="Standalone AI transcription jobs (single video + audio upload) created in this window. Playlists are counted separately." />
          <Stat label="Playlist jobs" value={num(traffic.jobs.playlist)} sub={`${num(traffic.units.ai_playlist_videos)} video-units`}
            info="Playlist extraction jobs (1 job = many videos). The video-units line is the real per-video volume those jobs expanded to." />
          <Stat label="Caption extractions" value={num(traffic.captions.total)} sub={`${num(traffic.captions.cache_hits)} cache hits`}
            info="Free YouTube-caption extractions (usage_logs). Always 0 credits; kept separate from paid AI jobs." />
          <Stat label="Total video-units" value={num(traffic.units.ai_single_upload + traffic.units.ai_playlist_videos + traffic.units.captions)}
            sub="AI + playlist videos + captions" info="Every individual video processed across all paths — the true throughput, not the job count." />
        </div>
      </section>

      {/* ── ERRORS (Golden Signal) — total, %, split, the incident panel, trend ── */}
      <section className="space-y-3">
        <h2 className="flex items-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Errors<InfoHint text="What's failing, and whether it's an incident or a trend. Success rate stays grey until ≥5 jobs finished so one bad job doesn't flash red." />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="AI success rate" value={pct(reliability.ai.success_rate)} tone={successHealthV3(reliability.ai.success_rate, aiFinished)}
            sub={`${num(reliability.ai.complete)} ok · ${num(reliability.ai.error)} failed`}
            info="Completed ÷ (completed + failed) AI jobs. Free captions and live-now jobs aren't counted." />
          <Stat label="AI errors" value={num(errors.total)} sub={errorPct == null ? "—" : `${pct(errorPct)} of AI jobs`}
            info="Total failed AI jobs in this window, and what share of all AI jobs that is." />
          <Stat label="Single-video" value={`${num(reliability.ai.by_type.single.complete)}/${num(reliability.ai.by_type.single.complete + reliability.ai.by_type.single.error)}`}
            sub="ok / finished" info="Completed vs finished for standalone single-video AI jobs." />
          <Stat label="Audio upload" value={`${num(reliability.ai.by_type.upload.complete)}/${num(reliability.ai.by_type.upload.complete + reliability.ai.by_type.upload.error)}`}
            sub="ok / finished" info="Completed vs finished for audio-upload AI jobs." />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="Download failure by video length"
            info="Download-phase failures bucketed by video length (credits_reserved ≈ minutes). If the rate climbs with length, long videos are hitting a limit of the current setup — this is exactly the signal behind the 76-min timeout incident. Bar colour: green <5%, amber <10%, red ≥10%.">
            <DurationFailure rows={errors.download_by_duration} />
            <p className="mt-3 border-t pt-2 text-[11px] text-fg-subtle">Bar length = failure %, scaled to the worst bucket. The unknown bucket = pre-reservation jobs with no length recorded.</p>
          </Card>

          <Card title={`Error taxonomy · ${win.label}`}
            info="The FULL known failure list, grouped by whose fault it is, including the 0-rows — so you see what did NOT go wrong, not just what did. 'Our system' errors are on us; 'YouTube'/'User' are expected; 'Transient' auto-retries. Any new backend code shows up under 'Unknown'. Expand a row for the raw messages.">
            <FaultTaxonomy byType={errors.by_type} samples={errors.samples} />
          </Card>
        </div>

        <Card title="Daily volume & errors"
          info="Jobs per day (grey) with the failed share stacked in red. The trend line that tells you whether today's failure is a blip or a pattern.">
          <Daily rows={errors.daily} />
        </Card>
      </section>

      {/* ── LATENCY (Golden Signal) — median/p95/max, empty != 0 ── */}
      <section className="space-y-3">
        <h2 className="flex items-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Latency<InfoHint text="How long each phase takes — median / p95 / max, never a blended average. Provider turnaround is the primary number (always measurable); queue-wait and processing are secondary and only fill in under real queueing. Below n=20, p95/max are hidden as false precision." />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Band label="Provider turnaround" band={latency.provider_turnaround} fmt={secs} tone="neutral"
            info="Submitted → completed at AssemblyAI — the PRIMARY latency number. Always measurable (we always observe completion) and it rises under saturation. This replaced queue-wait as the headline because a 1h audio processes in ~30s, so the queued→processing transition is usually missed between polls." />
          <Band label="AssemblyAI queue wait" band={latency.queue_wait_ai} fmt={secs}
            info="Secondary: submitted → processing. Fills in only when there's real queueing (AssemblyAI saturated) — a job that starts instantly has ~0 wait and is excluded, not counted as 0." />
          <Band label="AI processing time" band={latency.provider_processing_ms} fmt={ms}
            info="Secondary: processing → completed, from our polling. Only observed when the queued→processing transition is caught between polls." />
          <Band label="Download + prep" band={latency.download_seconds} fmt={secs}
            info="Audio download + ffmpeg, from job start to AssemblyAI submit. Watch against the smaller-audio format — it should trend down." />
        </div>
      </section>

      {/* ── RELIABILITY DETAIL — playlist first-pass vs effective ── */}
      <section className="space-y-3">
        <h2 className="flex items-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Playlist reliability<InfoHint text="Playlists retry failed videos automatically. First-pass vs effective shows how much the auto-retry rescues." />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Videos completed" value={`${num(pl.videos_complete)}/${num(pl.videos_total)}`} tone={successHealthV3(plVideoSuccess, pl.videos_total)}
            sub={pct(plVideoSuccess)} info="Effective per-video success across all playlist jobs after auto-retry." />
          <Stat label="Videos failed" value={num(pl.videos_failed)} sub="after retries" info="Videos still failed once the playlist finished (post auto-retry)." />
          {/* Point 4: first-pass + recovered only appear once their capture has data — otherwise a
              raw 0 sits next to the historical "videos failed" count and reads as a bug. */}
          {pl.first_pass_measured > 0 && (
            <Stat label="First-pass failures" value={num(pl.first_pass_failed)} sub="before auto-retry"
              info="Videos that failed on the FIRST attempt (snapshot before the retry pass). first_pass_failed − recovered = the retry's net rescue." />
          )}
          {reliability.attempt_capture_present > 0 && (
            <Stat label="Recovered by retry" value={num(reliability.playlist_recovered)} tone={reliability.playlist_recovered > 0 ? "good" : "neutral"}
              sub="auto-retry rescued" info="Videos that failed once then succeeded on the auto-retry. The payoff of the retry pass." />
          )}
        </div>
        {/* Point 3: playlist-video error causes — unit-level, kept out of the standalone figures but
            no longer invisible. Same expandable raw messages. */}
        <Card title={`Playlist video failures · ${win.label}`}
          info="Why individual playlist videos failed (the playlist child-jobs). Unit-level — deliberately separate from the standalone-AI error numbers, but these failures used to be invisible on the whole dashboard. Expand for the raw messages.">
          <OccurredErrors byType={reliability.playlist_errors.by_type} samples={reliability.playlist_errors.samples} />
        </Card>
      </section>

      {/* ── AUDIO & PROVIDER ── */}
      <section className="space-y-3">
        <h2 className="flex items-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Audio &amp; provider<InfoHint text="Audio telemetry (what we download) and AssemblyAI provider health (which models/languages, how loaded)." />
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="Download size" info="Actual bytes pulled over the proxy per job (proxy_bytes). Median / p95 / max. The smaller-audio-format fix should pull the median down over time.">
            <Band label="Downloaded per job (MB)" band={audio.download_mb} fmt={(n) => (n == null ? "—" : `${n} MB`)} />
            <p className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
              <span className="flex items-center text-fg-muted">Wasted on failed jobs
                <InfoHint text="Proxy bytes we pulled for downloads that ultimately failed — behaviour, not money (the euro cost lives in Finance). A rising number means we're paying bandwidth for work that's being thrown away." />
              </span>
              <span className="font-semibold tabular-nums text-fg">{audio.wasted_proxy_mb_failed} MB</span>
            </p>
            <div className="mt-3">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-fg-muted">Audio format</p>
              <Bars data={fmtList(audio.formats, "bg-sky")} />
            </div>
          </Card>
          <Card title="Provider health" info="Which AssemblyAI models the language-router chose, and the detected-language mix. Model split drives cost-of-revenue (Universal-2 vs 3.5-Pro).">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-fg-muted">Model</p>
            <Bars data={fmtList(provider.models, "bg-indigo")} />
            <p className="mb-1.5 mt-3 text-xs uppercase tracking-wide text-fg-muted">Detected language</p>
            <Bars data={fmtList(provider.languages, "bg-violet")} />
          </Card>
        </div>
      </section>

      </>)}

      {/* ── UPTIME (2d) — live from BetterStack (option B) ── */}
      <section className="space-y-3">
        <h2 className="flex items-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Uptime<InfoHint text="Site/API availability + the worker heartbeat, pulled live from BetterStack (uptime.betterstack.com/api/v2). Separate from whether jobs succeed. Green=up, red=down, amber=pending/validating, grey=paused/maintenance." />
        </h2>
        <Card>
          {!uptime.configured ? (
            <div className="text-sm text-fg-muted">
              <p className="font-medium text-fg">Not wired yet</p>
              <p className="mt-1 text-xs">Set <span className="font-mono">BETTERSTACK_API_TOKEN</span> on this app in Vercel and the monitors + worker heartbeat show here live.</p>
            </div>
          ) : !uptime.ok ? (
            <div className="text-sm">
              <p className="font-medium text-warning">BetterStack unreachable</p>
              <p className="mt-1 text-xs text-fg-muted">Couldn&apos;t read the status ({uptime.error ?? "unknown error"}). Token valid? This box self-recovers on the next load.</p>
            </div>
          ) : uptime.items.length === 0 ? (
            <p className="py-2 text-sm text-fg-subtle">No monitors or heartbeats configured in BetterStack yet.</p>
          ) : (
            <div className="space-y-1.5">
              {uptime.items.map((it, i) => (
                <div key={`${it.kind}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${uptimeDot(it.status)}`} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-fg">{it.name}</span>
                    {it.kind === "heartbeat" && <span className="ml-1.5 rounded bg-surface-sunken px-1 text-[10px] uppercase tracking-wide text-fg-subtle">heartbeat</span>}
                    {it.url && <span className="ml-1.5 truncate font-mono text-[11px] text-fg-subtle">{it.url}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-fg-muted">{it.status}</span>
                </div>
              ))}
              <p className="mt-2 border-t pt-2 text-[11px] text-fg-subtle">Live from BetterStack. Full history, response times &amp; incidents live in the BetterStack dashboard.</p>
            </div>
          )}
        </Card>
      </section>

      <p className="border-t pt-3 text-[11px] text-fg-subtle">
        Operations measures behaviour — counts, timing, failures. All money (revenue, cost of revenue, margin) lives in Finance.
      </p>
    </div>
  )
}
