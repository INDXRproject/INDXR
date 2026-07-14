import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

// B4 — Stripe-kosten sluitend capturen. PRINCIPE: boek Stripe's tarievenlijst NIET na in code.
// We lezen Stripe's EIGEN balance_transaction.fee_details (self-describing: type+amount+currency per
// component). Het totaal (balance_transaction.fee) is leidend voor de P&L; de details + betaalmethode
// voeden de UI. Geen hardcoded 1,5% / €0,25 / 0,4% — rates verouderen en verschillen per methode/herkomst.

export interface StripeFeeDetail {
  type: string
  amount: number // major units (EUR), in settlement currency
  currency: string
  description: string | null
}

export interface StripeFeeCapture {
  payment_intent_id?: string
  stripe_fee?: number // total, leidend (balance_transaction.fee)
  net_settlement?: number // balance_transaction.net
  settlement_currency?: string
  balance_transaction_id?: string
  fee_details?: StripeFeeDetail[]
  payment_method?: string // charge.payment_method_details.type (card/ideal/…) — forward-only dimensie
}

// Haal fee/net/fee_details/betaalmethode uit de charge van een PaymentIntent.
// De balance_transaction settle't async → kan bij checkout.session.completed nog ontbreken; dan blijven
// de fee-velden weg (backfillbaar via het reconcile-pad). Alleen de PI-id wordt altijd teruggegeven.
export async function captureStripeFees(piId: string): Promise<StripeFeeCapture> {
  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ['latest_charge.balance_transaction'],
  })
  const out: StripeFeeCapture = { payment_intent_id: pi.id }

  const charge = pi.latest_charge as Stripe.Charge | null
  if (charge?.payment_method_details?.type) {
    out.payment_method = charge.payment_method_details.type
  }

  const bt = charge?.balance_transaction
  if (bt && typeof bt !== 'string') {
    // fee/net staan in de minor units van de SETTLEMENT-valuta (settlement_currency legt vast welke).
    out.stripe_fee = bt.fee / 100
    out.net_settlement = bt.net / 100
    out.settlement_currency = bt.currency
    out.balance_transaction_id = bt.id
    out.fee_details = (bt.fee_details || []).map((fd) => ({
      type: fd.type,
      amount: fd.amount / 100,
      currency: fd.currency,
      description: fd.description ?? null,
    }))
  }
  return out
}

// Bepaal de PaymentIntent-id uit purchase-metadata; val terug op de Checkout Session als die ontbreekt
// (oudere sales legden payment_intent_id nog niet vast).
export async function resolvePaymentIntentId(
  meta: { payment_intent_id?: string; stripe_session_id?: string },
): Promise<string | null> {
  if (meta.payment_intent_id) return meta.payment_intent_id
  if (!meta.stripe_session_id) return null
  const session = await stripe.checkout.sessions.retrieve(meta.stripe_session_id)
  if (typeof session.payment_intent === 'string') return session.payment_intent
  return session.payment_intent?.id ?? null
}
