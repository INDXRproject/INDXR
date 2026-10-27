// Generic og:url + og:image + twitter:card for a page, keyed off its own canonical path (Ahrefs
// crawl 2026-10-27: og:url missing everywhere, 27 pages had no OG/twitter at all). Spread into a
// page's `metadata` object. A page's own top-level `title`/`description` still win for
// og:title/og:description — Next.js fills those from the page's resolved title/description when
// openGraph.title/description aren't set explicitly (same-object fallback, not cross-layer).
// A page that sets its OWN `openGraph` key REPLACES the root layout's default wholesale (Next.js
// metadata merge is shallow per key), so this must be spread on every page, not just the root.
const DEFAULT_OG_IMAGE = "https://indxr.ai/og-default.jpg"

export function pageOg(
  canonicalPath: string,
  opts?: { image?: string; width?: number; height?: number; type?: "website" | "article" },
) {
  const image = opts?.image ?? DEFAULT_OG_IMAGE
  const width = opts?.width ?? 1200
  const height = opts?.height ?? 630
  return {
    openGraph: {
      type: opts?.type ?? ("website" as const),
      url: `https://indxr.ai${canonicalPath}`,
      images: [{ url: image, width, height }],
    },
    twitter: {
      card: "summary_large_image" as const,
      images: [image],
    },
  }
}
