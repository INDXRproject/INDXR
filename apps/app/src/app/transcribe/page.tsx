import { QuickCheckoutPanel } from "@indxr/shared/components/free-tool/QuickCheckoutPanel"
import { RedirectIfLoggedIn } from "./RedirectIfLoggedIn"

// Public anonymous entry point for the snelle balie (growth-plan.md §6.2 Onderdeel B: "Bezoeker
// uploadt ... op /transcribe, uploadtab. Er is geen account nodig."). Deliberately OUTSIDE
// /dashboard — middleware.ts gates every /dashboard/* path behind auth, which would make the
// anonymous quick-checkout path unreachable. Logged-in visitors are redirected to the full
// workspace (/dashboard/transcribe) via RedirectIfLoggedIn, a client island that renders nothing.
//
// Server component (no "use client"): headline/subtext/QuickCheckoutPanel are in the server-
// rendered HTML from the first response — visible at first paint even before any JS has loaded or
// run, not just after hydration (growth-plan.md §6.3 mobile-bounce-onderzoek, LOG 2026-10-29/30).
// Renders QuickCheckoutPanel directly instead of going through AudioTab (which this route used to
// use): AudioTab is the shared, auth-aware component for BOTH this public page and the logged-in
// /dashboard/transcribe workspace, and gates its content behind `useAuth().loading` — correct for
// the dashboard (which needs to know credits/library before showing anything), but on this page
// that gate is pure, avoidable delay: QuickCheckoutPanel itself doesn't use auth state at all (it's
// the anonymous-only path), so rendering it directly removes the last client-side blocker between
// first paint and a tappable upload box. The dashboard route is untouched — AudioTab's own
// loading/user branching still runs there exactly as before.
export default function PublicTranscribePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <RedirectIfLoggedIn />
      <h1 className="text-2xl font-semibold text-fg mb-2">Transcribe a file</h1>
      <p className="text-sm text-fg-muted mb-2">
        No account needed — see the price, get a free preview of the first part (up to 3 minutes), then pay per file.
      </p>
      <QuickCheckoutPanel />
    </div>
  )
}
