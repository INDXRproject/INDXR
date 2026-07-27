import type { ReactNode } from "react"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import {
  pct, resolveWindow, errorMeta, FAULT_META, HEALTH_CLS,
  type OperationsV3, type StatBand, type Health,
} from "../adminTypes"
import { DashboardControls } from "../_components/DashboardControls"
import { InfoHint } from "../_components/InfoHint"

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

// median / p95 / max band. sample===0 → "no data yet" (empty must never read as 0/instant).
function Band({ label, band, fmt, info, tone = "neutral" }: {
  label: string; band: StatBand; fmt: (n: number | null) => string; info?: string; tone?: Health
}) {
  const empty = band.sample === 0
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="flex items-center text-xs uppercase tracking-wide text-fg-muted">{label}{info && <InfoHint text={info} />}</p>
      {empty ? (
        <p className="mt-1 text-sm text-fg-subtle italic">no data yet</p>
      ) : (
        <>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${HEALTH_CLS[tone]}`}>{fmt(band.p50)}<span className="ml-1 text-xs font-normal text-fg-muted">median</span></p>
          <p className="text-xs text-fg-muted tabular-nums">p95 {fmt(band.p95)} · max {fmt(band.max)} · n={band.sample}</p>
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

export default async function AdminOperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const win = resolveWindow(sp.w)
  const excludeInternal = sp.test === "real"

  const admin = createAdminClient()
  const { data } = await admin.rpc("admin_operations_v3", {
    p_from: win.from, p_to: win.to, p_exclude_internal: excludeInternal,
  })
  const o = data as OperationsV3 | null
  if (!o) {
    return <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">Operations data unavailable.</div>
  }

  const { traffic, reliability, latency, errors, audio, provider, capacity } = o
  const aiFinished = reliability.ai.complete + reliability.ai.error
  const errorPct = traffic.jobs.ai_total > 0 ? errors.total / traffic.jobs.ai_total : null

  const errorRows = Object.entries(errors.by_type)
    .map(([slug, value]) => ({ slug, value, meta: errorMeta(slug) }))
    .sort((a, b) => b.value - a.value)

  const fmtList = (rec: Record<string, number>, cls?: string) =>
    Object.entries(rec).map(([label, value]) => ({ label, value, cls })).sort((a, b) => b.value - a.value)

  // playlist reliability derived
  const pl = reliability.playlist
  const plVideoSuccess = pl.videos_total > 0 ? pl.videos_complete / pl.videos_total : null
  const satTone: Health = provider.saturation_pct == null ? "neutral"
    : provider.saturation_pct >= 90 ? "bad" : provider.saturation_pct >= 60 ? "warn" : "good"

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

      {/* ── LIVE NOW — real-time, window-independent ── */}
      <Card className="!bg-surface-sunken">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-fg-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" /> Live right now
          <InfoHint text="Job states this instant, independent of the window above. 'Stuck' = an in-progress job whose heartbeat went stale (the watchdog will recover or refund it). Saturation = jobs transcribing now vs the AssemblyAI concurrency limit." />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><p className="text-2xl font-bold tabular-nums">{capacity.in_flight}</p><p className="text-xs text-fg-muted">processing</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{capacity.queue_depth_now}</p><p className="text-xs text-fg-muted">in queue</p></div>
          <div>
            <p className={`text-2xl font-bold tabular-nums ${capacity.stuck > 0 ? "text-error" : "text-fg-strong"}`}>{capacity.stuck}</p>
            <p className="text-xs text-fg-muted">stuck</p>
          </div>
          <div>
            <p className={`text-2xl font-bold tabular-nums ${HEALTH_CLS[satTone]}`}>{provider.saturation_pct == null ? "—" : `${provider.saturation_pct}%`}</p>
            <p className="text-xs text-fg-muted">AssemblyAI load ({provider.in_flight_now}/{provider.concurrency_limit ?? "?"})</p>
          </div>
        </div>
      </Card>

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
            info="Free auto-caption extractions (usage_logs). Always 0 credits; kept separate from paid AI jobs." />
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
            <p className="mt-3 border-t pt-2 text-[11px] text-fg-subtle">Bar length = failure %, scaled to the worst bucket. "unknown" = pre-reservation jobs with no length recorded.</p>
          </Card>

          <Card title={`Error types · ${win.label}`}
            info="Every failure grouped by cause. 'Our system' errors are on us to fix; 'YouTube'/'User' are expected. 'Transient' auto-retries on a fresh proxy IP.">
            {errorRows.length === 0 ? (
              <p className="py-6 text-sm text-fg-subtle">{traffic.jobs.ai_total === 0 ? "No jobs in this window." : "No errors. 🎉"}</p>
            ) : (
              <div className="space-y-1.5">
                {errorRows.map((e) => (
                  <div key={e.slug} className="flex items-start gap-2 text-xs">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full bg-current ${FAULT_META[e.meta.fault].cls}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-fg">{e.meta.label}</span>
                        <span className="font-semibold tabular-nums text-fg">{e.value}</span>
                      </span>
                      <span className={`text-[11px] ${FAULT_META[e.meta.fault].cls}`}>{FAULT_META[e.meta.fault].label}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
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
          Latency<InfoHint text="How long each phase takes. Shown as median / p95 / max, never a blended average. A phase with no completed jobs yet reads 'no data yet' — an empty queue-wait is not zero." />
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Band label="AssemblyAI queue wait" band={latency.queue_wait_ai} fmt={secs}
            info="Time a submitted job waits in AssemblyAI's queue before processing starts (submitted → processing). This is the metric this whole rework was built for. A short job that finishes between two polls has no measured wait — it's excluded, not counted as 0." />
          <Band label="AI processing time" band={latency.provider_processing_ms} fmt={ms}
            info="How long AssemblyAI spends actually transcribing (processing → completed), from our polling. Median / p95 / max." />
          <Band label="Download + prep" band={latency.download_seconds} fmt={secs}
            info="Audio download + ffmpeg, from job start to AssemblyAI submit. Watch this against the new smaller-audio format — it should trend down." />
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
          <Stat label="First-pass failures" value={num(pl.first_pass_failed)} sub="before auto-retry"
            info="Videos that failed on the FIRST attempt (snapshot before the retry pass). first_pass_failed − recovered = the retry's net rescue. Only populated for jobs run after the capture landed." />
          <Stat label="Recovered by retry" value={num(reliability.playlist_recovered)} tone={reliability.playlist_recovered > 0 ? "good" : "neutral"}
            sub="auto-retry rescued" info="Videos that failed once then succeeded on the auto-retry. The payoff of the retry pass." />
        </div>
      </section>

      {/* ── AUDIO & PROVIDER ── */}
      <section className="space-y-3">
        <h2 className="flex items-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Audio &amp; provider<InfoHint text="Audio telemetry (what we download) and AssemblyAI provider health (which models/languages, how loaded)." />
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="Download size" info="Actual bytes pulled over the proxy per job (proxy_bytes). Median / p95 / max. The smaller-audio-format fix should pull the median down over time.">
            <Band label="Downloaded per job (MB)" band={audio.download_mb} fmt={(n) => (n == null ? "—" : `${n} MB`)} />
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

      <p className="border-t pt-3 text-[11px] text-fg-subtle">
        Operations measures behaviour — counts, timing, failures. All money (revenue, cost of revenue, margin) lives in Finance.
      </p>
    </div>
  )
}
