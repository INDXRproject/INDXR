import Link from "next/link"
import { RELATED_ARTICLES } from "@/lib/relatedArticles"

// "See also" footer for articles: up to 3 curated links, each with a one-line reason
// (writing-standard C4). Renders nothing if the slug has no curated set, so it's safe to
// drop into every article template.
export function RelatedArticles({ slug }: { slug?: string }) {
  const related = slug ? RELATED_ARTICLES[slug] : undefined
  if (!related || related.length === 0) return null
  return (
    <section className="mt-12 border-t border-[var(--border)] pt-8">
      <h2 className="text-sm font-semibold text-[var(--fg-muted)] uppercase tracking-wide mb-4">
        See also
      </h2>
      <ul className="space-y-3">
        {related.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="group block">
              <span className="text-sm font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                {r.label}
              </span>
              <span className="block text-sm text-[var(--fg-muted)]">{r.reason}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
