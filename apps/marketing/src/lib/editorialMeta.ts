// OpenGraph + Twitter image for an article, from its editorial OG render
// (/editorial/{slug}-og.jpg, 1200×630). Spread into a page's `metadata` object; Next fills
// og/twitter title + description from the page's own title/description. Absolute URL so the
// tag is valid when scraped off-platform (metadataBase would also resolve it, but the task
// asks for an explicit absolute URL).
export function editorialOg(slug: string) {
  const imageUrl = `https://indxr.ai/editorial/${slug}-og.jpg`
  // og:url (Ahrefs crawl 2026-10-27: missing on every /articles/* page). Every caller of this
  // helper lives at /articles/<slug> — same slug the image path already uses.
  const pageUrl = `https://indxr.ai/articles/${slug}`
  return {
    openGraph: {
      type: "article" as const,
      url: pageUrl,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image" as const,
      images: [imageUrl],
    },
  }
}
