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
  oneLiner = "YouTube captions stay free for single videos. Sign up to unlock playlists, AI transcription, and your personal library.",
  primaryCtaLabel = "Sign up free",
  primaryCtaHref = "/signup",
  secondaryLabel = "Or try without an account →",
  secondaryHref = "/transcribe",
}: ClosingCTASectionProps) {
  return (
    <section className="w-full border-t-2 border-[var(--fg-strong)] bg-[var(--accent)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:py-20">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-bold leading-[0.98] tracking-[-0.04em] text-[var(--fg-on-accent)] sm:text-6xl">{headline}</h2>
          <p className="mt-4 text-lg text-[var(--fg-on-accent)]">{oneLiner}</p>
        </div>
        <div className="flex w-full flex-col items-start gap-4 sm:w-auto">
          <Link
            href={primaryCtaHref}
            className="inline-flex h-14 w-full items-center justify-center border-2 border-[var(--fg-strong)] bg-[var(--fg-strong)] px-6 font-bold text-[var(--bg)] hover:opacity-90 sm:w-auto"
          >
            {primaryCtaLabel}
          </Link>
          <Link href={secondaryHref} className="text-sm font-medium text-[var(--fg-on-accent)] underline underline-offset-4">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
