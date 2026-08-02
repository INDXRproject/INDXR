"use client"

import { marketingHref } from "../../lib/cross-host-links"

// Inline, persistent consent banner (house rule: no toasts). Accept and Decline are
// the same size and weight — no dark pattern (ihsaan; Google also checks this). Only
// shown for EEA visitors with no prior choice, or when re-opened via "Cookie settings".
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
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-5"
    >
      <div className="relative mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--fg-subtle)] leading-relaxed">
            <p>
              <span className="font-semibold text-[var(--fg)]">Help us see which ad brought you here.</span>{" "}
              One cookie from Google Ads, nothing else — no profile, no tracking across sites. You can change this
              any time under Cookie settings.{" "}
              <a
                href={marketingHref("/privacy")}
                className="underline text-[var(--fg)] hover:text-[var(--accent)]"
              >
                Privacy Policy
              </a>
            </p>
          </div>

          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={onDecline}
              className="h-10 flex-1 sm:flex-none px-5 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] text-sm font-medium text-[var(--fg)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="h-10 flex-1 sm:flex-none px-5 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent)] text-sm font-medium text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
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
