import { SidebarProvider } from "@indxr/shared/components/ui/sidebar"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/AppTopbar"
import { MobileTabBar } from "@/components/dashboard/MobileTabBar"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { redirect } from "next/navigation"

// Logged-in users have no marketing footer; these give them a path to docs/articles/legal
// (all on the marketing host, so they open in a new tab). Shown on every dashboard page.
const APP_FOOTER_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/articles", label: "Articles" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'

  if (!user) {
    redirect(`${MARKETING_URL}/login`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended, onboarding_completed, welcome_reward_claimed")
    .eq("id", user.id)
    .single()

  if (profile?.suspended) {
    redirect(`${MARKETING_URL}/suspended`)
  }

  // Onboarding (username + role + the 50 welcome credits) is granted by completeOnboarding, reached only
  // via "Start transcribing →". A user who left /onboarding ANY other way — the navbar "Go to app", a
  // direct /dashboard URL, or browser-back — skipped it and sat with no role + 0 credits (taibarashid14,
  // 2026-09-04). This is the single chokepoint every dashboard route renders through, so gate here: an
  // incomplete profile is bounced back to /onboarding to finish (which sets the role and grants the
  // reward). That converges every onboarding exit on a complete account. Absolute marketing URL —
  // subdomain-split server redirects must not be relative (LESSONS 2026-05-17). Verified 2026-09-11: no
  // legacy user has onboarding_completed=false while set up, so this bounces only genuinely-incomplete
  // profiles, never disrupts existing users.
  if (profile && !profile.onboarding_completed) {
    redirect(`${MARKETING_URL}/onboarding`)
  }

  // Safety net for the completed-but-unclaimed edge: the reward grant inside completeOnboarding is
  // best-effort (non-blocking), so onboarding_completed can be true while the reward never landed. Claim
  // it here. Financial-critical → always via the claim_welcome_reward RPC (idempotent: welcome_reward_
  // claimed flag under FOR UPDATE + advisory lock + canonical-email dedup), never a direct INSERT/UPDATE
  // on user_credits/profiles. Best-effort: a failed grant must never block the dashboard.
  if (profile && !profile.welcome_reward_claimed) {
    const { data: grant, error: grantErr } = await supabase.rpc("claim_welcome_reward", { p_user_id: user.id })
    if (grantErr) {
      console.error("[dashboard] welcome reward claim on entry failed (non-blocking):", grantErr.message)
    } else {
      console.log(`[dashboard] welcome reward enforced on dashboard entry for ${user.id}:`, JSON.stringify(grant))
    }
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-svh w-full">
        <AppTopbar />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar is desktop-only — on mobile navigation is the bottom tab bar */}
          <div className="hidden md:flex shrink-0">
            <AppSidebar />
          </div>
          <main id="main-content" className="flex-1 overflow-y-auto">
            {/* Clear the fixed MobileTabBar on < md (its height + iOS inset, tokenised in tokens.css)
                so the footer links never hide behind it. md:pb-8 restores desktop spacing. */}
            <div className="relative min-h-full p-4 md:p-8 bg-bg pb-[calc(var(--tabbar-h)+var(--safe-bottom)+1rem)] md:pb-8">
              {/* No blanket honeycomb wash here — the pattern is per-page opt-in via
                  DashboardBackdrop (ADR-079). system.md §5 only allows it on empty states /
                  marketing / auth / 404 / footer, not on working dashboard pages. Library keeps
                  it as a documented exception (LESSONS 2026-07-03). */}
              <div className="relative">
                {children}
                <footer className="mt-12 pt-6 border-t border-border/60 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                  {APP_FOOTER_LINKS.map((l) => (
                    <a
                      key={l.href}
                      href={marketingHref(l.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-fg transition-colors"
                    >
                      {l.label}
                    </a>
                  ))}
                </footer>
              </div>
            </div>
          </main>
        </div>
        <MobileTabBar />
      </div>
    </SidebarProvider>
  )
}
