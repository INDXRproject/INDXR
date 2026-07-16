"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@indxr/shared/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@indxr/shared/components/ui/tabs"
import { Button } from "@indxr/shared/components/ui/button"
import { Input } from "@indxr/shared/components/ui/input"
import { eur } from "../adminTypes"
import type { ExpenseRow, CostConfigRow, EnteredOpexLine } from "./financeTypes"
import {
  addExpense, updateExpenseAmount, deleteExpense, importExpenseCsv, updateTariff, updateFinanceSetting,
} from "@/app/actions/finance"

const TARIFFS: { field: keyof CostConfigRow; label: string }[] = [
  { field: "decodo_eur_per_gb", label: "Decodo €/GB" },
  { field: "assemblyai_eur_per_min", label: "AssemblyAI €/min" },
  { field: "deepseek_eur_per_1k_input_tokens", label: "DeepSeek €/1k input" },
  { field: "deepseek_eur_per_1k_output_tokens", label: "DeepSeek €/1k output" },
  { field: "deepseek_eur_per_1k_cache_hit_tokens", label: "DeepSeek €/1k cache-hit" },
  { field: "r2_usd_per_gb_month", label: "R2 $/GB·month" },
  { field: "usd_eur_rate", label: "USD→EUR rate" },
]

function today(): string { return new Date().toISOString().slice(0, 10) }

