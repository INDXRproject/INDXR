import { Children, isValidElement, type ReactNode } from "react"
import { AuthorCard } from "@/components/content/AuthorCard"
import { ArticleHero, type ArticleCategory } from "@/components/content/ArticleHero"
import { ArticleFAQ } from "@/components/content/ArticleFAQ"
import { RelatedArticles } from "@/components/content/RelatedArticles"
import { ArticleToc } from "@/components/content/ArticleToc"
import { ArticleCta } from "@/components/content/ArticleCta"
import type { Author } from "@/lib/authors"
import { reactNodeToText } from "@/lib/reactNodeToText"

// Shared article layout for the three templates (Article / Tutorial / ToolPage), which rendered
// identical markup (stijl B, 2026-11-06). Schema stays in each template; this is presentation only:
// hero (mono label + reading time + big title), body with a sticky "On this page" column on
// desktop, one CTA before the middle h2 and one at the end, then FAQ / sources / see also.

const BODY_ID = "article-body"
const INK = "border-[var(--fg-strong)]"

// Insert the mid-article CTA before the top-level <h2> closest to the middle of the body.
function withMidCta(children: ReactNode): ReactNode[] {
  const nodes = Children.toArray(children)
  const h2Idx = nodes
    .map((n, i) => (isValidElement(n) && n.type === "h2" ? i : -1))
    .filter((i) => i > 0)
  if (h2Idx.length < 3) return nodes
  const mid = h2Idx.reduce((best, i) => (Math.abs(i - nodes.length / 2) < Math.abs(best - nodes.length / 2) ? i : best))
  return [...nodes.slice(0, mid), <ArticleCta key="mid-cta" variant="mid" />, ...nodes.slice(mid)]
}

export function ArticleShell({
  title,
  category,
  slug,
  author,
  publishedAt,
  updatedAt,
  faqs,
  sources,
  children,
}: {
  title: string
  category?: ArticleCategory
  slug?: string
  author: Author
  publishedAt: string
  updatedAt: string
  faqs: Array<{ q: string; a: ReactNode }>
  sources?: Array<{ label: string; url: string }>
  children: ReactNode
}) {
  const words = reactNodeToText(children).split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 230))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-[104px] sm:px-6 lg:pt-[120px]">
      <ArticleHero title={title} category={category} slug={slug} readingMinutes={minutes} />
      <div className={`border-b-2 ${INK} pb-2`}>
        <AuthorCard author={author} publishedAt={publishedAt} updatedAt={updatedAt} />
      </div>
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="min-w-0 max-w-3xl">
          <div id={BODY_ID} className="prose-content text-[var(--fg-subtle)] leading-relaxed">
            {withMidCta(children)}
          </div>
          <ArticleCta variant="end" />
          {faqs.length > 0 && (
            <section className={`mt-14 border-t-2 ${INK} pt-10`}>
              <h2 className="mb-6 text-2xl font-bold tracking-[-0.02em] text-[var(--fg-strong)] sm:text-3xl">
                Frequently asked questions
              </h2>
              <ArticleFAQ faqs={faqs} />
            </section>
          )}
          {sources && sources.length > 0 && (
            <section className={`mt-12 border-t-2 ${INK} pt-8`}>
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">Sources</h2>
              <ul className="space-y-1">
                {sources.map(({ label, url }, i) => (
                  <li key={i} className="text-sm">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--link)] underline hover:text-[var(--link-hover)]">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <RelatedArticles slug={slug} />
        </article>
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ArticleToc bodyId={BODY_ID} />
          </div>
        </aside>
      </div>
    </div>
  )
}
