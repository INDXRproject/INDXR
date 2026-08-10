import type { ReactNode } from "react"
import { JsonLd } from "@/components/seo/JsonLd"
import { AuthorCard } from "@/components/content/AuthorCard"
import { ArticleHero, type ArticleCategory } from "@/components/content/ArticleHero"
import { ArticleFAQ } from "@/components/content/ArticleFAQ"
import { RelatedArticles } from "@/components/content/RelatedArticles"
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
      "@type": "SoftwareApplication",
      name: "INDXR.AI",
      description: metaDescription,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      url: "https://indxr.ai",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        description: "Free for basic use. Credits required for AI transcription.",
      },
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
      <div className="container mx-auto px-6 py-8 max-w-3xl">
      <article className="max-w-3xl py-12">
        <ArticleHero title={title} category={category} slug={slug} />
        <AuthorCard author={author} publishedAt={publishedAt} updatedAt={updatedAt} />
        <div className="mt-8 prose-content text-[var(--fg-subtle)] leading-relaxed">
          {children}
        </div>
        {faqs.length > 0 && (
          <section className="mt-12 border-t border-[var(--border)] pt-10">
            <h2 className="text-xl font-semibold text-[var(--fg)] mb-6">
              Frequently Asked Questions
            </h2>
            <ArticleFAQ faqs={faqs} />
          </section>
        )}
        {sources && sources.length > 0 && (
          <section className="mt-10 border-t border-[var(--border)] pt-8">
            <h2 className="text-sm font-semibold text-[var(--fg-muted)] uppercase tracking-wide mb-3">
              Sources
            </h2>
            <ul className="space-y-1">
              {sources.map(({ label, url }, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <RelatedArticles slug={slug} />
      </article>
      </div>
    </>
  )
}
