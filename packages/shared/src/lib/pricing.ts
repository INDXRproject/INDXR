// Single source of truth for pricing, credit costs, and free-tier limits.
// Wijzig prijzen of credit-costs HIER en nergens anders.
// Geïmporteerd door: pricing page, billing page, Stripe checkout route, docs pages, free tool, API endpoints.

export interface PricingPackage {
  id: "try" | "starter" | "plus" | "power"
  name: string
  priceEur: number
  credits: number
  audience: string // korte positionering (tier-kaart)
  description: string // klant-gerichte omschrijving, in lijn met de Stripe-producten
  mostPopular: boolean
  prominent: boolean // true voor Starter/Plus/Power, false voor Try (secondary strip)
  // Live Stripe koppeling (one-off prices, EUR, BTW-inclusief). credits MOET exact
  // gelijk zijn aan de Stripe price-metadata `credits` (meervoud) van dit product.
  stripeProductId: string
  stripeLookupKey: string
}

// 4-tier model — zie ADR-052. Credits matchen 1-op-1 de live Stripe price-metadata `credits`.
export const PACKAGES: PricingPackage[] = [
  {
    id: "try",
    name: "Try",
    priceEur: 3.49,
    credits: 100,
    audience: "Try it on your own videos",
    description:
      "100 credits to try INDXR on your own videos. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports for vector databases (1 credit per 15 minutes of video). Extracting existing YouTube captions is always free. Credits never expire.",
    mostPopular: false,
    prominent: false,
    stripeProductId: "prod_UrNkT2na9l2iPA",
    stripeLookupKey: "try_100",
  },
  {
    id: "starter",
    name: "Starter",
    priceEur: 9.99,
    credits: 400,
    audience: "Occasional use",
    description:
      "400 credits for regular use. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports (1 credit per 15 minutes of video). Extracting existing captions is always free. Credits never expire.",
    mostPopular: false,
    prominent: true,
    stripeProductId: "prod_UrNnnbtllIVRtd",
    stripeLookupKey: "starter_400",
  },
  {
    id: "plus",
    name: "Plus",
    priceEur: 24.99,
    credits: 1300,
    audience: "Regular transcription — best value",
    description:
      "1,300 credits — the sweet spot for regular transcription. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports (1 credit per 15 minutes of video). Extracting existing captions is always free. Credits never expire.",
    mostPopular: true,
    prominent: true,
    stripeProductId: "prod_UrNoFwMCKp8OOB",
    stripeLookupKey: "plus_1300",
  },
  {
    id: "power",
    name: "Power",
    priceEur: 49.99,
    credits: 3100,
    audience: "High volume, lowest price per credit",
    description:
      "3,100 credits at our lowest price per credit, for people who process a lot of long videos. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports (1 credit per 15 minutes of video). Extracting existing captions is always free. Credits never expire.",
    mostPopular: false,
    prominent: true,
    stripeProductId: "prod_UrNpeuGzIiVMf5",
    stripeLookupKey: "power_3100",
  },
]

// Credit costs per action — wijzig HIER om credit-economics aan te passen.
export const CREDIT_COSTS = {
  AI_TRANSCRIPTION_PER_MIN: 1,
  PLAYLIST_VIDEO_AUTO_CAPTIONS: 1, // per video voorbij eerste 3 free
  AI_SUMMARY: 3,
  RAG_JSON_PER_15MIN: 1,
  SINGLE_VIDEO_AUTO_CAPTIONS: 0, // altijd gratis
} as const

// Free-tier limits
export const FREE_TIER = {
  WELCOME_CREDITS: 25,
  PLAYLIST_FREE_VIDEOS: 3, // eerste 3 videos van elke playlist gratis
  RAG_FREE_EXPORTS: 3, // eerste 3 RAG exports gratis
} as const

// Helpers

export function getPackage(id: PricingPackage["id"]): PricingPackage {
  const pkg = PACKAGES.find((p) => p.id === id)
  if (!pkg) throw new Error(`Unknown package id: ${id}`)
  return pkg
}

export function formatEur(amount: number): string {
  return `€${amount.toFixed(2)}`
}

export function pricePerCredit(pkg: PricingPackage): number {
  return pkg.priceEur / pkg.credits
}

export function costInTier(credits: number, pkg: PricingPackage): number {
  return credits * pricePerCredit(pkg)
}

export function pricePerMinute(pkg: PricingPackage): number {
  return pricePerCredit(pkg) * CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
}
