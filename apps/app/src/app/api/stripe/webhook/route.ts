import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { createAdminClient } from '@indxr/shared/utils/supabase/admin'
import { captureStripeFees, extractSessionTax } from '@/lib/stripe-fees'

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

  // ── Mislukte/geblokkeerde pogingen loggen (kostendriver + landguard-detectie) ──────────────
  // Radar-block MAAKT een failed Charge → charge.failed draagt `outcome` (incl. outcome.rule) INLINE;
  // payment_intent.payment_failed draagt dat NIET (outcome zou een charge-retrieve vergen). Daarom:
  //   charge.failed              → rijke rij, screened=true (Radar heeft echt gescreend)
  //   payment_intent.payment_failed → alleen als er GEEN charge is (pre-charge failure), screened=false
  // Best-effort: nooit een non-200 op een logfout (anders retryt Stripe eindeloos).
  if (event.type === 'charge.failed') {
    const charge = event.data.object as Stripe.Charge
    try {
      const admin = createAdminClient()
      const outcome = charge.outcome
      // De Radar-rule is in de webhook een bare ID; expanded een object {id, predicate}. Geen SDK-type → lokale shape.
      const asRule = (r: unknown): { id?: string; predicate?: string | null } | null =>
        r && typeof r === 'object' ? (r as { id?: string; predicate?: string | null }) : null
      let rulePredicate: string | null = null
      let ruleId: string | null =
        outcome && typeof outcome.rule === 'string' ? outcome.rule
        : asRule(outcome?.rule)?.id ?? null
      const inlineRule = asRule(outcome?.rule)
      if (inlineRule) {
        rulePredicate = inlineRule.predicate ?? null
      } else if (ruleId) {
        // predicate zit niet in de webhook-payload → best-effort expand voor de leesbare regeltekst.
        try {
          const full = await stripe.charges.retrieve(charge.id, { expand: ['outcome.rule'] })
          const r = asRule(full.outcome?.rule)
          if (r) { ruleId = r.id ?? ruleId; rulePredicate = r.predicate ?? null }
        } catch { /* expand best-effort */ }
      }
      await admin.from('payment_attempts').upsert({
        occurred_at: new Date(charge.created * 1000).toISOString(),
        stripe_charge_id: charge.id,
        stripe_payment_intent_id: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id ?? null,
        outcome_type: outcome?.type ?? null,
        outcome_reason: outcome?.reason ?? null,
        outcome_rule: ruleId,
        outcome_rule_predicate: rulePredicate,
        risk_level: outcome?.risk_level ?? null,
        billing_address_country: charge.billing_details?.address?.country ?? null,
        payment_method_type: charge.payment_method_details?.type ?? null,
        decline_code: charge.failure_code ?? null,
        amount: charge.amount != null ? charge.amount / 100 : null,
        currency: charge.currency ?? null,
        screened: true,
        user_id: (charge.metadata?.userId as string | undefined) ?? null,
        raw: { outcome: outcome ?? null, failure_message: charge.failure_message ?? null },
      }, { onConflict: 'stripe_charge_id' })
    } catch (e) {
      Sentry.captureException(e, { level: 'warning', tags: { route: 'api/stripe/webhook', step: 'charge_failed_log' }, extra: { charge_id: charge.id } })
    }
    return new NextResponse(null, { status: 200 })
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    const lpe = pi.last_payment_error
    // Charge bestaat al → charge.failed heeft (rijker) gelogd; niet dubbel loggen.
    const hasCharge = lpe?.charge != null
    if (!hasCharge) {
      try {
        const admin = createAdminClient()
        const pm = lpe?.payment_method
        await admin.from('payment_attempts').insert({
          occurred_at: new Date(event.created * 1000).toISOString(),
          stripe_charge_id: null,
          stripe_payment_intent_id: pi.id,
          outcome_type: null, // geen charge → geen Radar-outcome
          outcome_reason: lpe?.code ?? null,
          decline_code: lpe?.decline_code ?? null,
          billing_address_country: pm?.billing_details?.address?.country ?? null,
          payment_method_type: pm?.type ?? null,
          amount: pi.amount != null ? pi.amount / 100 : null,
          currency: pi.currency ?? null,
          screened: false, // pre-charge failure → niet door Radar gescreend, telt niet in de Radar-fee
          user_id: (pi.metadata?.userId as string | undefined) ?? null,
          raw: { last_payment_error: lpe ? { code: lpe.code, decline_code: lpe.decline_code, message: lpe.message } : null },
        })
      } catch (e) {
        Sentry.captureException(e, { level: 'warning', tags: { route: 'api/stripe/webhook', step: 'pi_failed_log' }, extra: { pi_id: pi.id } })
      }
    }
    return new NextResponse(null, { status: 200 })
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
      // BTW + tax_status + factuuradres-land uit de GEDEELDE extractor (zelfde velden als reconcile).
      // tax_status='complete' bewijst dat automatic_tax echt BTW berekende (ook een legitieme 0 bij US/verlegd);
      // zonder 'complete' is de BTW ONBEKEND, niet "geen BTW" — het dashboard markeert die sales apart.
      Object.assign(purchaseMeta, extractSessionTax(session))

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
        { host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com', disableGeoip: true }
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
