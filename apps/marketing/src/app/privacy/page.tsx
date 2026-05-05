import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"

export const metadata: Metadata = {
  title: "Privacy Policy — INDXR.AI",
  description: "INDXR.AI privacy policy. What data we collect, how we use it, your rights under GDPR, and how to contact us.",
}

export default function PrivacyPage() {
  return (
    <>
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--fg)] mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-[var(--fg-muted)] mb-10">
          {/* [KHIDR: vul datum in] */}
          Last updated: —
        </p>

        <div className="prose-content text-[var(--fg-subtle)] leading-relaxed space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">1. What data we collect</h2>
            <p>{/* [KHIDR: vul aan — email, username, transcripts, credit transactions, session data] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">2. How we use your data</h2>
            <p>{/* [KHIDR: vul aan — account management, billing, product analytics via PostHog] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">3. Third parties</h2>
            <p>{/* [KHIDR: vul aan — Supabase, Stripe, AssemblyAI, PostHog, Sentry, Upstash Redis, Cloudflare R2] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">4. Data retention</h2>
            <p>{/* [KHIDR: vul aan — hoe lang bewaren we transcripts, account data, credit history] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">5. Your rights (GDPR)</h2>
            <p>{/* [KHIDR: vul aan — inzage, correctie, verwijdering, overdracht, bezwaar] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">6. Cookies</h2>
            <p>{/* [KHIDR: vul aan — sessie-cookies, analytics opt-out, PostHog] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">7. Contact</h2>
            <p>
              {/* [KHIDR: vul aan — e-mailadres voor privacy-verzoeken, DPA-contact] */}
              Questions? <a href="/contact" className="text-[var(--accent)] hover:underline">Contact us</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
