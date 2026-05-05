// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface DocsBreadcrumbProps {
  items: BreadcrumbItem[]
  schema?: boolean
}

export function DocsBreadcrumb({ items, schema = true }: DocsBreadcrumbProps) {
  const breadcrumbSchema = schema
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.label,
          ...(item.href ? { item: `https://indxr.ai${item.href}` } : {}),
        })),
      }
    : null

  return (
    <>
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[var(--fg-muted)] mb-6">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-[var(--fg)] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--fg)] font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
