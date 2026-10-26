import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { LEGAL_VERSION } from "@indxr/shared/lib/legal"

// Snelle balie (growth-plan.md §6.2 Onderdeel B): afrekenen op een quick_quotes-offerte die het
// Railway-backend (/api/quote/create) al aanmaakte — met het bestand al in R2, duur+prijs al
// vastgelegd. Deze route herberekent NOOIT de prijs uit de client; hij leest total_price_cents
// rechtstreeks uit de offerte-rij (service-role, RLS staat helemaal dicht op quick_quotes).
//
// Twee paden:
//  - Ingelogd + genoeg credits: direct afrekenen via het backend-dispatch-endpoint, geen Stripe.
//  - Anders (anoniem of te weinig credits): één Stripe Checkout Session voor het volledige bedrag.
//    De koper wordt pas als guest-account aangemaakt in de webhook, na betaling (ADR-1xx).

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000"

export async function POST(req: Request) {
  try {
    const { quoteId, accessToken, termsAccepted, via, kw, gclid } = await req.json()

    if (!quoteId || !accessToken) {
      return new NextResponse("Missing quoteId/accessToken", { status: 400 })
    }

    // Zelfde juridische gate als het pakketten-checkout-pad (ADR-069) — ook hier geen betaling
    // zonder expliciete acceptatie. OPEN JURIDISCHE VRAAG (zie eindrapport): of een per-bestand-
    // aankoop een EIGEN, aparte "ik verlies mijn herroepingsrecht"-bevestiging vereist (los van
    // deze Terms-checkbox) is niet door code te beslissen — gerapporteerd als OVERGESLAGEN.
    if (termsAccepted !== true) {
      return new NextResponse("Terms acceptance required", { status: 400 })
    }

    const admin = createAdminClient()
    const { data: quote, error: quoteErr } = await admin
      .from("quick_quotes")
      .select("id,access_token,status,expires_at,total_price_cents,total_credits,email")
      .eq("id", quoteId)
      .single()

    if (quoteErr || !quote || quote.access_token !== accessToken) {
      return new NextResponse("Quote not found", { status: 404 })
    }
    if (quote.status !== "pending") {
      return NextResponse.json({ error: "Quote already processed", status: quote.status }, { status: 409 })
    }
    if (new Date(quote.expires_at).getTime() < Date.now()) {
      return new NextResponse("Quote expired", { status: 410 })
    }

    // Ingelogde gebruiker met genoeg saldo: afrekenen met credits, geen Stripe. "Buy credits bij
    // te weinig saldo" bewaart dezelfde quoteId (bestaand lek uit growth-plan.md §6.1 punt 6) —
    // de client navigeert naar /dashboard/credits?resumeQuote=<id> en komt terug op dit endpoint.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: creditsData } = await supabase
        .rpc("get_user_credits", { p_user_id: user.id })
        .single()
      const balance = (creditsData as { credits: number } | null)?.credits ?? 0

      if (balance >= quote.total_credits) {
        const dispatchForm = new FormData()
        dispatchForm.append("user_id", user.id)
        const dispatchRes = await fetch(`${PYTHON_BACKEND_URL}/api/quote/${quoteId}/dispatch`, {
          method: "POST",
          headers: { "X-Backend-Secret": process.env.BACKEND_API_SECRET || "" },
          body: dispatchForm,
        })
        if (!dispatchRes.ok) {
          return new NextResponse("Dispatch failed", { status: 502 })
        }
        const dispatchData = await dispatchRes.json()
        return NextResponse.json({ paidWithCredits: true, quoteId, ...dispatchData })
      }
    }

    // Anoniem, of ingelogd zonder genoeg saldo: Stripe Checkout voor het volledige offertebedrag.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "required", // Radar-landenblokkade (ADR-062) blijft hierdoor gelden
      automatic_tax: { enabled: true },
      customer_email: quote.email ?? undefined, // alleen gezet als de koper al eerder iets invulde
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Quick transcript",
              description: `${quote.total_credits} credit${quote.total_credits === 1 ? "" : "s"} of AI transcription`,
              tax_code: "txcd_10000000",
            },
            unit_amount: quote.total_price_cents,
            tax_behavior: "inclusive",
          },
          quantity: 1,
        },
      ],
      metadata: {
        quoteId,
        productType: "quick_purchase",
        userId: user?.id ?? "",
        termsVersion: LEGAL_VERSION,
        // growth-plan.md §6.2 Onderdeel D: via/kw first-touch attribution, carried through to the
        // quick_purchase_completed PostHog event in the webhook (no DB column needed for this).
        ...(via ? { via: String(via) } : {}),
        ...(kw ? { kw: String(kw) } : {}),
        ...(gclid ? { gclid: String(gclid) } : {}),
      },
      success_url: `${appUrl}/quick/${quoteId}?token=${accessToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/quick/${quoteId}?token=${accessToken}&cancelled=1`,
    })

    await admin.from("quick_quotes").update({ stripe_session_id: session.id }).eq("id", quoteId)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[QUICK_CHECKOUT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
