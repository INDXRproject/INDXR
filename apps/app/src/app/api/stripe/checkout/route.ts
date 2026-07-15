import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { PACKAGES, getPackage, PricingPackage } from "@indxr/shared/lib/pricing"
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer"

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

    // Eén Stripe Customer per user — betaling + latere factuur vallen onder dezelfde Customer.
    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // GEEN payment_method_types en GEEN payment_method_configuration meegeven:
      // dan gebruikt Checkout Stripe's dynamic payment methods → de in het Dashboard
      // geactiveerde methodes (default config pmc_1StnuTRrwT3Uo6wS…) zijn leidend.
      // Een hardcoded array (bv. ["card"]) OVERSCHRIJFT de Dashboard-config en blokkeert
      // bank-redirects zoals iDEAL (kaart-rail-methodes als Apple Pay/Link komen er wél
      // doorheen). Een methode toevoegen = voortaan alleen een Dashboard-toggle, geen code.
      billing_address_collection: "required",
      customer: customerId,
      // Bewaar het bij checkout ingevoerde adres + (bedrijfs)naam op de Customer, zodat
      // Stripe Tax de BTW correct kan berekenen op de sessie én de on-demand factuur.
      customer_update: { address: "auto", name: "auto" },
      // B2B: laat klanten hun BTW-nummer opgeven → verschijnt op de factuur + reverse charge.
      tax_id_collection: { enabled: true },
      // BTW OP DE SESSIE ZELF (spiegelt de factuurroute): Stripe Tax rekent nu op checkout, zodat
      // session.total_details.amount_tax de echte BTW draagt (was 0 → omzet ~21% te hoog). OSS-tarief
      // volgt uit het klant-factuuradres (NL 21% / DE 19% / …); US = geen EU-BTW; EU-B2B met geldig
      // BTW-nummer = 0% verlegd. Werkt samen met Adaptive Pricing (tax op integratievaluta EUR, dan omreken).
      automatic_tax: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${pkg.name} Package`,
              description: `${pkg.credits} Transcript Credits`,
              // Absolute https-URL naar de pakket-afbeelding (pad uit pricing.ts).
              // Stripe rendert dit naast het line-item; localhost/relatief werkt niet.
              images: [`${appUrl}${pkg.image}`],
              // Electronically Supplied Services — zelfde tax_code als de factuurroute.
              tax_code: "txcd_10000000",
            },
            unit_amount: Math.round(pkg.priceEur * 100), // cents, derived from pricing.ts
            // EXPLICIET inclusief — prijzen uit pricing.ts zijn BTW-inclusief (ADR-052). Niet op de
            // account-default ('inferred_by_currency') vertrouwen: die sluit BTW uit bij USD/CAD.
            tax_behavior: "inclusive",
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        credits: pkg.credits.toString(),
      },
      // Geen automatische factuur op elke sale — facturen worden on-demand aangemaakt
      // vanuit de account-betaalhistorie (api/stripe/invoice). Zie backlog voor de eigen generator.
      success_url: `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing/cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[STRIPE_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
