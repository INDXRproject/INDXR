// Inline conversion card shown at feature-gating boundaries (playlist/audio/AI for
// anonymous visitors, and — on the marketing app — logged-in hand-offs to app.indxr.ai).
// Not a modal — rendered inline where the user hits the limit. Shared so both the marketing
// free tool and the app workbench can gate identically.
//
// A primary/secondary target can be a relative path (same-origin <Link>), an absolute URL
// (cross-host <a>, e.g. app.indxr.ai — a <Link> to another origin breaks RSC prefetch, see
// docs/LESSONS.md cross-host-links), or an onClick (e.g. switch the workbench mode). One
// component, prop-driven — no separate code path per case.

import Link from "next/link"

interface FrictionConversionCardProps {
  headline: string
  body: string
  primaryCtaLabel: string
  /** Relative path → same-origin <Link>; absolute http(s) URL → cross-host <a>. */
  primaryCtaHref?: string
  primaryCtaOnClick?: () => void
  secondaryLabel?: string
  secondaryHref?: string
  secondaryOnClick?: () => void
  className?: string
}

const isAbsolute = (href: string) => /^https?:\/\//.test(href)

function PrimaryButton({ label }: { label: string }) {
  return (
    <button className="px-5 py-2.5 h-10 rounded-lg font-semibold text-sm bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer w-full sm:w-auto">
      {label}
    </button>
  )
}

export function FrictionConversionCard({
  headline,
  body,
  primaryCtaLabel,
  primaryCtaHref,
  primaryCtaOnClick,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
  className,
}: FrictionConversionCardProps) {
  const secondaryClass =
    "text-sm text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors flex items-center justify-center sm:justify-start cursor-pointer bg-transparent border-0"

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left space-y-4 ${className ?? ""}`}>
      <h3 className="font-semibold text-[var(--fg)]">{headline}</h3>
      <p className="text-sm text-[var(--fg-subtle)] leading-relaxed">{body}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {primaryCtaOnClick ? (
          <button type="button" onClick={primaryCtaOnClick}>
            <PrimaryButton label={primaryCtaLabel} />
          </button>
        ) : primaryCtaHref && isAbsolute(primaryCtaHref) ? (
          <a href={primaryCtaHref}>
            <PrimaryButton label={primaryCtaLabel} />
          </a>
        ) : primaryCtaHref ? (
          <Link href={primaryCtaHref}>
            <PrimaryButton label={primaryCtaLabel} />
          </Link>
        ) : null}

        {secondaryLabel && secondaryOnClick && (
          <button type="button" onClick={secondaryOnClick} className={secondaryClass}>
            {secondaryLabel}
          </button>
        )}
        {secondaryLabel && !secondaryOnClick && secondaryHref && isAbsolute(secondaryHref) && (
          <a href={secondaryHref} className={secondaryClass}>
            {secondaryLabel}
          </a>
        )}
        {secondaryLabel && !secondaryOnClick && secondaryHref && !isAbsolute(secondaryHref) && (
          <Link href={secondaryHref} className={secondaryClass}>
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
