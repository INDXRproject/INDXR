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
  stripe_fee?: number // total, leidend (balance_transaction.fee), in settlement-valuta
  net_settlement?: number // balance_transaction.net, settlement-valuta
  settlement_amount?: number // balance_transaction.amount — BRUTO in settlement-valuta (EUR). ÉÉN P&L-bron.
  settlement_currency?: string
  exchange_rate?: number // balance_transaction.exchange_rate — presentment × rate = settlement (EUR)
  balance_transaction_id?: string
  balance_transaction_status?: string // pending | available
  available_on?: string // ISO — wanneer het geld op de bank beschikbaar komt ("verkocht" ≠ "beschikbaar")
  fee_details?: StripeFeeDetail[]
  payment_method?: string // charge.payment_method_details.type (card/ideal/…) — forward-only dimensie
  card_country?: string // waar de klant bankiert — verklaart internationale-kaartfee
  card_brand?: string // visa/mastercard/… — samen met funding verklaart de premium
  card_funding?: string // credit/debit/prepaid — 1,5% vs 1,9% premium
}

// Haal fee/net/fee_details/betaalmethode + valuta-/kaart-dimensies uit de charge van een PaymentIntent.
// De balance_transaction settle't async → kan bij checkout.session.completed nog ontbreken; dan blijven
// de fee-velden weg (backfillbaar via het reconcile-pad). Alleen de PI-id wordt altijd teruggegeven.
export async function captureStripeFees(piId: string): Promise<StripeFeeCapture> {
  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ['latest_charge.balance_transaction'],
  })
  const out: StripeFeeCapture = { payment_intent_id: pi.id }

  const charge = pi.latest_charge as Stripe.Charge | null
  const pmd = charge?.payment_method_details
  if (pmd?.type) out.payment_method = pmd.type
  // Kaart-dimensies (alleen bij kaartbetaling aanwezig) — forward-only, verklaren de fee-hoogte.
  if (pmd?.card) {
    if (pmd.card.country) out.card_country = pmd.card.country
    if (pmd.card.brand) out.card_brand = pmd.card.brand
    if (pmd.card.funding) out.card_funding = pmd.card.funding
  }

  const bt = charge?.balance_transaction
  if (bt && typeof bt !== 'string') {
    // fee/net/amount staan in de minor units van de SETTLEMENT-valuta (settlement_currency legt vast welke).
    // settlement_amount = het BRUTO bedrag in EUR (presentment × exchange_rate) → de enige P&L-brutobron.
    out.stripe_fee = bt.fee / 100
    out.net_settlement = bt.net / 100
    out.settlement_amount = bt.amount / 100
    out.settlement_currency = bt.currency
    out.balance_transaction_id = bt.id
    out.balance_transaction_status = bt.status
    if (bt.exchange_rate != null) out.exchange_rate = bt.exchange_rate
    if (bt.available_on != null) out.available_on = new Date(bt.available_on * 1000).toISOString()
    out.fee_details = (bt.fee_details || []).map((fd) => ({
      type: fd.type,
      amount: fd.amount / 100,
      currency: fd.currency,
      description: fd.description ?? null,
    }))
  }
  return out
}

export interface SessionTaxCapture {
  amount_tax?: number // BTW binnen amount_paid (presentment-valuta)
  tax_status?: string // automatic_tax.status — 'complete' = BTW echt gemeten (ook een legitieme 0)
  customer_country?: string // factuuradres-land → OSS-tarief + aangifte
}

// Gedeelde extractie van de BTW-/land-velden uit een Checkout Session. ÉÉN plek zodat webhook (event-session)
// én reconcile (opgehaalde session) exact dezelfde velden schrijven — geen asymmetrisch capture-pad.
export function extractSessionTax(session: Stripe.Checkout.Session): SessionTaxCapture {
  const out: SessionTaxCapture = {}
  const amountTax = session.total_details?.amount_tax
  if (amountTax != null) out.amount_tax = amountTax / 100
  if (session.automatic_tax?.status) out.tax_status = session.automatic_tax.status
  const country = session.customer_details?.address?.country
  if (country) out.customer_country = country
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
