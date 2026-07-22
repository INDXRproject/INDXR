// BreadcrumbList JSON-LD for the /articles/* pages. The leaf (the article itself) omits
// its `item` URL — valid per schema.org (the last crumb is understood as the current page),
// so no per-article slug is needed. Home → Articles → <title>.
export function articlesBreadcrumb(title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://indxr.ai/" },
      { "@type": "ListItem", position: 2, name: "Articles", item: "https://indxr.ai/articles" },
      { "@type": "ListItem", position: 3, name: title },
    ],
  }
}
