import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/utils/supabase/server"
import { PACKAGES, getPackage, PricingPackage } from "@/lib/pricing"

// Validate plan ID against known packages
const VALID_IDS = new Set(PACKAGES.map((p) => p.id))

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("suspended")
      .eq("id", user.id)
      .single()

    if (profile?.suspended) {
      return new NextResponse("Account suspended. Contact support@indxr.ai", { status: 403 })
    }

    const { plan } = await req.json()

    if (!plan || !VALID_IDS.has(plan)) {
      return new NextResponse("Invalid plan", { status: 400 })
    }

    const pkg: PricingPackage = getPackage(plan)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${pkg.name} Package`,
              description: `${pkg.credits} Transcript Credits`,
            },
            unit_amount: Math.round(pkg.priceEur * 100), // cents, derived from pricing.ts
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        credits: pkg.credits.toString(),
      },
      success_url: `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing/cancel`,
      customer_email: user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[STRIPE_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
