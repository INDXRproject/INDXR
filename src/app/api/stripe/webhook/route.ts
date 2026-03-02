import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('Stripe-Signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  if (event.type === 'checkout.session.completed') {
    const supabase = await createClient()
    
    const userId = session.metadata?.userId
    const credits = parseInt(session.metadata?.credits || '0')
    const amountPaid = session.amount_total ? session.amount_total / 100 : 0

    if (!userId || !credits) {
      return new NextResponse('Missing metadata', { status: 200 }) // Return 200 to acknowledge receipt even if invalid logic to stop retries
    }

    // Add credits securely via RPC
    const { error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: credits,
      p_reason: `Purchased ${credits} Credits`,
      p_metadata: {
          stripe_session_id: session.id,
          amount_paid: amountPaid,
          currency: session.currency
      }
    })

    if (error) {
      console.error('Failed to add credits:', error)
      return new NextResponse('Database Error', { status: 500 })
    }
    
    console.log(`Successfully added ${credits} credits to user ${userId}`)

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
