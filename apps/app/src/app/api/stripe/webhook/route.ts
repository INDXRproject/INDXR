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

  // ── Teruggestroomd geld: refunds + chargebacks/disputes (payment_reversals) ──────────────────
  // Vrijwillige refund (charge.refunded) én onvrijwillige chargeback (charge.dispute.*) stroomden
  // eerder nergens in onze data → netto-omzet overschat + geen fraudesignaal. Capture-only: we leggen
  // de gebeurtenis vast; verrekenen in de P&L + credit-clawback zijn bewuste vervolgstappen.
  // Idempotent via dedupe_key (upsert); best-effort → nooit non-200 op een logfout (anders retryt Stripe).
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    try {
      const admin = createAdminClient()
      const refunds = charge.refunds?.data ?? []
      const latest = refunds.length ? refunds[refunds.length - 1] : null
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id ?? null
      await admin.from('payment_reversals').upsert({
        dedupe_key: `chg_${charge.id}`,
        kind: 'refund',
        occurred_at: new Date((latest?.created ?? charge.created) * 1000).toISOString(),
        status: latest?.status ?? (charge.refunded ? 'succeeded' : null),
        reason: latest?.reason ?? null,
        amount: charge.amount_refunded != null ? charge.amount_refunded / 100 : null, // cumulatief teruggegeven
        currency: charge.currency ?? null,
        fee: null, // refund: geen nieuwe Stripe-fee hier (de oorspronkelijke %-fee wordt niet teruggegeven)
        stripe_charge_id: charge.id,
        stripe_payment_intent_id: piId,
        stripe_refund_id: latest?.id ?? null,
        stripe_dispute_id: null,
        user_id: (charge.metadata?.userId as string | undefined) ?? null,
        raw: { amount_refunded: charge.amount_refunded, refunded: charge.refunded, refund_count: refunds.length,
               latest_refund: latest ? { id: latest.id, status: latest.status, reason: latest.reason } : null },
      }, { onConflict: 'dedupe_key' })
    } catch (e) {
      Sentry.captureException(e, { level: 'warning', tags: { route: 'api/stripe/webhook', step: 'charge_refunded_log' }, extra: { charge_id: charge.id } })
    }
    return new NextResponse(null, { status: 200 })
  }

  if (event.type === 'charge.dispute.created' || event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    try {
      const admin = createAdminClient()
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? null
      const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id ?? null
      // Dispute-fee zit in balance_transactions (withdrawal bij created; reversal bij 'won'). Som best-effort.
      const feeCents = (dispute.balance_transactions ?? []).reduce((s, bt) => s + (bt.fee ?? 0), 0)
      await admin.from('payment_reversals').upsert({
        dedupe_key: `dsp_${dispute.id}`, // created + closed upserten dezelfde rij → status evolueert naar won/lost
        kind: 'dispute',
        occurred_at: new Date(dispute.created * 1000).toISOString(),
        status: dispute.status ?? null, // needs_response / under_review / won / lost / ...
        reason: dispute.reason ?? null,
        amount: dispute.amount != null ? dispute.amount / 100 : null,
        currency: dispute.currency ?? null,
        fee: feeCents ? feeCents / 100 : null,
        stripe_charge_id: chargeId,
        stripe_payment_intent_id: piId,
        stripe_refund_id: null,
        stripe_dispute_id: dispute.id,
        user_id: (dispute.metadata?.userId as string | undefined) ?? null, // meestal leeg → later via PI-id joinbaar
        raw: { status: dispute.status, reason: dispute.reason, is_charge_refundable: dispute.is_charge_refundable,
               evidence_due_by: dispute.evidence_details?.due_by ?? null },
      }, { onConflict: 'dedupe_key' })
    } catch (e) {
      Sentry.captureException(e, { level: 'warning', tags: { route: 'api/stripe/webhook', step: 'dispute_log' }, extra: { dispute_id: (event.data.object as Stripe.Dispute).id } })
    }
    return new NextResponse(null, { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    // `checkout.session.completed` vuurt ook voor delayed payment methods (SEPA, iDEAL e.d.) met
    // payment_status='unpaid' zolang de betaling nog niet bevestigd is — credits toekennen op dat
    // moment zou geven vóórdat het geld er is. Pas toekennen bij 'paid'; voor delayed methods komt
    // dat via het aparte async_payment_succeeded-event (zelfde payment_status-check hier geldt dan).
    if (session.payment_status !== 'paid') {
      return new NextResponse(null, { status: 200 })
    }
    // growth-plan.md §6.3 H1: both handlers now return false on a RETRYABLE failure (DB error,
    // dispatch error, etc.) — only a permanently-unrecoverable case (missing metadata) or a real
    // success returns true. A retryable failure must get a 500 so Stripe retries the delivery;
    // returning 200 on a transient error means a paid customer never gets their credits/transcript.
    const ok = session.metadata?.productType === 'quick_purchase'
      ? await handleQuickPurchaseSession(session)
      : await grantCreditsForSession(session)
    if (!ok) {
      return new NextResponse('Retryable error — see Sentry', { status: 500 })
    }
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    // Delayed payment method die alsnog mislukte. Er zijn nooit credits toegekend voor deze sessie
    // (completed sloeg de grant over toen payment_status nog 'unpaid' was) — niets om terug te draaien.
    Sentry.captureMessage('Stripe webhook: async payment failed', {
      level: 'warning',
      tags: { route: 'api/stripe/webhook', step: 'async_payment_failed' },
      extra: { stripe_session_id: session.id, user_id: session.metadata?.userId ?? 'unknown' },
    })
  }

  return new NextResponse(null, { status: 200 })
}

// Credit-grant-logica voor een betaalde checkout-sessie. Gedeeld tussen `checkout.session.completed`
// (payment_status==='paid', de normale directe-betaalmethode-flow) en
// `checkout.session.async_payment_succeeded` (delayed methods die na completed alsnog bevestigen).
//
// Retourneert `true` als Stripe met deze delivery klaar is (succes, al verwerkt, of permanent
// onherstelbaar — retrien helpt dan niet), `false` bij een TIJDELIJKE fout (Stripe moet de
// delivery opnieuw afleveren). growth-plan.md §6.3 H1: vóór deze fix gaf elke fout hier stilzwijgend
// 200 terug — een tijdelijke DB-hik betekende dat een betaalde klant zijn credits nooit kreeg.
async function grantCreditsForSession(session: Stripe.Checkout.Session): Promise<boolean> {
  // Service-role client: add_credits is locked to service_role (RPC privilege hardening).
  // The webhook has no user session anyway; it grants credits server-side.
  const supabase = createAdminClient()

  const userId = session.metadata?.userId
  const credits = parseInt(session.metadata?.credits || '0')
  const amountPaid = session.amount_total ? session.amount_total / 100 : 0

  if (!userId || !credits) {
    // Permanent onherstelbaar — deze sessie zal nooit geldige metadata krijgen, retrien helpt niet.
    // Dit wijst op een codefout bij sessie-aanmaak (checkout/route.ts), niet een normale flow.
    Sentry.captureException(new Error('Stripe webhook: checkout.session.completed missing userId/credits metadata'), {
      tags: { route: 'api/stripe/webhook', step: 'grant_missing_metadata' },
      extra: { stripe_session_id: session.id },
    })
    return true
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

  // Add credits securely via RPC. Idempotent op stripe_session_id (DB-unique-index + add_credits
  // vangt unique_violation op) — een herhaalde webhook-delivery voor dezelfde sessie muteert de
  // balans niet opnieuw. Facturen worden niet hier aangemaakt maar on-demand vanuit de
  // account-betaalhistorie (api/stripe/invoice) — invoice_url wordt daar bijgeschreven.
  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: credits,
    p_reason: `Purchased ${credits} Credits`,
    p_metadata: purchaseMeta,
    p_kind: 'purchase',
  })

  if (error) {
    // Tijdelijk: een DB-hik, niet een permanent probleem — Stripe moet dit opnieuw afleveren.
    Sentry.captureException(new Error(`Stripe webhook: failed to add credits: ${error.message}`), {
      tags: { route: 'api/stripe/webhook', step: 'add_credits_rpc', user_id: userId ?? 'unknown' },
      extra: { stripe_session_id: session.id, credits, error },
    })
    await Sentry.flush(2000);
    console.error('Failed to add credits:', error)
    return false
  }

  const alreadyProcessed = (data as { already_processed?: boolean } | null)?.already_processed === true
  if (alreadyProcessed) {
    // Deze sessie werd al eerder volledig verwerkt (vorige webhook-delivery) — balans is niet
    // opnieuw gemuteerd. Side-effects (has_ever_purchased, PostHog) zijn toen al gelopen; niet herhalen.
    return true
  }

  // Betaald-status cachen (gemaksvlag; paid/free is altijd herafleidbaar uit credit_transactions).
  // Alleen echte aankopen zetten 'm — daarom hier, niet in add_credits (dat draait ook voor grants/refunds).
  // Best-effort: de credits zijn al toegekend; een gefaalde cache-update mag de webhook niet laten falen.
  const { error: flagError } = await supabase
    .from('profiles')
    .update({ has_ever_purchased: true })
    .eq('id', userId)
  if (flagError) {
    Sentry.captureException(new Error(`Stripe webhook: has_ever_purchased update failed: ${flagError.message}`), {
      level: 'warning',
      tags: { route: 'api/stripe/webhook', step: 'has_ever_purchased', user_id: userId },
      extra: { stripe_session_id: session.id },
    })
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
  return true
}

// normalize_email mirror (supabase/migrations/20260712220428_welcome_reward_canonical_email_dedup.sql)
// — SQL kan deze TS-functie niet aanroepen en omgekeerd, dus hand-gekoppeld (zelfde patroon als
// FREE_TIER.WELCOME_CREDITS). Alleen gebruikt om een guest-account NIET aan te maken als er al een
// account bestaat op een +tag/puntjes-alias van hetzelfde adres (ADR-024) — de DB-RPC
// find_canonical_account is de autoritatieve check; dit is puur voor logging/leesbaarheid hier.
function normalizeEmailMirror(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split('@')
  if (!domain) return email.toLowerCase().trim()
  let l = local.split('+')[0]
  let d = domain
  if (d === 'gmail.com' || d === 'googlemail.com') {
    l = l.replace(/\./g, '')
    d = 'gmail.com'
  }
  return `${l}@${d}`
}

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

// Snelle-balie-afrekening (growth-plan.md §6.2 Onderdeel B). Anders dan grantCreditsForSession:
// geen vaste userId in metadata (tenzij de koper al ingelogd was met te weinig saldo) — de koper
// kan hier voor het EERST een account krijgen, op het e-mailadres dat Stripe Checkout verzamelde.
// Eén grootboek: de guest krijgt een gewone user_credits-rij via de bestaande add_credits-RPC,
// idempotent op stripe_session_id net als elke andere aankoop (Onderdeel A).
//
// Zelfde true/false-contract als grantCreditsForSession (zie H1-comment daar). growth-plan.md
// §6.3 H2: de dispatch-aanroep naar het backend is NIET langer gated op `alreadyProcessed` — een
// Stripe-retry (credits al toegekend bij de eerste delivery) moet dispatch ALTIJD opnieuw proberen
// als de eerste dispatch-poging zelf faalde (netwerkfout/backend-crash); het backend-endpoint is
// zelf per-bestand-idempotent (zie backend/main.py dispatch_quick_quote), dus een herhaalde
// aanroep is veilig. De vroege `quote.status !== 'pending'`-return is VERWIJDERD — die blokkeerde
// precies dit retry-pad zodra de eerste dispatch de status al naar 'paid' had gezet.
async function handleQuickPurchaseSession(session: Stripe.Checkout.Session): Promise<boolean> {
  const supabase = createAdminClient()
  const quoteId = session.metadata?.quoteId
  if (!quoteId) {
    // Permanent onherstelbaar — deze sessie krijgt nooit een quoteId, retrien helpt niet.
    Sentry.captureMessage('Stripe webhook: quick_purchase session missing quoteId', {
      level: 'error',
      tags: { route: 'api/stripe/webhook', step: 'quick_purchase_missing_quote' },
      extra: { stripe_session_id: session.id },
    })
    return true
  }

  const { data: quote, error: quoteErr } = await supabase
    .from('quick_quotes')
    .select('id,status,total_credits,email')
    .eq('id', quoteId)
    .single()

  if (quoteErr || !quote) {
    // Zou niet moeten gebeuren (de quote-rij bestaat al vóór Checkout) — behandel als tijdelijk
    // (een leesfout of race) zodat Stripe retryt in plaats van de betaling te laten verdwijnen.
    Sentry.captureException(new Error(`Stripe webhook: quick_quotes row not found for ${quoteId}`), {
      tags: { route: 'api/stripe/webhook', step: 'quick_purchase_quote_missing' },
      extra: { stripe_session_id: session.id },
    })
    return false
  }

  const email = session.customer_details?.email ?? quote.email
  let userId = session.metadata?.userId || undefined

  if (!userId) {
    if (!email) {
      // Stripe Checkout verzamelt altijd een e-mailadres bij betaling — dit zou nooit mogen
      // gebeuren. Toch tijdelijk behandelen (retry kan geen kwaad) i.p.v. de betaling te laten vallen.
      Sentry.captureException(new Error(`Stripe webhook: quick_purchase session ${session.id} has no email`), {
        tags: { route: 'api/stripe/webhook', step: 'quick_purchase_no_email' },
      })
      return false
    }
    // ADR-024-canonicalisatie: bestaat er al een account (guest of echt) op dit canonieke adres?
    // Zo ja, crediteer DAT account — geen tweede account per +tag/puntjes-alias.
    const { data: existingUserId } = await supabase.rpc('find_canonical_account', { p_email: email })
    if (existingUserId) {
      userId = existingUserId as string
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // guest: geen wachtwoord, geen verificatiemail — koopbevestiging IS de verificatie
      })
      if (createErr || !created.user) {
        Sentry.captureException(new Error(`Stripe webhook: guest user creation failed: ${createErr?.message}`), {
          tags: { route: 'api/stripe/webhook', step: 'quick_purchase_guest_create' },
          extra: { stripe_session_id: session.id, canonical_email: normalizeEmailMirror(email) },
        })
        return false
      }
      userId = created.user.id
      await supabase.from('profiles').update({ is_guest: true }).eq('id', userId)
    }
  }

  const { data: grantResult, error: grantErr } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: quote.total_credits,
    p_reason: `Quick checkout — ${quote.total_credits} credits`,
    p_metadata: { stripe_session_id: session.id, quote_id: quoteId },
    p_kind: 'purchase',
  })
  if (grantErr) {
    Sentry.captureException(new Error(`Stripe webhook: quick_purchase add_credits failed: ${grantErr.message}`), {
      tags: { route: 'api/stripe/webhook', step: 'quick_purchase_add_credits', user_id: userId },
      extra: { stripe_session_id: session.id, quote_id: quoteId },
    })
    return false
  }
  const alreadyProcessed = (grantResult as { already_processed?: boolean } | null)?.already_processed === true

  await supabase.from('quick_quotes').update({ email }).eq('id', quoteId)

  // Dispatch ALTIJD proberen (niet gated op alreadyProcessed) — idempotent per bestand op het
  // backend, dus een herhaalde aanroep na een eerder gelukte dispatch is een goedkope no-op, en
  // een aanroep na een eerder MISLUKTE dispatch pakt precies de ontbrekende bestanden op.
  const dispatchForm = new FormData()
  dispatchForm.append('user_id', userId)
  let dispatchOk = false
  try {
    const dispatchRes = await fetch(`${PYTHON_BACKEND_URL}/api/quote/${quoteId}/dispatch`, {
      method: 'POST',
      headers: { 'X-Backend-Secret': process.env.BACKEND_API_SECRET || '' },
      body: dispatchForm,
    })
    dispatchOk = dispatchRes.ok
    if (!dispatchRes.ok) {
      Sentry.captureException(new Error(`Stripe webhook: quick_purchase dispatch non-ok status ${dispatchRes.status}`), {
        level: 'error',
        tags: { route: 'api/stripe/webhook', step: 'quick_purchase_dispatch', user_id: userId },
        extra: { stripe_session_id: session.id, quote_id: quoteId, status: dispatchRes.status },
      })
    }
  } catch (dispatchErr) {
    Sentry.captureException(dispatchErr, {
      level: 'error',
      tags: { route: 'api/stripe/webhook', step: 'quick_purchase_dispatch', user_id: userId },
      extra: { stripe_session_id: session.id, quote_id: quoteId },
    })
  }

  if (!alreadyProcessed) {
    const { PostHog } = require('posthog-node')
    const client = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      { host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com', disableGeoip: true }
    )
    client.capture({
      distinctId: userId,
      event: 'quick_purchase_completed',
      properties: {
        amount: session.amount_total ? session.amount_total / 100 : 0,
        credits_added: quote.total_credits,
        currency: session.currency,
        source: 'stripe_webhook',
        session_id: session.id,
        quote_id: quoteId,
        // growth-plan.md §6.2 Onderdeel D: via/kw attribution, carried from the quick-checkout
        // session metadata (set client-side from the indxr_acq cookie) through to this event.
        via: session.metadata?.via,
        kw: session.metadata?.kw,
      },
    })
    await client.shutdown()
  }

  return dispatchOk
}
