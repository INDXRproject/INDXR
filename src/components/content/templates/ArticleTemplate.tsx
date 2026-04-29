import type { ReactNode } from "react"
import { JsonLd } from "@/components/seo/JsonLd"
import { AuthorCard } from "@/components/content/AuthorCard"
import type { Author } from "@/lib/authors"

interface ArticleTemplateProps {
  title: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  author: Author
  children: ReactNode
  faqs: Array<{ q: string; a: ReactNode }>
  sources: Array<{ label: string; url: string }>
}

export function ArticleTemplate({
  title,
  metaDescription,
  publishedAt,
  updatedAt,
  author,
  children,
  faqs,
  sources,
}: ArticleTemplateProps) {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: metaDescription,
      datePublished: publishedAt,
      dateModified: updatedAt,
      author: {
        "@type": "Person",
        name: author.name,
      },
      publisher: {
        "@type": "Organization",
        name: "INDXR.AI",
        url: "https://indxr.ai",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: typeof a === "string" ? a : "" },
      })),
    },
  ]

  return (
    <>
      <JsonLd schemas={schemas} />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fg)] mb-4">
          {title}
        </h1>
        <AuthorCard author={author} publishedAt={publishedAt} updatedAt={updatedAt} />
        <div className="mt-8 prose-content text-[var(--fg-subtle)] leading-relaxed">
          {children}
        </div>
        {faqs.length > 0 && (
          <section className="mt-12 border-t border-[var(--border)] pt-10">
            <h2 className="text-xl font-semibold text-[var(--fg)] mb-6">
              Frequently Asked Questions
            </h2>
            <dl className="space-y-6">
              {faqs.map(({ q, a }, i) => (
                <div key={i}>
                  <dt className="font-medium text-[var(--fg)] mb-1">{q}</dt>
                  <dd className="text-[var(--fg-subtle)] text-sm leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {sources.length > 0 && (
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
      </article>
    </>
  )
}
