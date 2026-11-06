import Link from "next/link"
import { PACKAGES, pricePerMinute, formatEurExact, FREE_TIER } from "@indxr/shared/lib/pricing"

// In-article call to action (stijl B). Prices derive from pricing.ts — never typed. The mid variant
// renders inside .prose-content, whose `a` rule (colour + underline) outranks a single class, hence the
// `!` utilities on its link.
const cheapestPerMin = Math.min(...PACKAGES.map((p) => pricePerMinute(p)))

export function ArticleCta({ variant = "end" }: { variant?: "mid" | "end" }) {
  if (variant === "mid") {
    return (
      <aside className="my-10 flex flex-wrap items-center justify-between gap-4 border-2 border-[var(--fg-strong)] p-5">
        <p className="text-base font-bold text-[var(--fg-strong)]">
          Try it on your own file or link.{" "}
          <span className="font-normal text-[var(--fg-subtle)]">No account needed for a single video.</span>
        </p>
        <Link
          href="/#try"
          className="border-2 border-[var(--fg-strong)] bg-[var(--accent)] px-4 py-2 text-sm font-bold !text-[var(--fg-on-accent)] !no-underline hover:bg-[var(--accent-hover)]"
        >
          Try it now →
        </Link>
      </aside>
    )
  }
  return (
    <aside className="mt-14 grid border-2 border-[var(--fg-strong)] sm:grid-cols-[1fr_auto]">
      <div className="p-6 sm:p-8">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">Transcripts, done properly</p>
        <p className="text-2xl font-bold tracking-[-0.02em] text-[var(--fg-strong)] sm:text-3xl">Try it on your own file.</p>
        <p className="mt-3 text-[var(--fg-subtle)]">
          YouTube captions free · AI transcription from {formatEurExact(cheapestPerMin)}/min · no subscription.
          A free account starts with {FREE_TIER.WELCOME_CREDITS} credits.
        </p>
      </div>
      <div className="flex flex-col justify-center gap-0 border-t-2 border-[var(--fg-strong)] bg-[var(--accent)] p-6 sm:border-t-0 sm:border-l-2 sm:p-8">
        <Link
          href="/#try"
          className="border-2 border-[var(--fg-strong)] bg-[var(--fg-strong)] px-5 py-3 text-center text-sm font-bold text-[var(--bg)] no-underline hover:opacity-90"
        >
          Try it now →
        </Link>
        <Link
          href="/pricing"
          className="-mt-[2px] border-2 border-[var(--fg-strong)] bg-[var(--bg)] px-5 py-3 text-center text-sm font-bold text-[var(--fg-strong)] no-underline hover:bg-[var(--bg-subtle)]"
        >
          See pricing
        </Link>
      </div>
    </aside>
  )
}
