// Mirrors admin_finance_summary(p_from,p_to) JSON + snapshot/expense shapes.

export interface FinanceCor {
  ai_transcription: number
  caption: number
  ai_summary: number
  rag: number
  storage: number
  measured_total: number
  against_revenue: number
  // Stripe fee is COR (F22): purchased at sale, deferred per lot, recognised on consumption (revenue-matched).
  // recognized == the fee portion already inside against_revenue; deferred sits in the Deferred card.
  payment_fee: {
    recognized: number
    deferred: number
    purchased: number
    by_type: Record<string, number>
  }
  // Per-method against-revenue (Σ_user user_period_cor × user_period_share) — per-user, NOT pooled (F1).
  // Sums to against_revenue (incl. payment_fee = recognized fee) → the split line under the COR table reconciles.
  against_revenue_by_method: {
    ai_transcription: number
    caption: number
    ai_summary: number
    rag: number
    storage: number
    payment_fee: number
  }
}

export interface CacheSaving {
  saved_eur: number
  pct: number
}

export interface FinanceScope {
  cash_in: number
  vat: number
  vat_computed: boolean
  vat_unmeasured: { count: number; gross: number }
  // per-land VAT (country ISO-2 of "??" voor onbekend)
  vat_by_country: Record<string, { vat: number; gross: number; count: number; unknown_vat: boolean; rate_implied: number | null }>
  // gebucket voor de aangiftes: nl (eigen btw) · oss (overige EU) · outside (buiten EU-scope, €0) · unknown
  vat_buckets: Partial<Record<"nl" | "oss" | "outside" | "unknown", { vat: number; gross: number; count: number }>>
  revenue_delivered: number
  deferred_balance: number
  credits_sold: number
  credits_consumed: number
  consumed_by_type: { ai_transcription: number; caption: number; ai_summary: number; rag: number }
  purchased_share: number
  balance_cr: number
  payment_methods: string[]
  cor: FinanceCor
  gross_profit: number
  gross_margin: number | null
  measured_opex: {
    goodwill: number
    funnel_loggedin: number
    funnel_anon: number
    radar_fee: number
    radar: {
      screens: number
      billable: number
      successful: number
      declined: number
      blocked: number
      rate: number
      free_until: string | null
      fee: number
    }
    total: number
  }
  entered_opex_total: number
  net_profit: number
  net_margin: number | null
  bank: {
    charged: number
    stripe_fee: number
    settled_computed: number
    net_settlement: number
    vat_owed: number
    revenue_ex_vat: number
  }
  cache_savings: {
    ai_transcription: CacheSaving & { hit_credits: number; total_jobs: number; hit_jobs: number }
    caption: CacheSaving & { hit_count: number; total_count: number }
  }
  deferred: {
    balance: number
    credits: number
    deferred_fee: number
    // null when est_data_sufficient=false (no recent consumption to base a rate on — "insufficient data", not €0)
    est_future_cost: number | null
    est_future_gross: number | null
    est_data_sufficient: boolean
    window_days: number
  }
  storage_bytes: number
  // F3: true when storage COR is prorated from the CURRENT library size (no per-user byte series covering
  // this period yet). The nightly snapshot fills daily_library_bytes; once it spans a window this flips false.
  storage_approx: boolean
  // F15: measured drivers behind each COR/OPEX row, so the UI can render "driver × rate = amount".
  // Every value here is already measured (used to compute the cost above) — it just wasn't surfaced.
  drivers: FinanceDrivers
}

export interface FinanceDrivers {
  ai_transcription: { audio_seconds: number; proxy_bytes: number }
  caption: { proxy_bytes: number }
  ai_summary: { input_tokens: number; cache_tokens: number; output_tokens: number }
  storage: { gb: number; free_gb: number; days_win: number; days_month: number }
  funnel_loggedin: { proxy_bytes: number }
  funnel_anon: { proxy_bytes: number }
  goodwill: { granted_credits: number }
}

export interface EnteredOpexLine {
  id: string
  category: string
  description: string | null
  recurrence: "none" | "monthly" | "yearly"
  spread: "evenly" | "single"
  effective_from: string
  effective_to: string | null
  amount: number
  period_amount: number
  days_applied: number
  days_total: number
}

export interface FinanceSummary {
  period: { from: string; to: string; days: number }
  rates: {
    decodo_eur_per_gb: number
    assemblyai_eur_per_min: number
    deepseek_eur_per_1k_input_tokens: number
    deepseek_eur_per_1k_output_tokens: number
    deepseek_eur_per_1k_cache_hit_tokens: number
    r2_usd_per_gb_month: number | null
    r2_free_gb: number | null
    usd_eur_rate: number | null
  }
  entered_opex: { total: number; by_category: Record<string, number>; lines: EnteredOpexLine[] }
  external: FinanceScope
  internal: FinanceScope
}

// finance_daily_snapshot row (trend source)
export interface SnapshotRow {
  snapshot_date: string
  scope: string
  cash_in: number
  vat: number
  revenue_delivered: number
  net_profit_measured: number
  deferred_balance: number
  cor_ai_transcription: number
  cor_caption: number
  cor_ai_summary: number
  cor_rag: number
  cor_storage: number
}

// opex_expenses row (editable)
export interface ExpenseRow {
  id: string
  category: string
  description: string | null
  amount: number
  spread: "evenly" | "single"
  recurrence: "none" | "monthly" | "yearly"
  effective_from: string
  effective_to: string | null
}

// cost_config editable subset
export interface CostConfigRow {
  id: string
  decodo_eur_per_gb: number
  assemblyai_eur_per_min: number
  deepseek_eur_per_1k_input_tokens: number
  deepseek_eur_per_1k_output_tokens: number
  deepseek_eur_per_1k_cache_hit_tokens: number | null
  r2_usd_per_gb_month: number | null
  usd_eur_rate: number | null
}
