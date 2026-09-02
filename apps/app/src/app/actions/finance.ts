"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== process.env.ADMIN_USER_ID) throw new Error("Unauthorized")
  return createAdminClient()
}

function lastDayOfMonthISO(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
}
function firstDayNextMonthISO(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)
}

export interface ExpenseInput {
  category: string
  description?: string
  amount: number
  spread: "evenly" | "single"
  recurrence: "none" | "monthly" | "yearly"
  effective_from: string
  effective_to?: string | null
}

export async function addExpense(input: ExpenseInput) {
  const admin = await requireAdmin()
  const amount = Number(input.amount)
  if (!input.category || !isFinite(amount) || amount < 0) throw new Error("Invalid expense")
  const { error } = await admin.from("opex_expenses").insert({
    period: input.effective_from,
    category: input.category.trim(),
    description: input.description?.trim() || null,
    note: input.description?.trim() || null,
    eur: amount,
    amount,
    spread: input.spread,
    recurrence: input.recurrence,
    effective_from: input.effective_from,
    effective_to: input.recurrence === "none" && input.spread === "single"
      ? input.effective_from
      : input.effective_to ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/finance")
}

// Bedrag-edit op een reeks: "changed from this month" (sluit oude reeks af + nieuwe reeks vanaf volgende
// maand — geschiedenis blijft) vs "correct" (in-place, raakt álle occurrences — bewuste keuze).
export async function updateExpenseAmount(id: string, newAmount: number, mode: "from_this_month" | "correct") {
  const admin = await requireAdmin()
  const amount = Number(newAmount)
  if (!isFinite(amount) || amount < 0) throw new Error("Invalid amount")

  if (mode === "correct") {
    const { error } = await admin.from("opex_expenses").update({ amount, eur: amount }).eq("id", id)
    if (error) throw new Error(error.message)
    revalidatePath("/admin/finance")
    return
  }

  // from_this_month: close old series end of this month, open new series next month.
  const { data: row, error: readErr } = await admin
    .from("opex_expenses").select("*").eq("id", id).single()
  if (readErr || !row) throw new Error(readErr?.message || "Expense not found")
  const now = new Date()
  const { error: closeErr } = await admin
    .from("opex_expenses").update({ effective_to: lastDayOfMonthISO(now) }).eq("id", id)
  if (closeErr) throw new Error(closeErr.message)
  const startNext = firstDayNextMonthISO(now)
  const { error: insErr } = await admin.from("opex_expenses").insert({
    period: startNext,
    category: row.category,
    description: row.description ?? row.note,
    note: row.note ?? row.description,
    eur: amount, amount,
    spread: row.spread, recurrence: row.recurrence,
    effective_from: startNext, effective_to: null,
  })
  if (insErr) throw new Error(insErr.message)
  revalidatePath("/admin/finance")
}

export async function deleteExpense(id: string) {
  const admin = await requireAdmin()
  const { error } = await admin.from("opex_expenses").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/finance")
}

// CSV-import (datum,bedrag[,categorie,omschrijving]) → één none/single-regel per dag.
export async function importExpenseCsv(
  rows: { date: string; amount: number; category?: string; description?: string }[],
) {
  const admin = await requireAdmin()
  const clean = rows
    .filter((r) => r.date && isFinite(Number(r.amount)) && Number(r.amount) >= 0)
    .map((r) => ({
      period: r.date,
      category: (r.category || "ads").trim(),
      description: r.description?.trim() || null,
      note: r.description?.trim() || null,
      eur: Number(r.amount),
      amount: Number(r.amount),
      spread: "single" as const,
      recurrence: "none" as const,
      effective_from: r.date,
      effective_to: r.date,
    }))
  if (!clean.length) throw new Error("No valid CSV rows")
  const { error } = await admin.from("opex_expenses").insert(clean)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/finance")
  return clean.length
}

const TARIFF_FIELDS = new Set([
  "decodo_eur_per_gb", "assemblyai_eur_per_min",
  "assemblyai_llm_usd_per_1m_input_tokens", "assemblyai_llm_usd_per_1m_output_tokens",
  "r2_usd_per_gb_month", "usd_eur_rate",
])

export async function updateTariff(id: string, field: string, value: number) {
  const admin = await requireAdmin()
  if (!TARIFF_FIELDS.has(field)) throw new Error("Unknown tariff field")
  const v = Number(value)
  if (!isFinite(v) || v < 0) throw new Error("Invalid value")
  const { error } = await admin.from("cost_config").update({ [field]: v }).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/finance")
}

export async function updateFinanceSetting(key: string, value: unknown) {
  const admin = await requireAdmin()
  const { error } = await admin
    .from("finance_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/finance")
}
