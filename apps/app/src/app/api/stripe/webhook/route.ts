import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { createAdminClient } from '@indxr/shared/utils/supabase/admin'
import { captureStripeFees } from '@/lib/stripe-fees'

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('Stripe-Signature') as string

  let event: Stripe.Event

  if (process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      Sentry.captureException(error, { tags: { route: 'api/stripe/webhook', step: 'signature_verification' } })
      await Sentry.flush(2000);
      console.error('Webhook signature verification failed:', msg)
      return new NextResponse(`Webhook Error: ${msg}`, { status: 400 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Fail-closed: in productie nooit een ongeverifieerde webhook accepteren.
    const msg = 'STRIPE_WEBHOOK_SECRET is not set in production — refusing unverified webhook.'
    Sentry.captureException(new Error(msg), { tags: { route: 'api/stripe/webhook', step: 'missing_secret' } })
    await Sentry.flush(2000)
    console.error(msg)
    return new NextResponse('Webhook secret not configured', { status: 500 })
  } else {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET is not set. Skipping signature verification. Do NOT do this in production!')
    // Fallback to parsing the body if no secret is provided for local testing (non-production only)
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : 'Unknown error'
      console.error('Failed to parse webhook body as JSON:', msg)
      return new NextResponse(`Webhook Parse Error: ${msg}`, { status: 400 })
    }
  }

  const session = event.data.object as Stripe.Checkout.Session

  if (event.type === 'checkout.session.completed') {
    // Service-role client: add_credits is locked to service_role (RPC privilege hardening).
    // The webhook has no user session anyway; it grants credits server-side.
    const supabase = createAdminClient()

    const userId = session.metadata?.userId
    const credits = parseInt(session.metadata?.credits || '0')
    const amountPaid = session.amount_total ? session.amount_total / 100 : 0

    if (!userId || !credits) {
      return new NextResponse('Missing metadata', { status: 200 }) // Return 200 to acknowledge receipt even if invalid logic to stop retries
    }

    // Net-revenue capture (BTW + Stripe fee + EUR settlement) so net = gross − BTW − fee is exactly
    // reconstructable later. BEST-EFFORT: any failure here MUST NOT block the credit grant — we log a
    // warning and proceed with gross-only metadata. balance_transaction is sometimes not available
    // synchronously; when absent the fee fields are simply omitted (backfillable from Stripe later).
    const purchaseMeta: Record<string, unknown> = {
      stripe_session_id: session.id,
      amount_paid: amountPaid, // presentment (klant-valuta); P&L rekent op settlement_amount (EUR)
      currency: session.currency, // presentment-valuta
    }
    try {
      // BTW (tax) portion — pricing is BTW-inclusive (ADR-052/053), so this is the tax within amount_paid.
      const amountTax = session.total_details?.amount_tax
      if (amountTax != null) purchaseMeta.amount_tax = amountTax / 100
      // tax_status = 'complete' bewijst dat automatic_tax daadwerkelijk BTW heeft berekend op deze sale
      // (ook een legitieme 0 bij US/verlegd). Zonder 'complete' is de BTW ONBEKEND, niet "geen BTW" —
      // het dashboard markeert die sales apart i.p.v. stilzwijgend BTW-inclusieve omzet te tonen.
      if (session.automatic_tax?.status) purchaseMeta.tax_status = session.automatic_tax.status
      // Factuuradres-land bepaalt het OSS-tarief en is wat de OSS-aangifte nodig heeft. Per aankoop vast.
      const custCountry = session.customer_details?.address?.country
      if (custCountry) purchaseMeta.customer_country = custCountry

      const piId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id
      if (piId) {
        // B4: Stripe's EIGEN fee_details + betaalmethode + net settlement (geen hardcoded rates).
        // De balance_transaction is soms nog niet settled → fee-velden ontbreken dan; het reconcile-pad
        // (/api/admin/reconcile-stripe-fees) vult ze later alsnog aan. amount_tax blijft altijd bewaard.
        Object.assign(purchaseMeta, await captureStripeFees(piId))
      }
    } catch (feeErr) {
      const msg = feeErr instanceof Error ? feeErr.message : 'unknown'
      console.warn('Stripe webhook: net/fee capture failed (grant proceeds with gross-only):', msg)
      Sentry.captureException(feeErr, {
        level: 'warning',
        tags: { route: 'api/stripe/webhook', step: 'fee_capture', user_id: userId ?? 'unknown' },
        extra: { stripe_session_id: session.id },
      })
    }

    // Add credits securely via RPC. Facturen worden niet hier aangemaakt maar on-demand
    // vanuit de account-betaalhistorie (api/stripe/invoice) — invoice_url wordt daar bijgeschreven.
    const { error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: credits,
      p_reason: `Purchased ${credits} Credits`,
      p_metadata: purchaseMeta,
      p_kind: 'purchase',
    })

    if (error) {
      Sentry.captureException(new Error(`Stripe webhook: failed to add credits: ${error.message}`), {
        tags: { route: 'api/stripe/webhook', step: 'add_credits_rpc', user_id: userId ?? 'unknown' },
        extra: { stripe_session_id: session.id, credits, error },
      })
      await Sentry.flush(2000);
      console.error('Failed to add credits:', error)
      return new NextResponse('Database Error', { status: 500 })
    }
    
    // Track in PostHog (Server-side)
    const { PostHog } = require('posthog-node')
    const client = new PostHog(
        process.env.NEXT_PUBLIC_POSTHOG_KEY!,
        { host: process.env.NEXT_PUBLIC_POSTHOG_HOST }
    )

    client.capture({
        distinctId: userId,
        event: 'credits_purchased',
        properties: {
            amount: amountPaid,
            credits_added: credits,
            currency: session.currency,
            source: 'stripe_webhook',
            session_id: session.id
        }
    })
    await client.shutdown()
  }

  return new NextResponse(null, { status: 200 })
}
