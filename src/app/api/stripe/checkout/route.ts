import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'

// TODO: Create all 5 products in Stripe Dashboard (live mode) before going live.
// Keys: try, basic, plus, pro, power

const PACKAGES = {
  try: {
    name: 'Try Package',
    price: 249, // in cents (EUR 2.49)
    credits: 200,
  },
  basic: {
    name: 'Basic Package',
    price: 599, // in cents (EUR 5.99)
    credits: 500,
  },
  plus: {
    name: 'Plus Package',
    price: 1199, // in cents (EUR 11.99)
    credits: 1100,
  },
  pro: {
    name: 'Pro Package',
    price: 2499, // in cents (EUR 24.99)
    credits: 2600,
  },
  power: {
    name: 'Power Package',
    price: 4999, // in cents (EUR 49.99)
    credits: 5500,
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Block suspended users before touching Stripe
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended')
      .eq('id', user.id)
      .single()

    if (profile?.suspended) {
      return new NextResponse('Account suspended. Contact support@indxr.ai', { status: 403 })
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
