"use client"

import { useConsent } from "../../providers/ConsentProvider"

// "Cookie settings" trigger — reopens the consent banner so the choice can be changed
// or withdrawn (withdrawing wipes _gcl_* on both hosts). Rendered in the marketing
// Footer and the app sidebar footer, so the opt-out is reachable on both hosts (this
// also serves as the ROW notice-at-collection alongside the /privacy cookie table).
export function CookieSettingsLink({ className }: { className?: string }) {
  const { openManager } = useConsent()
  return (
    <button
      type="button"
      onClick={openManager}
      className={
        className ??
        "text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
      }
    >
      Cookie settings
    </button>
  )
}
