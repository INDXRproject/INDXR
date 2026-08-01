// Shared types for the admin control center — mirror the admin_*_summary() RPC JSON shapes.

export interface GeldScope {
  cash_in_gross: number
  vat: number
  revenue_net: number
  purchased_cr: number
  granted_cr: number
  consumed_cr: number
  balance_cr: number
  per_credit_net: number
  consumed_purchased_cr: number
  recognized_revenue: number
  deferred_revenue: number
  consumed_by_type: { ai_transcription: number; caption: number; ai_summary: number; rag: number }
  cor: { ai_transcription: number; caption: number; ai_summary: number; rag: number; total: number }
  cor_against_revenue: number
  granted_delivery_cost: number
  funnel_free_caption_cost: number
  caption_segments: {
    free_loggedin: { count: number; bytes: number }
    paid_after: { count: number; bytes: number }
    paid_caption: { count: number; bytes: number }
  }
  gross_profit: number
  gross_margin: number | null
}

export interface GeldSummary {
  rates: {
    decodo_eur_per_gb: number
    assemblyai_eur_per_min: number
    fixed_monthly_infra_eur: number
    r2_usd_per_gb_month: number
    r2_free_gb: number
    usd_eur_rate: number
  }
  counts: { external_profiles: number; internal_profiles: number }
  opex_global: {
    infra_monthly: number
    ads: number
    funnel_free_captions_anon: number
    funnel_caption_count_anon: number
    funnel_measured: boolean
  }
  cor_storage: {
    external_bytes: number
    internal_bytes: number
    external_gb: number
    free_gb: number
    eur: number
    note: string
  }
  external: GeldScope
  internal: GeldScope
}

export interface GrowthSummary {
  external_total: number
  acquisition: { by_source: Record<string, number>; by_utm: Record<string, number>; cac: number | null }
  activation: { activated: number; rate: number | null }
  monetization: { paying: number; conversion: number | null; ltv_total: number; ltv_avg: number | null }
  retention: { repeat_buyers: number; repeat_rate: number | null }
  window: { from: string | null; to: string | null }
}

export interface OperationsSummary {
  jobs: { total: number; complete: number; error: number; in_flight: number; stuck: number }
  success_rate: number | null
  error_types: Record<string, number>
  error_samples: Record<string, string[]>
  retries: { playlist_retried: number; watchdog: number }
  capacity: {
    queue_depth_now: number
    queue_wait_p50: number | null
    queue_wait_p95: number | null
    // median(processing_seconds / audio_seconds) for AI jobs — length-independent speed. ×3600 = "1h video takes".
    ai_realtime_factor: number | null
    ai_speed_sample: number
  }
  playlist: { total: number; complete: number }
  window: { from: string | null; to: string | null; exclude_internal: boolean }
}

// ── V3 Operations (admin_operations_v3 RPC) — deel 1-5 metrics, job vs unit apart ─────────────────
// `sample` is the n behind the percentiles; sample===0 means NO data (render "no data yet", never 0 —
// an empty queue-wait must not read as instant). p50/p95/max are seconds, except provider_processing_ms
// which is milliseconds.
export interface StatBand { p50: number | null; p95: number | null; max: number | null; sample: number }
export interface OperationsV3 {
  traffic: {
    jobs: { single: number; upload: number; playlist: number; ai_total: number }
    units: { ai_single_upload: number; ai_playlist_videos: number; captions: number }
    captions: { total: number; success: number; cache_hits: number }
  }
  reliability: {
    ai: {
      complete: number; error: number; success_rate: number | null
      by_type: { single: { complete: number; error: number }; upload: { complete: number; error: number } }
    }
    playlist: {
      jobs_total: number; jobs_complete: number; videos_total: number
      videos_complete: number; videos_failed: number; first_pass_failed: number
      // How many playlist jobs actually carry the first_pass_failed capture (non-null). 0 → the
      // metric was just turned on and has no data yet → don't show it next to a filled number.
      first_pass_measured: number
    }
    playlist_recovered: number
    // How many playlist video-results entries carry the attempts/recovered capture yet. 0 → no data.
    attempt_capture_present: number
    // Playlist-video errors (source_kind='playlist' child jobs) — unit-level, kept out of the
    // standalone-AI figures. Same shape as errors.by_type/samples.
    playlist_errors: { total: number; by_type: Record<string, number>; samples: Record<string, string[]> }
  }
  // provider_turnaround (submitted→completed) is the primary latency number — always measurable.
  // queue_wait_ai + provider_processing_ms are secondary (only populate under real queueing).
  latency: { provider_turnaround: StatBand; queue_wait_ai: StatBand; provider_processing_ms: StatBand; download_seconds: StatBand }
  errors: {
    total: number
    by_type: Record<string, number>
    // Up to 3 recent raw error_message per error_type (drill-down); keyed by the same slug as by_type.
    samples: Record<string, string[]>
    download_by_duration: { bucket: string; total: number; dl_failures: number; pct: number }[]
    daily: { day: string; jobs: number; errors: number }[]
  }
  audio: { formats: Record<string, number>; download_mb: StatBand; wasted_proxy_mb_failed: number }
  provider: {
    languages: Record<string, number>; models: Record<string, number>
    concurrency_limit: number | null; in_flight_now: number; saturation_pct: number | null
    // Worker-slot-saturatie: actief-verwerkende jobs vs de ARQ worker-concurrency-cap (max_jobs).
    // De tightere, lokale bottleneck — het echte "zitten we vol"-signaal.
    worker_concurrency_limit: number | null; worker_slots_used: number; worker_saturation_pct: number | null
  }
  capacity: { in_flight: number; stuck: number; queue_depth_now: number }
  window: { from: string | null; to: string | null; exclude_internal: boolean }
}

