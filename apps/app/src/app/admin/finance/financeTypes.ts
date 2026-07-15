// Mirrors admin_finance_summary(p_from,p_to) JSON + snapshot/expense shapes.

export interface FinanceCor {
  ai_transcription: number
  caption: number
  ai_summary: number
  rag: number
  storage: number
  measured_total: number
  against_revenue: number
  // per-method against-revenue (gross × purchased_share); sums to against_revenue → COR table reconciles.
  against_revenue_by_method: {
    ai_transcription: number
    caption: number
    ai_summary: number
    rag: number
    storage: number
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
    stripe_fee: number
    stripe_fee_by_type: Record<string, number>
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
    est_future_cost: number
    est_future_gross: number
    window_days: number
  }
  storage_bytes: number
}

export interface EnteredOpexLine {
  id: string
  category: string
  description: string | null
  recurrence: "none" | "monthly"
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
    r2_usd_per_gb_month: number
    r2_free_gb: number
    usd_eur_rate: number
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
  recurrence: "none" | "monthly"
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
