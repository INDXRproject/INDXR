// Single source of truth for pricing, credit costs, and free-tier limits.
// Wijzig prijzen of credit-costs HIER en nergens anders.
// Geïmporteerd door: pricing page, billing page, Stripe checkout route, docs pages, free tool, API endpoints.

export interface PricingPackage {
  id: "try" | "basic" | "plus" | "pro" | "power"
  name: string
  priceEur: number
  credits: number
  audience: string
  mostPopular: boolean
  prominent: boolean // true voor Basic/Plus/Pro, false voor Try/Power
}

export const PACKAGES: PricingPackage[] = [
  {
    id: "try",
    name: "Try",
    priceEur: 2.49,
    credits: 150,
    audience: "Testing the waters — a single project or quick experiment",
    mostPopular: false,
    prominent: false,
  },
  {
    id: "basic",
    name: "Basic",
    priceEur: 5.99,
    credits: 500,
    audience: "Occasional use, short courses, individual research",
    mostPopular: false,
    prominent: true,
  },
  {
    id: "plus",
    name: "Plus",
    priceEur: 11.99,
    credits: 1200,
    audience: "Regular use — researchers, content creators, developers",
    mostPopular: true,
    prominent: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceEur: 24.99,
    credits: 2800,
    audience: "Heavy use, large corpus projects, agencies",
    mostPopular: false,
    prominent: true,
  },
  {
    id: "power",
    name: "Power",
    priceEur: 49.99,
    credits: 6000,
    audience: "Power users — best per-credit rate",
    mostPopular: false,
    prominent: false,
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