// ── Dashboard time-window (Operations + Growth) ────────────────────────────────────────────────────
export const WINDOW_KEYS = ["24h", "7d", "30d", "all"] as const
export type WindowKey = (typeof WINDOW_KEYS)[number]
const WINDOW_LABEL: Record<WindowKey, string> = {
  "24h": "last 24 hours", "7d": "last 7 days", "30d": "last 30 days", "all": "all time",
}
// NULL from/to → lifetime (the RPC treats NULL as "no bound"). Computed per request (server component).
export function resolveWindow(w: string | undefined): { from: string | null; to: string | null; key: WindowKey; label: string } {
  const key: WindowKey = (WINDOW_KEYS as readonly string[]).includes(w ?? "") ? (w as WindowKey) : "7d"
  if (key === "all") return { from: null, to: null, key, label: WINDOW_LABEL.all }
  const days = key === "24h" ? 1 : key === "30d" ? 30 : 7
  const to = new Date()
  const from = new Date(to.getTime() - days * 86_400_000)
  return { from: from.toISOString(), to: to.toISOString(), key, label: WINDOW_LABEL[key] }
}

// ── KPI health thresholds → color ──────────────────────────────────────────────────────────────────
export type Health = "good" | "warn" | "bad" | "neutral"
export const HEALTH_CLS: Record<Health, string> = {
  good: "text-success", warn: "text-warning", bad: "text-error", neutral: "text-fg-strong",
}
// Below a small sample the rate is noise → neutral (don't flash red on 1 job).
export function successHealth(rate: number | null, sample: number): Health {
  if (rate == null || sample < 5) return "neutral"
  return rate >= 0.95 ? "good" : rate >= 0.85 ? "warn" : "bad"
}
export function queueWaitHealth(sec: number | null): Health {
  if (sec == null) return "neutral"
  return sec <= 30 ? "good" : sec <= 120 ? "warn" : "bad"
}

