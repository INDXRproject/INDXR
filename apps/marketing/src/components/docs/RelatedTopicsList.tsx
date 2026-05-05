// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"

interface RelatedTopic {
  label: string
  href: string
}

interface RelatedTopicsListProps {
  topics: RelatedTopic[]
  title?: string
}

export function RelatedTopicsList({ topics, title = "See also" }: RelatedTopicsListProps) {
  return (
    <div className="mt-10 pt-6 border-t border-[var(--border)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">{title}</p>
      <ul className="space-y-1.5">
        {topics.map((topic) => (
          <li key={topic.href}>
            <Link
              href={topic.href}
              className="text-sm text-[var(--accent)] hover:underline underline-offset-4"
            >
              {topic.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
