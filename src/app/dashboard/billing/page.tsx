import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Coins } from "lucide-react"

const plans = [
  {
    name: "Starter",
    credits: 50,
    price: "€4.99",
    description: "Perfect for casual users trying out the platform",
    features: [
      "50 transcript credits",
      "Videos up to 4 hours",
      "TXT, JSON, SRT exports",
      "Credits never expire",
      "Email support",
    ],
    highlight: false,
  },
  {
    name: "Regular",
    credits: 120,
    price: "€9.99",
    description: "Best value for creators and researchers",
    features: [
      "120 transcript credits",
      "Videos up to 4 hours",
      "All export formats (VTT, CSV)",
      "Priority processing",
      "Batch playlist extraction",
      "Credits never expire",
    ],
    highlight: true,
  },
  {
    name: "Power",
    credits: 350,
    price: "€24.99",
    description: "For heavy users and archiving",
    features: [
      "350 transcript credits",
      "Videos up to 4 hours",
      "All export formats",
      "Priority support",
      "Batch processing",
      "API access (Beta)",
      "Credits never expire",
    ],
    highlight: false,
  },
]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch current credits
  const { data: creditsData } = await supabase.rpc("get_user_credits", { p_user_id: user.id }).single()
  const credits = creditsData
    ? ((creditsData.total_credits_purchased || 0) + (creditsData.credits_bonus || 0) - (creditsData.total_credits_used || 0))
    : 0

  return (
    <div className="container max-w-5xl py-10 px-4 sm:px-6 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Buy Credits</h1>
        <p className="text-muted-foreground">
          Credits are used for transcript extractions. One credit = one video extraction.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
          <Coins className="h-4 w-4 text-yellow-500" />
          <span className="text-foreground font-medium">{credits} credits</span>
          <span className="text-muted-foreground text-sm">current balance</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col ${
              plan.highlight
                ? "bg-card border-primary shadow-lg shadow-primary/10"
                : "bg-card/50 border-border"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-xl">{plan.name}</CardTitle>
              <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm ml-1">one-time</span>
              </div>
              <div className="text-primary font-medium text-sm">{plan.credits} credits included</div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-6">
              <ul className="space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlight ? "default" : "outline"}
                disabled
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Stripe payments coming soon. Credits will be added instantly after purchase.
      </p>
    </div>
  )
}