// ── Error taxonomy in plain language (source: docs/wiki/operations/error-taxonomy.md + backend classifier) ──
export type ErrorFault = "youtube" | "user" | "us" | "transient" | "unknown"
export const FAULT_META: Record<ErrorFault, { label: string; cls: string }> = {
  youtube:   { label: "YouTube",     cls: "text-warning" },
  user:      { label: "User",        cls: "text-fg-muted" },
  us:        { label: "Our system",  cls: "text-error" },
  transient: { label: "Transient",   cls: "text-sky" },
  unknown:   { label: "Unknown",     cls: "text-violet" },
}
export const ERROR_META: Record<string, { label: string; fault: ErrorFault; hint: string }> = {
  bot_detection:              { label: "Bot detection (YouTube blocked us)", fault: "youtube",   hint: "YouTube rate-limited us as a bot. Auto-retry rarely helps; the user can wait or use AI transcription." },
  timeout:                    { label: "Network timeout",                    fault: "transient", hint: "The request genuinely timed out (slow server / gateway timeout). Transient — auto-retried on a fresh IP." },
  connection_error:           { label: "Connection / TLS dropped",           fault: "transient", hint: "The connection to YouTube dropped mid-request — reset, SSL/TLS handshake, EOF, or DNS. Transient — auto-retried on a fresh proxy IP. (Previously mislabelled as 'timeout'.)" },
  server_error:               { label: "Upstream server error (5xx)",        fault: "transient", hint: "YouTube or an upstream server returned a 5xx (500/502/503). Transient — auto-retried." },
  partial_write:              { label: "Download cut off",                   fault: "transient", hint: "The proxy IP dropped mid-download. Auto-retried on a fresh IP (max 3)." },
  proxy_error:                { label: "Proxy auth/tunnel failure",          fault: "us",        hint: "Our proxy (Decodo) rejected the connection — a credential/config issue, not fixed by a plain retry." },
  ytdlp_parse:                { label: "YouTube parser broke (yt-dlp)",      fault: "us",        hint: "yt-dlp couldn't read YouTube's player response — usually needs a yt-dlp version bump. Watch for spikes after YouTube changes." },
  youtube_restricted:         { label: "Video unavailable on YouTube",       fault: "youtube",   hint: "Removed, private, geo-blocked, or the account was terminated. Not recoverable." },
  age_restricted:             { label: "Age-restricted video",               fault: "youtube",   hint: "Needs a logged-in account; we don't log in by design." },
  members_only:               { label: "Members-only video",                 fault: "youtube",   hint: "Only channel members can view it. Inaccessible." },
  no_captions:                { label: "No captions available",              fault: "youtube",   hint: "The video has no subtitles. User can retry with AI transcription." },
  no_speech:                  { label: "No speech found",                    fault: "user",      hint: "AI ran but found only music/silence. Credits auto-refunded." },
  insufficient_credits:       { label: "Not enough credits",                 fault: "user",      hint: "Balance was below the video's cost. That video is skipped." },
  extraction_error:           { label: "Unknown download failure",           fault: "unknown",   hint: "Didn't match a known cause; the raw error is logged for triage. No auto-retry." },
  watchdog_permanent_failure: { label: "Gave up after retries",              fault: "us",        hint: "The watchdog retried twice and failed; credits auto-refunded." },
  uncategorized:              { label: "Unlabelled error",                   fault: "unknown",   hint: "Error rows with no type stamped (legacy/edge cases). Not a real category." },
  stale_abandoned:            { label: "Abandoned (stalled)",                fault: "us",        hint: "The watchdog gave up on a job that stopped making progress." },
  stuck_pending:              { label: "Never picked up",                    fault: "us",        hint: "The job sat in the queue and the worker never started it (ARQ pickup missed); the watchdog closed it." },
  worker_crashed:             { label: "Worker crashed mid-job",             fault: "us",        hint: "The worker stopped sending heartbeats during processing; the watchdog closed the job." },
  credit_check_error:         { label: "Credit check failed",                fault: "us",        hint: "Internal error while checking the balance." },
  credit_deduction_failed:    { label: "Credit deduction failed",            fault: "us",        hint: "Internal error while deducting credits." },
  validation_error:           { label: "Invalid input",                      fault: "user",      hint: "The request failed validation." },
  duration_error:             { label: "Duration error",                     fault: "us",        hint: "Could not determine the video length." },
  compression_error:          { label: "Audio compression error",            fault: "us",        hint: "Internal error while preparing the audio." },
  api_error:                  { label: "Provider API error",                 fault: "us",        hint: "AssemblyAI or another provider returned an error." },
  internal_error:             { label: "Internal error",                     fault: "us",        hint: "Unexpected server error." },
}
export function errorMeta(slug: string): { label: string; fault: ErrorFault; hint: string } {
  return ERROR_META[slug] ?? { label: slug, fault: "unknown", hint: "No description available." }
}

// Shared formatters.
export function eur(n: number, precise = false): string {
  if (precise && n !== 0 && Math.abs(n) < 0.01) return `€${n.toFixed(4)}`
  return `€${n.toFixed(2)}`
}

export function pct(n: number | null, dash = "—"): string {
  return n == null ? dash : `${(n * 100).toFixed(1)}%`
}

// Product-type presentation (OKLCH badge families).
export const TYPE_META: Record<
  "ai_transcription" | "caption" | "ai_summary" | "rag",
  { label: string; text: string; bg: string; bar: string }
> = {
  ai_transcription: { label: "AI transcription", text: "text-indigo", bg: "bg-indigo-subtle", bar: "bg-indigo" },
  caption: { label: "YouTube captions", text: "text-sky", bg: "bg-sky-subtle", bar: "bg-sky" },
  ai_summary: { label: "AI summary", text: "text-violet", bg: "bg-violet-subtle", bar: "bg-violet" },
  rag: { label: "RAG", text: "text-teal", bg: "bg-teal-subtle", bar: "bg-teal" },
}
