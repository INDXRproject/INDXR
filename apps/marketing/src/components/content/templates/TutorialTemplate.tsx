import { JsonLd } from "@/components/seo/JsonLd"
import { type ArticleCategory } from "@/components/content/ArticleHero"
import { ArticleShell } from "@/components/content/ArticleShell"
import type { Author } from "@/lib/authors"
import { reactNodeToText } from "@/lib/reactNodeToText"
import { articlesBreadcrumb } from "@/lib/breadcrumbSchema"

interface TutorialTemplateProps {
  title: string
  category?: ArticleCategory
  slug?: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  author: Author
  children: React.ReactNode
  faqs: Array<{ q: string; a: string }>
  sources: Array<{ label: string; url: string }>
  steps?: Array<{ name: string; text: string }>
}

export function TutorialTemplate({
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
  steps,
}: TutorialTemplateProps) {
  const schemas: Record<string, unknown>[] = [
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

  if (steps && steps.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: title,
      description: metaDescription,
      step: steps.map(({ name, text }, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name,
        text,
      })),
    })
  }

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
