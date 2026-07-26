// Inline conversion card shown at feature-gating boundaries (playlist/audio/AI for
// anonymous visitors). Not a modal — rendered inline where the user hits the limit.
// Shared so both the marketing free tool and the app workbench can gate identically.

import Link from "next/link"

interface FrictionConversionCardProps {
  headline: string
  body: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryLabel?: string
  secondaryHref?: string
  className?: string
}

export function FrictionConversionCard({
  headline,
  body,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryLabel,
  secondaryHref,
  className,
}: FrictionConversionCardProps) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left space-y-4 ${className ?? ""}`}>
      <h3 className="font-semibold text-[var(--fg)]">{headline}</h3>
      <p className="text-sm text-[var(--fg-subtle)] leading-relaxed">{body}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={primaryCtaHref}>
          <button className="px-5 py-2.5 h-10 rounded-lg font-semibold text-sm bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer w-full sm:w-auto">
            {primaryCtaLabel}
          </button>
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="text-sm text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors flex items-center justify-center sm:justify-start"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