export function FinanceSettings({
  expenses, costConfig, deferredWindowDays, enteredLines,
}: {
  expenses: ExpenseRow[]
  costConfig: CostConfigRow | null
  deferredWindowDays: number
  enteredLines: EnteredOpexLine[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const run = (fn: () => Promise<unknown>) => {
    setErr(null)
    start(async () => {
      try { await fn(); router.refresh() } catch (e) { setErr(e instanceof Error ? e.message : "Failed") }
    })
  }
  const fraction = (id: string) => {
    const l = enteredLines.find((x) => x.id === id)
    return l ? `${l.days_applied} of ${l.days_total} days · ${eur(l.period_amount)} this period` : null
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="rounded-md border px-2.5 py-1 text-sm hover:bg-surface-elevated" aria-label="Finance settings" title="Settings">⚙</button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Finance settings</DialogTitle></DialogHeader>
        {err && <p className="rounded-md bg-error-subtle px-3 py-2 text-sm text-error">{err}</p>}
        <Tabs defaultValue="expenses">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
            <TabsTrigger value="deferred">Deferred mix</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <AddExpense onAdd={(inp) => run(() => addExpense(inp))} pending={pending} />
            <ImportCsv onImport={(rows) => run(() => importExpenseCsv(rows))} pending={pending} />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {expenses.length === 0 && <p className="text-sm text-fg-muted">No entered expenses yet.</p>}
              {expenses.map((e) => (
                <ExpenseItem key={e.id} e={e} fraction={fraction(e.id)} pending={pending}
                  onDelete={() => run(() => deleteExpense(e.id))}
                  onEditAmount={(amt, mode) => run(() => updateExpenseAmount(e.id, amt, mode))} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tariffs" className="space-y-2">
            {!costConfig && <p className="text-sm text-fg-muted">No cost_config row.</p>}
            {costConfig && TARIFFS.map((t) => (
              <TariffRow key={t.field} label={t.label} value={costConfig[t.field] as number | null} pending={pending}
                onSave={(v) => run(() => updateTariff(costConfig.id, t.field as string, v))} />
            ))}
            <p className="text-xs text-fg-subtle">Editing a rate updates the current cost_config row — it re-prices measured COR immediately.</p>
          </TabsContent>

          <TabsContent value="deferred" className="space-y-3">
            <p className="text-sm text-fg-muted">Window used to estimate the cost to deliver deferred credits from the recent usage mix.</p>
            <div className="flex gap-1">
              {[30, 60, 90].map((d) => (
                <button key={d} disabled={pending}
                  onClick={() => run(() => updateFinanceSetting("deferred_window_days", d))}
                  className={`rounded-md border px-3 py-1.5 text-sm ${deferredWindowDays === d ? "bg-accent-subtle text-accent font-medium" : "hover:bg-surface-elevated"}`}>
                  {d} days
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ExpenseItem({
  e, fraction, pending, onDelete, onEditAmount,
}: {
  e: ExpenseRow; fraction: string | null; pending: boolean
  onDelete: () => void; onEditAmount: (amt: number, mode: "from_this_month" | "correct") => void
}) {
  const [editing, setEditing] = useState(false)
  const [amt, setAmt] = useState(String(e.amount))
  return (
    <div className="rounded-lg border bg-surface p-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium">{e.category}</span>
          {e.description && <span className="text-fg-muted"> · {e.description}</span>}
          <div className="text-xs text-fg-muted">
            {eur(e.amount)} · {e.recurrence === "monthly" ? "monthly" : e.recurrence === "yearly" ? "yearly" : "one-off"} · {e.spread} · from {e.effective_from}
            {e.effective_to ? ` to ${e.effective_to}` : ""}
            {fraction && <> · <span className="text-accent">{fraction}</span></>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setEditing((v) => !v)} className="rounded border px-2 py-0.5 text-xs hover:bg-surface-elevated">Edit</button>
          <button onClick={onDelete} disabled={pending} className="rounded border px-2 py-0.5 text-xs text-error hover:bg-error-subtle">Delete</button>
        </div>
      </div>
      {editing && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2">
          <Input type="number" step="0.01" value={amt} onChange={(ev) => setAmt(ev.target.value)} className="w-28" />
          {e.recurrence === "monthly" ? (
            <>
              <Button size="sm" disabled={pending} onClick={() => { onEditAmount(Number(amt), "from_this_month"); setEditing(false) }}>Changed from this month</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => { onEditAmount(Number(amt), "correct"); setEditing(false) }}>Correct a mistake</Button>
            </>
          ) : (
            <Button size="sm" disabled={pending} onClick={() => { onEditAmount(Number(amt), "correct"); setEditing(false) }}>Save</Button>
          )}
        </div>
      )}
    </div>
  )
}

function TariffRow({ label, value, pending, onSave }: { label: string; value: number | null; pending: boolean; onSave: (v: number) => void }) {
  const [v, setV] = useState(value == null ? "" : String(value))
  const dirty = v !== (value == null ? "" : String(value))
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-fg-muted">{label}</span>
      <div className="flex items-center gap-1">
        <Input type="number" step="any" value={v} onChange={(e) => setV(e.target.value)} className="w-32" />
        <Button size="sm" variant="outline" disabled={pending || !dirty || v === ""} onClick={() => onSave(Number(v))}>Save</Button>
      </div>
    </div>
  )
}

// Services already measured per-use in COR (§3d): entering their invoice as OPEX double-counts the measured part.
const COR_MEASURED_SERVICES = ["assemblyai", "deepseek", "decodo", "proxy", "cloudflare", " r2", "storage"]

function AddExpense({ onAdd, pending }: { onAdd: (inp: { category: string; description?: string; amount: number; spread: "evenly" | "single"; recurrence: "none" | "monthly" | "yearly"; effective_from: string; effective_to?: string | null }) => void; pending: boolean }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState("infra")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [recurrence, setRecurrence] = useState<"none" | "monthly" | "yearly">("monthly")
  const [spread, setSpread] = useState<"evenly" | "single">("evenly")
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState("")
  const measuredHit = COR_MEASURED_SERVICES.find((k) => ` ${category} ${description} `.toLowerCase().includes(k))
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>＋ Add expense</Button>
  return (
    <div className="space-y-2 rounded-lg border bg-surface p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Category (infra/ads/…)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input type="number" step="0.01" placeholder="Amount €" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="flex items-center gap-1">
          <span className="text-xs text-fg-muted">from</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-xs text-fg-muted">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {measuredHit && (
        <p className="rounded-md bg-warning-subtle px-2 py-1.5 text-[11px] text-warning-fg">
          ⚠ “{measuredHit.trim()}” is al per gebruik in COR gemeten (AssemblyAI/DeepSeek/Decodo/R2). Als OPEX invoeren telt
          dubbel. Voer alleen het reconciliatie-gat in (factuur − gemeten), niet de volle factuur.
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-sm">
        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as "none" | "monthly" | "yearly")} className="rounded-md border bg-bg px-2 py-1">
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="none">One-off / custom period</option>
        </select>
        <select value={spread} onChange={(e) => setSpread(e.target.value as "evenly" | "single")} className="rounded-md border bg-bg px-2 py-1">
          <option value="evenly">Spread evenly</option>
          <option value="single">Single day</option>
        </select>
        <Button size="sm" disabled={pending || !amount} onClick={() => { onAdd({ category, description, amount: Number(amount), spread, recurrence, effective_from: from, effective_to: to || null }); setOpen(false); setAmount(""); setDescription(""); setTo("") }}>Add</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <p className="text-[11px] text-fg-subtle">
        Monthly/Yearly recur until the “to” date (leave empty = open-ended). One-off = single day (spread=single) or a custom
        period from→to (spread=evenly, prorated). Yearly evenly spreads a prepayment over its 12-month term; single books it on the pay day.
      </p>
    </div>
  )
}

function ImportCsv({ onImport, pending }: { onImport: (rows: { date: string; amount: number; category?: string; description?: string }[]) => void; pending: boolean }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const parse = () => {
    const rows = text.trim().split("\n").map((line) => {
      const [date, amount, category, description] = line.split(",").map((x) => x.trim())
      return { date, amount: Number(amount), category, description }
    }).filter((r) => r.date && isFinite(r.amount))
    if (rows.length) { onImport(rows); setOpen(false); setText("") }
  }
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Import CSV</Button>
  return (
    <div className="space-y-2 rounded-lg border bg-surface p-3">
      <p className="text-xs text-fg-muted">One row per line: <code>date,amount[,category,description]</code> — creates one single-day expense per row.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
        className="w-full rounded-md border bg-bg p-2 font-mono text-xs" placeholder="2026-07-10,12.50,ads,Google Ads" />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending || !text.trim()} onClick={parse}>Import</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}
