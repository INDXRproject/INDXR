import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { stripe } from "@/lib/stripe"
import { captureStripeFees, resolvePaymentIntentId, extractSessionTax, StripeFeeCapture } from "@/lib/stripe-fees"

export const runtime = "nodejs"

// Backfill-pad voor purchase-rijen. Vult PER VELD de ontbrekende gemeten waarden aan uit Stripe:
//   - fee_details/net_settlement/betaalmethode  ← PaymentIntent→charge→balance_transaction
//   - tax_status/customer_country               ← Checkout Session (automatic_tax + factuuradres)
//   - invoice_tax                               ← de on-demand Invoice (total_taxes[])
//
// SKIP PER VELD, NIET PER SALE. De oude guard sloeg een sale over zodra `fee_details` bestond — die
// vraag ("is er ooit iets aan deze sale gedaan?") hoort bij de fee-backfill, niet bij de BTW/land-backfill
// die erachter staat en niets met fee_details te maken heeft. Gevolg: sales mét fees maar zónder
// customer_country/invoice_tax werden nooit aangevuld. Nu bepaalt elk veld zelf of het ontbreekt.
//
// ?all=1  → herhaal alle velden, ook die al gevuld zijn (voor herverificatie).
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
    const sid = String(meta.stripe_session_id).slice(0, 24)

    // Per-veld skip-vraag: mist DIT veld nog een gemeten waarde? Onafhankelijke velden, eigen bronnen.
    const needFees = all || !Array.isArray(meta.fee_details)
    const needSession = all || meta.customer_country == null || meta.tax_status == null
    const needInvoice = meta.invoice_id != null && (all || meta.invoice_tax == null)

    if (!needFees && !needSession && !needInvoice) {
      report.push({ session: sid, skipped: "all_fields_present" })
      continue
    }

    const updates: Record<string, unknown> = {}
    const did: Record<string, unknown> = { session: sid, created_at: row.created_at }

    try {
      // ── FEES (alleen als fee_details ontbreekt) ────────────────────────────────
      let fees: StripeFeeCapture = {}
      if (needFees) {
        const piId = await resolvePaymentIntentId(
          meta as { payment_intent_id?: string; stripe_session_id?: string },
        )
        if (piId) {
          fees = await captureStripeFees(piId)
          Object.assign(updates, fees)
          did.fees = { updated: true, payment_method: fees.payment_method ?? null, stripe_fee: fees.stripe_fee ?? null }
        } else {
          did.fees = { updated: false, error: "no_payment_intent" }
        }
      } else {
        did.fees = { updated: false, skipped: "already_present" }
      }

      // ── SESSION: tax_status + factuuradres-land (alleen als één van beide ontbreekt) ──
      // Rauwe structuur-dump zodat de optional-chaining-paden geverifieerd kunnen worden (Punt 4).
      if (needSession && meta.stripe_session_id) {
        try {
          const sess = await stripe.checkout.sessions.retrieve(String(meta.stripe_session_id), {
            expand: ["total_details", "customer_details"],
          })
          const sessionTax = { ...extractSessionTax(sess) }
          Object.assign(updates, sessionTax)
          did.session = {
            updated: sessionTax.customer_country != null || sessionTax.tax_status != null,
            backfilled_tax_status: sessionTax.tax_status ?? null,
            backfilled_customer_country: sessionTax.customer_country ?? null,
            structure: {
              automatic_tax: sess.automatic_tax ?? null,
              customer_details_address: sess.customer_details?.address ?? null,
              currency: sess.currency,
            },
          }
        } catch (e) {
          did.session = { updated: false, error: e instanceof Error ? e.message : "unknown" }
        }
      } else {
        did.session = { updated: false, skipped: needSession ? "no_session_id" : "already_present" }
      }

      // ── INVOICE: invoice_tax (alleen als invoice_id bestaat én invoice_tax ontbreekt) ──
      // De invoice draait op session.currency (invoice/route.ts) → invoice_tax staat in die valuta;
      // voor alle bestaande sales EUR. Nieuwere Stripe-API: total_taxes[] i.p.v. tax.
      if (needInvoice) {
        try {
          const invAny = await stripe.invoices.retrieve(String(meta.invoice_id)) as unknown as
            { tax?: number | null; total_taxes?: { amount?: number }[] | null; currency?: string }
          const minor = invAny.tax != null ? invAny.tax
            : Array.isArray(invAny.total_taxes) ? invAny.total_taxes.reduce((s, t) => s + (t.amount ?? 0), 0)
            : null
          const invoiceTax = minor != null ? minor / 100 : null
          if (invoiceTax != null) updates.invoice_tax = invoiceTax
          did.invoice = { updated: invoiceTax != null, backfilled_invoice_tax: invoiceTax }
        } catch (e) {
          did.invoice = { updated: false, error: e instanceof Error ? e.message : "unknown" }
        }
      } else {
        did.invoice = { updated: false, skipped: meta.invoice_id == null ? "no_invoice_id" : "already_present" }
      }

      // ── Wegschrijven (alleen als er echt iets is opgehaald) ────────────────────
      if (Object.keys(updates).length === 0) {
        report.push({ ...did, updated: false, note: "nothing_fetched" })
        continue
      }
      const merged = { ...meta, ...updates }
      const { error: upErr } = await admin
        .from("credit_transactions")
        .update({ metadata: merged })
        .eq("id", row.id)
      if (upErr) {
        report.push({ ...did, updated: false, error: upErr.message })
        continue
      }
      updated++

      // ── Bewijs + sluit-checks (uit merged, dus onafhankelijk van welke velden vers zijn) ──
      const amountPaid = Number(merged.amount_paid ?? 0)
      const amountTax = merged.amount_tax != null ? Number(merged.amount_tax) : null
      const invoiceTaxM = merged.invoice_tax != null ? Number(merged.invoice_tax) : null
      const feeDetails = Array.isArray(merged.fee_details) ? (merged.fee_details as { amount: number }[]) : []
      const feeSum = feeDetails.reduce((s, fd) => s + (fd.amount ?? 0), 0)
      const stripeFee = merged.stripe_fee != null ? Number(merged.stripe_fee) : null
      const netSettle = merged.net_settlement != null ? Number(merged.net_settlement) : null
      const vatMeasured = merged.tax_status === "complete" ? amountTax : (invoiceTaxM ?? null)
      const revExVat = vatMeasured != null ? amountPaid - vatMeasured : amountPaid

      report.push({
        ...did,
        updated: true,
        amount_paid: amountPaid,
        amount_tax: amountTax,
        invoice_tax: invoiceTaxM,
        vat_measured: vatMeasured,
        vat_source: merged.tax_status === "complete" ? "amount_tax(tax_status=complete)"
          : invoiceTaxM != null ? "invoice_tax" : "unknown",
        customer_country: merged.customer_country ?? null,
        stripe_fee_total: stripeFee,
        fee_details_sum: Number(feeSum.toFixed(4)),
        net_settlement: netSettle,
        // sluit-checks
        fee_details_reconciles: stripeFee != null ? Math.abs(feeSum - stripeFee) < 0.01 : null,
        charged_minus_fee_equals_settled:
          stripeFee != null && netSettle != null
            ? Math.abs(amountPaid - stripeFee - netSettle) < 0.01
            : null,
        drag_pct_of_charge: stripeFee != null && amountPaid > 0
          ? Number(((stripeFee / amountPaid) * 100).toFixed(2)) : null,
        drag_pct_of_revenue_ex_vat: stripeFee != null && revExVat > 0
          ? Number(((stripeFee / revExVat) * 100).toFixed(2)) : null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown"
      report.push({ session: sid, updated: false, error: msg })
    }
  }

  return NextResponse.json({ purchases_seen: purchases.length, updated, report })
}
