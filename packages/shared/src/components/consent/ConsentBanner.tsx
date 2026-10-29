"use client"

import { marketingHref } from "../../lib/cross-host-links"

// Inline, persistent consent banner (house rule: no toasts). Accept and Decline are
// the same size and weight — no dark pattern (ihsaan; Google also checks this). Only
// shown for EEA visitors with no prior choice, or when re-opened via "Cookie settings".
//
// Compact on mobile (growth-plan.md §6.3 mobile-bounce-onderzoek, LOG 2026-10-29): at the old
// p-4/text-sm/leading-relaxed/h-10 sizing this banner measured ~213px tall on a 393×852 viewport —
// tall enough to overlap the bottom ~28px of the balie's dropzone (confirmed via elementFromPoint:
// a tap on the dropzone's "tap to choose a file" text hit the banner's card, not the input). Same
// copy, same EEA-only gating, same Accept/Decline parity — only the padding/type-scale/line-height/
// button-height shrink below `sm`, which is just enough to clear the dropzone without touching its
// layout. Desktop (`sm:` and up) is pixel-identical to before.
export function ConsentBanner({
  hasChoice,
  onAccept,
  onDecline,
  onClose,
}: {
  hasChoice: boolean
  onAccept: () => void
  onDecline: () => void
  onClose?: () => void
}) {
  return (
    <div
      role="dialog"
      aria-label="Advertising cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-5"
    >
      <div className="relative mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg p-3 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="text-xs sm:text-sm text-[var(--fg-subtle)] leading-snug sm:leading-relaxed">
            <p>
              <span className="font-semibold text-[var(--fg)]">We&apos;d like to know which ad or link brought you here.</span>{" "}
              That&apos;s the only thing these cookies do — we don&apos;t build a profile of you or follow
              you around the web.{" "}
              <a
                href={marketingHref("/privacy")}
                className="underline text-[var(--fg)] hover:text-[var(--accent)]"
              >
                Privacy Policy
              </a>
            </p>
          </div>

          <div className="flex shrink-0 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onDecline}
              className="h-9 sm:h-10 flex-1 sm:flex-none px-4 sm:px-5 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] text-sm font-medium text-[var(--fg)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="h-9 sm:h-10 flex-1 sm:flex-none px-4 sm:px-5 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent)] text-sm font-medium text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              Accept
            </button>
          </div>
        </div>

        {hasChoice && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 text-xs leading-none text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
