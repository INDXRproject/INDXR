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

// One class for the primary CTA, applied to the real element (Link / a / button) — never a <button>
// nested inside a link or another button (invalid HTML, broken keyboard focus).
const PRIMARY =
  "inline-flex h-11 w-full items-center justify-center border-2 border-[var(--fg-strong)] bg-[var(--accent)] px-5 text-sm font-bold text-[var(--fg-on-accent)] transition-colors hover:bg-[var(--accent-hover)] cursor-pointer sm:w-auto"

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
    "text-sm text-[var(--fg-subtle)] hover:text-[var(--fg-strong)] hover:underline underline-offset-4 transition-colors flex items-center justify-center sm:justify-start cursor-pointer bg-transparent border-0"

  return (
    <div className={`border-2 border-[var(--fg-strong)] bg-[var(--bg)] p-6 text-left space-y-4 ${className ?? ""}`}>
      <h3 className="text-lg font-bold text-[var(--fg-strong)]">{headline}</h3>
      <p className="text-sm text-[var(--fg-subtle)] leading-relaxed">{body}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {primaryCtaOnClick ? (
          <button type="button" onClick={primaryCtaOnClick} className={PRIMARY}>
            {primaryCtaLabel}
          </button>
        ) : primaryCtaHref && isAbsolute(primaryCtaHref) ? (
          <a href={primaryCtaHref} className={PRIMARY}>
            {primaryCtaLabel}
          </a>
        ) : primaryCtaHref ? (
          <Link href={primaryCtaHref} className={PRIMARY}>
            {primaryCtaLabel}
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
