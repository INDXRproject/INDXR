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
}

export interface OperationsSummary {
  jobs: { total: number; complete: number; error: number; in_flight: number; stuck: number }
  success_rate: number | null
  error_types: Record<string, number>
  retries: { playlist_retried: number; watchdog: number }
  capacity: { queue_depth_now: number; avg_queue_wait_sec: number | null; avg_processing_sec: number | null }
  playlist: { total: number; complete: number }
  // F17: external-service health. Only DeepSeek has an alert-worthy (prepaid) balance; Decodo auto-refills
  // and AssemblyAI has no API, so neither is polled here.
  services: {
    deepseek: {
      balance: number | null
      currency: string | null
      threshold: number
      status: "ok" | "low" | "unavailable"
      last_success_at: string | null
      last_error: string | null
    }
  }
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
  caption: { label: "Auto-captions", text: "text-sky", bg: "bg-sky-subtle", bar: "bg-sky" },
  ai_summary: { label: "AI summary", text: "text-violet", bg: "bg-violet-subtle", bar: "bg-violet" },
  rag: { label: "RAG", text: "text-teal", bg: "bg-teal-subtle", bar: "bg-teal" },
}
