import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { stripe } from '@/lib/stripe'
import { createClient } from '@indxr/shared/utils/supabase/server'
import { createAdminClient } from '@indxr/shared/utils/supabase/admin'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

export const runtime = 'nodejs'

// On-demand factuur-aanmaak voor een afgeronde one-off Checkout-betaling.
// Stripe kent geen manier om een bestaande PaymentIntent aan een nieuwe Invoice te
// koppelen; de retroactieve route is: Customer -> Invoice -> InvoiceItem -> finalize
// -> pay(paid_out_of_band). `paid_out_of_band` doet GEEN geldbeweging en maakt GEEN
// nieuwe charge — het markeert de factuur als reeds betaald. De hosted_invoice_url
// komt beschikbaar na finalize. URL wordt in de transactie-metadata gecachet zodat
// een tweede klik de bestaande factuur teruggeeft (geen dubbele aanmaak, geen dubbele fee).
//
// BTW: de invoice item krijgt tax_behavior 'inclusive' + automatic_tax op de factuur.
// Inclusive houdt het totaal constant (= exact het betaalde brutobedrag); Stripe Tax
// rekent de BTW eruit terug (ex-BTW + BTW-tarief/bedrag), en zet reverse charge/0% bij een
// geldig B2B-BTW-nummer op de Customer. Merchant-bedrijfsgegevens + BTW-registratienummer
// komen automatisch uit de Stripe Tax-accountconfiguratie; de klant-BTW-id uit de Customer.
// De factuur-metadata verwijst naar de originele betaling (proof-of-payment, geen losse omzet).
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId } = await req.json()
    if (!transactionId || typeof transactionId !== 'string') {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })
    }

    // Eigen transactie ophalen (RLS beperkt tot eigen rijen). Valideer dat het een
    // echte Stripe-aankoop is.
    const { data: tx } = await supabase
      .from('credit_transactions')
      .select('id, user_id, amount, type, metadata')
      .eq('id', transactionId)
      .single()

    const metadata = (tx?.metadata ?? {}) as Record<string, unknown>
    const sessionId = metadata.stripe_session_id as string | undefined

    if (!tx || tx.user_id !== user.id || tx.type !== 'credit' || !sessionId) {
      return NextResponse.json({ error: 'Not an eligible purchase' }, { status: 400 })
    }

    // Al eerder aangemaakt? Geef de bestaande factuur terug (geen dubbele aanmaak).
    if (typeof metadata.invoice_url === 'string' && metadata.invoice_url) {
      return NextResponse.json({ invoice_url: metadata.invoice_url })
    }

    // Checkout-sessie ophalen voor bedrag, valuta en klantgegevens.
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.amount_total == null || !session.currency) {
      return NextResponse.json({ error: 'Payment details unavailable' }, { status: 422 })
    }

    // Eén Customer per user (hergebruikt profiles.stripe_customer_id).
    const customerId = await getOrCreateStripeCustomer(user.id, session.customer_details?.email ?? user.email)

    // Zorg dat de Customer een adres heeft voor Stripe Tax — nodig om de BTW te berekenen.
    // Voor betalingen van vóór de customer-attach in checkout kopiëren we het factuuradres
    // uit de sessie. (Bij nieuwe checkouts staat dit er al via customer_update: address auto.)
    const a = session.customer_details?.address
    if (a?.country) {
      await stripe.customers.update(customerId, {
        name: session.customer_details?.name ?? undefined,
        address: {
          city: a.city ?? undefined,
          country: a.country ?? undefined,
          line1: a.line1 ?? undefined,
          line2: a.line2 ?? undefined,
          postal_code: a.postal_code ?? undefined,
          state: a.state ?? undefined,
        },
      })
    }

    // Invoice met automatic_tax + item BTW-inclusief -> finalize -> out-of-band betaald.
    // Metadata koppelt de factuur aan de originele betaling (proof-of-payment).
    const invoice = await stripe.invoices.create(
      {
        customer: customerId,
        auto_advance: false,
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
        metadata: {
          stripe_session_id: sessionId,
          original_payment_intent:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? '',
          indxr_transaction_id: tx.id,
        },
      },
      { idempotencyKey: `inv_create_${sessionId}` },
    )

    await stripe.invoiceItems.create(
      {
        customer: customerId,
        invoice: invoice.id,
        amount: session.amount_total,
        currency: session.currency,
        // Inclusive: het bedrag is BTW-inclusief; Stripe Tax rekent de BTW eruit terug
        // zodat het factuurtotaal exact het betaalde brutobedrag blijft.
        tax_behavior: 'inclusive',
        // Tax-categorie per ADR-052: "General – Electronically Supplied Services".
        tax_code: 'txcd_10000000',
        description: `INDXR.AI — ${tx.amount.toLocaleString()} credits`,
      },
      { idempotencyKey: `inv_item_${sessionId}` },
    )

    // finalize + pay tolerant maken voor retries na een deels geslaagde eerdere poging
    // (bijv. Stripe slaagde maar de metadata-cache-write faalde). We lezen de definitieve
    // hosted_invoice_url uit een verse retrieve en valideren die — een échte finalize-fout
    // laat de URL leeg en resulteert alsnog in een nette foutmelding.
    try {
      await stripe.invoices.finalizeInvoice(invoice.id)
    } catch { /* mogelijk al gefinaliseerd */ }
    try {
      await stripe.invoices.pay(invoice.id, { paid_out_of_band: true })
    } catch { /* mogelijk al betaald */ }

    const finalized = await stripe.invoices.retrieve(invoice.id)
    const invoiceUrl = finalized.hosted_invoice_url
    if (!invoiceUrl) {
      return NextResponse.json({ error: 'Invoice created but no link available' }, { status: 502 })
    }

    // De door Stripe Tax berekende BTW op de factuur (minor units). Voor sales van vóór automatic_tax-op-
    // checkout is dit de ENIGE plek met echte BTW — vastleggen zodat het dashboard die sale niet langer als
    // "BTW onbekend" hoeft te markeren. (Geen verzonnen 21%; dit is Stripe's cijfer.) Nieuwere Stripe-API
    // heeft `invoice.tax` vervangen door `total_taxes[]`; beide defensief lezen.
    const inv = finalized as unknown as { tax?: number | null; total_taxes?: { amount?: number }[] | null }
    const invoiceTaxMinor = inv.tax != null
      ? inv.tax
      : Array.isArray(inv.total_taxes)
        ? inv.total_taxes.reduce((sum, t) => sum + (t.amount ?? 0), 0)
        : null
    const invoiceTax = invoiceTaxMinor != null ? invoiceTaxMinor / 100 : null

    // URL + echte factuur-BTW cachen in de transactie-metadata (service-role: geen user-UPDATE-policy).
    const admin = createAdminClient()
    await admin
      .from('credit_transactions')
      .update({ metadata: { ...metadata, invoice_url: invoiceUrl, invoice_id: invoice.id,
        ...(invoiceTax != null ? { invoice_tax: invoiceTax } : {}) } })
      .eq('id', tx.id)

    return NextResponse.json({ invoice_url: invoiceUrl })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'api/stripe/invoice' } })
    await Sentry.flush(2000)
    console.error('[STRIPE_INVOICE]', error)
    return NextResponse.json({ error: 'Could not generate invoice' }, { status: 500 })
  }
}
