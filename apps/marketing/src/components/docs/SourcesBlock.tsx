import { ExternalLink } from "lucide-react"

export interface DocSource {
  /** Who published it, e.g. "AssemblyAI". */
  publisher: string
  /** What claim on this page it backs, e.g. "language coverage and WER tiers". */
  supports: string
  /** External URL. Omit for an internal/own-code source. */
  href?: string
  /** For SPEC pages: the code path the spec was distilled from, e.g. "packages/shared/src/utils/formatTranscript.ts". */
  verifiedAgainst?: string
}

/**
 * Sources block — sits at the bottom of a reference doc, ABOVE RelatedTopicsList.
 * Every external factual claim (language counts, WER tiers, subtitle standards, vector-DB
 * compatibility) names its publisher + what it backs + a link. SPEC pages add a
 * `verifiedAgainst` code path. Renders nothing when there are no sources.
 */
export function SourcesBlock({ sources }: { sources: DocSource[] }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="mt-10 pt-6 border-t border-[var(--border)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">Sources</p>
      <ul className="space-y-2.5 text-sm">
        {sources.map((s, i) => (
          <li key={i} className="text-[var(--fg-subtle)]">
            {s.href ? (
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                {s.publisher}
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </a>
            ) : (
              <span className="font-medium text-[var(--fg)]">{s.publisher}</span>
            )}
            <span> — {s.supports}</span>
            {s.verifiedAgainst && (
              <span className="block mt-0.5 text-xs text-[var(--fg-muted)] font-mono">
                Verified against {s.verifiedAgainst}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
