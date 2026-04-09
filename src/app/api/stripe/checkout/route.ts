import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'

// TODO: Create the 'starter' and 'power' products in Stripe Dashboard and replace placeholder IDs before going live.
// The existing 3 products (basic, plus, pro) are already configured and should NOT be modified.

const PACKAGES = {
  // NEW: €1.99 / 15 credits - TODO: Create in Stripe Dashboard
  starter: {
    name: 'Starter Package',
    price: 199, // in cents (EUR 1.99)
    credits: 15,
  },
  // Existing: €4.99 / 50 credits (was 'starter', now 'basic')
  basic: {
    name: 'Basic Package',
    price: 499, // in cents (EUR 4.99)
    credits: 50,
  },
  // Existing: €9.99 / 130 credits (was 'regular', now 'plus' with updated credits)
  plus: {
    name: 'Plus Package',
    price: 999, // in cents (EUR 9.99)
    credits: 130,
  },
  // Existing: €24.99 / 400 credits (was 'power', now 'pro' with updated credits)
  pro: {
    name: 'Pro Package',
    price: 2499, // in cents (EUR 24.99)
    credits: 400,
  },
  // NEW: €49.99 / 850 credits - TODO: Create in Stripe Dashboard
  power: {
    name: 'Power Package',
    price: 4999, // in cents (EUR 49.99)
    credits: 850,
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { plan } = await req.json()

    if (!plan || !PACKAGES[plan as keyof typeof PACKAGES]) {
      return new NextResponse('Invalid plan', { status: 400 })
    }

    const selectedPackage = PACKAGES[plan as keyof typeof PACKAGES]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: selectedPackage.name,
              description: `${selectedPackage.credits} Transcript Credits`,
            },
            unit_amount: selectedPackage.price, // Use secure server-side price
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        credits: selectedPackage.credits.toString(),
      },
      success_url: `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing/cancel`,
      customer_email: user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[STRIPE_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
