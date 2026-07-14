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
  // Pad (relatief t.o.v. de app-public root) naar de pakket-afbeelding die op de
  // Stripe-betaalpagina naast het line-item verschijnt. Wordt door de checkout-route
  // met NEXT_PUBLIC_APP_URL tot een absolute https-URL samengesteld (Stripe rendert
  // geen localhost/relatieve URL's). Bestand: apps/app/public/packages/.
  image: string
  // Live Stripe koppeling (one-off prices, EUR, BTW-inclusief). credits MOET exact
  // gelijk zijn aan de Stripe price-metadata `credits` (meervoud) van dit product.
  stripeProductId: string
  stripeLookupKey: string
}

// 4-tier model met RONDE prijzen — zie ADR-058 (supersedet ADR-052).
// Ronde prijzen zijn een bewuste keuze (ihsaan: geen ,99-charm-trucs; ronde bedragen
// signaleren kwaliteit/vertrouwen). Credits matchen 1-op-1 de live Stripe price-metadata `credits`.
//
// LOOKUP_KEY-NOOT (Stripe-reconciliatie): `stripeLookupKey` en `stripeProductId` worden
// NERGENS in de code gelezen — checkout gebruikt inline `price_data` (unit_amount = priceEur*100)
// en de webhook grant `metadata.credits`. De keys hieronder MIRRORREN uitsluitend de live Stripe
// Price-objecten en zijn daarmee IN SYNC: Khidr heeft de Stripe-lookup_keys op 2026-07-14
// hernoemd naar `plus_1000`/`power_3000`, en die zijn hier overgenomen. De eerdere ADR-058-
// rationale ("bewust niet hernoemd i.v.m. Stripe-mirror") is daarmee vervallen — de mirror klopt weer.
export const PACKAGES: PricingPackage[] = [
  {
    id: "try",
    name: "Try",
    priceEur: 5,
    credits: 100,
    audience: "Try it on your own videos",
    description:
      "100 credits to try INDXR on your own videos. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports for vector databases (1 credit per 10 minutes of video). Extracting existing YouTube captions is always free. Credits never expire.",
    mostPopular: false,
    prominent: false,
    image: "/packages/try-100.webp",
    stripeProductId: "prod_UrNkT2na9l2iPA",
    stripeLookupKey: "try_100",
  },
  {
    id: "starter",
    name: "Starter",
    priceEur: 15,
    credits: 400,
    audience: "Occasional use",
    description:
      "400 credits for regular use. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports (1 credit per 10 minutes of video). Extracting existing captions is always free. Credits never expire.",
    mostPopular: false,
    prominent: true,
    image: "/packages/starter-400.webp",
    stripeProductId: "prod_UrNnnbtllIVRtd",
    stripeLookupKey: "starter_400",
  },
  {
    id: "plus",
    name: "Plus",
    priceEur: 25,
    credits: 1000,
    audience: "Regular transcription — best value",
    description:
      "1,000 credits — the sweet spot for regular transcription. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports (1 credit per 10 minutes of video). Extracting existing captions is always free. Credits never expire.",
    mostPopular: true,
    prominent: true,
    image: "/packages/plus-1000.webp",
    stripeProductId: "prod_UrNoFwMCKp8OOB",
    stripeLookupKey: "plus_1000",
  },
  {
    id: "power",
    name: "Power",
    priceEur: 60,
    credits: 3000,
    audience: "High volume, lowest price per credit",
    description:
      "3,000 credits at our lowest price per credit, for people who process a lot of long videos. Credits are used for AI transcription (1 credit per minute), playlist processing (first 3 videos free, then 1 credit per video), and RAG-ready JSON exports (1 credit per 10 minutes of video). Extracting existing captions is always free. Credits never expire.",
    mostPopular: false,
    prominent: true,
    image: "/packages/power-3000.webp",
    stripeProductId: "prod_UrNpeuGzIiVMf5",
    stripeLookupKey: "power_3000",
  },
]

// Geldige plan-ID's — voor client-side guards (bv. auto-checkout via ?checkout=).
// De checkout-route valideert zelf óók server-side; dit is een defensieve extra.
export const VALID_PLAN_IDS: ReadonlySet<string> = new Set(PACKAGES.map((p) => p.id))

// Credit costs per action — wijzig HIER om credit-economics aan te passen.
export const CREDIT_COSTS = {
  AI_TRANSCRIPTION_PER_MIN: 1,
  PLAYLIST_VIDEO_AUTO_CAPTIONS: 1, // per video voorbij eerste 3 free
  AI_SUMMARY: 3,
  RAG_JSON_PER_10MIN: 1, // 1 credit per 10 min video (ADR-058, was per 15 min); formule ⌈duur/600⌉ min 1
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

// ---------------------------------------------------------------------------
// Content helpers — render álle getoonde prijzen/credit-voorbeelden uit deze bron.
// Nooit hardcoden in artikelen/pagina's. Credits-first (stabiel); euro-voorbeelden
// worden berekend tegen een ankertier (Plus). Repricing = wijzig alleen PACKAGES.
// Vind elke pricing-plek in de codebase met:  grep -rn "@indxr/shared/lib/pricing" apps/
// ---------------------------------------------------------------------------

// Ankertier voor euro-kostenvoorbeelden in content ("at Plus pricing").
export const ANCHOR_TIER_ID: PricingPackage["id"] = "plus"

export function getAnchorPackage(): PricingPackage {
  return getPackage(ANCHOR_TIER_ID)
}

// Goedkoopste tier — voor "starting at …".
export function cheapestPackage(): PricingPackage {
  return PACKAGES.reduce((lo, p) => (p.priceEur < lo.priceEur ? p : lo))
}

// "€5.00 / 100 credits" voor een specifieke tier.
export function tierPriceCredits(id: PricingPackage["id"]): string {
  const p = getPackage(id)
  return `${formatEur(p.priceEur)} / ${p.credits.toLocaleString()} credits`
}

// Euro-kost van N credits tegen een tier (default: anker), geformatteerd → "€1.15".
export function creditCostEur(credits: number, pkg: PricingPackage = getAnchorPackage()): string {
  return formatEur(costInTier(credits, pkg))
}

// Volledige voorbeeldfrase → "~€1.15 at Plus pricing".
export function creditCostPhrase(credits: number, pkg: PricingPackage = getAnchorPackage()): string {
  return `~${creditCostEur(credits, pkg)} at ${pkg.name} pricing`
}

// Prijs-per-credit tegen het anker, 3 decimalen → "€0.019/credit".
export function anchorPerCreditText(): string {
  return `€${pricePerCredit(getAnchorPackage()).toFixed(3)}/credit`
}
