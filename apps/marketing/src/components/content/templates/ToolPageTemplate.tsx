import type { ReactNode } from "react"
import { JsonLd } from "@/components/seo/JsonLd"
import { type ArticleCategory } from "@/components/content/ArticleHero"
import { ArticleShell } from "@/components/content/ArticleShell"
import type { Author } from "@/lib/authors"
import { reactNodeToText } from "@/lib/reactNodeToText"
import { articlesBreadcrumb } from "@/lib/breadcrumbSchema"

interface ToolPageTemplateProps {
  title: string
  category?: ArticleCategory
  slug?: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  author: Author
  children: ReactNode
  faqs: Array<{ q: string; a: ReactNode }>
  sources?: Array<{ label: string; url: string }>
  /** Absolute URL of the page's main image (screenshot/hero) for JSON-LD. Optional. */
  image?: string
}

export function ToolPageTemplate({
  title,
  category,
  slug,
  metaDescription,
  publishedAt,
  updatedAt,
  author,
  children,
  faqs,
  sources,
  image,
}: ToolPageTemplateProps) {
  const schemas = [
    {
      "@context": "https://schema.org",
      // Article, not SoftwareApplication: Google's Software App rich result requires
      // aggregateRating/review, which INDXR does not have on-site (Ahrefs crawl 2026-11-03:
      // "rich results validation error" on every tool page). Never add invented ratings.
      "@type": "Article",
      headline: title,
      description: metaDescription,
      ...(slug ? { url: `https://indxr.ai/articles/${slug}`, mainEntityOfPage: `https://indxr.ai/articles/${slug}` } : {}),
      author: { "@type": "Person", name: author.name },
      publisher: { "@type": "Organization", name: "INDXR.AI", url: "https://indxr.ai" },
      datePublished: publishedAt,
      dateModified: updatedAt,
      ...(image ? { image } : {}),
    },
    articlesBreadcrumb(title),
    ...(faqs.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: reactNodeToText(a) },
            })),
          },
        ]
      : []),
  ]

  return (
    <>
      <JsonLd schemas={schemas} />
      <ArticleShell
        title={title}
        category={category}
        slug={slug}
        author={author}
        publishedAt={publishedAt}
        updatedAt={updatedAt}
        faqs={faqs}
        sources={sources}
      >
        {children}
      </ArticleShell>
    </>
  )
}
