import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { stripe } from "@/lib/stripe"
import { captureStripeFees, resolvePaymentIntentId } from "@/lib/stripe-fees"

export const runtime = "nodejs"

// B4 reconcile-pad: de balance_transaction settle't async, dus de webhook mist de fee vaak op
// checkout-moment. Deze admin-route haalt voor purchase-rijen zonder fee_details de echte
// PaymentIntent→charge→balance_transaction (incl. fee_details + betaalmethode) op en backf't de
// purchase-metadata. Dubbelt als B4-bewijs: retourneert per aankoop de fee_details-uitsplitsing,
// de sluit-check (charged − fee = settled) en de effectieve Stripe-drag (% charge / % omzet ex-BTW).
//
// ?all=1  → herbereken ook rijen die al fee_details hebben (voor herverificatie).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const all = new URL(req.url).searchParams.get("all") === "1"
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from("credit_transactions")
    .select("id, amount, metadata, created_at")
    .eq("type", "credit")
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const purchases = (rows ?? []).filter(
    (r) => r.metadata && (r.metadata as Record<string, unknown>).stripe_session_id,
  )

  const report: Record<string, unknown>[] = []
  let updated = 0

  for (const row of purchases) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const hasFees = Array.isArray(meta.fee_details)
    if (hasFees && !all) {
      report.push({ session: String(meta.stripe_session_id).slice(0, 24), skipped: "already_has_fee_details" })
      continue
    }

    try {
      const piId = await resolvePaymentIntentId(meta as { payment_intent_id?: string; stripe_session_id?: string })
      if (!piId) {
        report.push({ session: String(meta.stripe_session_id).slice(0, 24), error: "no_payment_intent" })
        continue
      }
      const fees = await captureStripeFees(piId)

      // Deel A-bewijs: haal de Checkout Session op om te tonen dat de SESSIE zelf geen tax berekent
      // (automatic_tax uit → total_details.amount_tax = 0). Bevestigt dat het amount_tax=0-gat een
      // CAPTURE-config-kwestie is (automatic_tax staat uit op de session), niet een webhook-bug.
      let sessionAutomaticTax: string | null = null
      let sessionAmountTax: number | null = null
      try {
        if (meta.stripe_session_id) {
          const sess = await stripe.checkout.sessions.retrieve(String(meta.stripe_session_id), {
            expand: ["total_details"],
          })
          sessionAutomaticTax = sess.automatic_tax?.status ?? null
          sessionAmountTax = sess.total_details?.amount_tax != null ? sess.total_details.amount_tax / 100 : null
        }
      } catch { /* session retrieve best-effort */ }

      // fee-velden mergen in de bestaande metadata (audit-backfill; amount/type onaangeroerd).
      const merged = { ...meta, ...fees }
      const { error: upErr } = await admin
        .from("credit_transactions")
        .update({ metadata: merged })
        .eq("id", row.id)
      if (upErr) {
        report.push({ session: String(meta.stripe_session_id).slice(0, 24), error: upErr.message })
        continue
      }
      updated++

      // Bewijs + sluit-checks.
      const amountPaid = Number(meta.amount_paid ?? 0)
      const amountTax = meta.amount_tax != null ? Number(meta.amount_tax) : null
      const feeSum = (fees.fee_details ?? []).reduce((s, fd) => s + fd.amount, 0)
      const revExVat = amountTax != null ? amountPaid - amountTax : amountPaid
      report.push({
        session: String(meta.stripe_session_id).slice(0, 24),
        created_at: row.created_at,
        payment_method: fees.payment_method ?? null,
        amount_paid: amountPaid,
        amount_tax: amountTax,
        vat_computed: amountTax != null && amountTax > 0,
        // Deel A: session-niveau tax-config (bewijs dat de sessie geen tax berekent).
        session_automatic_tax: sessionAutomaticTax,
        session_amount_tax: sessionAmountTax,
        stripe_fee_total: fees.stripe_fee ?? null,
        fee_details: fees.fee_details ?? [],
        fee_details_sum: Number(feeSum.toFixed(4)),
        net_settlement: fees.net_settlement ?? null,
        settlement_currency: fees.settlement_currency ?? null,
        // sluit-checks
        fee_details_reconciles: fees.stripe_fee != null ? Math.abs(feeSum - fees.stripe_fee) < 0.01 : null,
        charged_minus_fee_equals_settled:
          fees.stripe_fee != null && fees.net_settlement != null
            ? Math.abs(amountPaid - fees.stripe_fee - fees.net_settlement) < 0.01
            : null,
        // effectieve drag
        drag_pct_of_charge: fees.stripe_fee != null && amountPaid > 0
          ? Number(((fees.stripe_fee / amountPaid) * 100).toFixed(2)) : null,
        drag_pct_of_revenue_ex_vat: fees.stripe_fee != null && revExVat > 0
          ? Number(((fees.stripe_fee / revExVat) * 100).toFixed(2)) : null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown"
      report.push({ session: String(meta.stripe_session_id).slice(0, 24), error: msg })
    }
  }

  return NextResponse.json({ purchases_seen: purchases.length, updated, report })
}
