// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"

interface ClosingCTASectionProps {
  headline?: string
  oneLiner?: string
  primaryCtaLabel?: string
  primaryCtaHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export function ClosingCTASection({
  headline = "Start organizing your transcripts and exports into a clean library.",
  oneLiner = "Auto-captions stay free for single videos. Sign up to unlock playlists, AI transcription, and your personal library.",
  primaryCtaLabel = "Sign up free",
  primaryCtaHref = "/signup",
  secondaryLabel = "Or try without an account →",
  secondaryHref = "/transcribe",
}: ClosingCTASectionProps) {
  return (
    <div className="w-full py-20 bg-[var(--accent-subtle)]">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--fg)] mb-4">
          {headline}
        </h2>
        <p className="text-[var(--fg-subtle)] mb-8">{oneLiner}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={primaryCtaHref}>
            <button className="px-8 py-3 h-12 rounded-lg font-semibold text-base bg-[var(--accent)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer">
              {primaryCtaLabel}
            </button>
          </Link>
          <Link
            href={secondaryHref}
            className="text-sm text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
