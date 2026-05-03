import type { Metadata } from "next"
import { Footer } from "@/components/Footer"

export const metadata: Metadata = {
  title: "Terms of Service — INDXR.AI",
  description: "INDXR.AI terms of service. Acceptable use, refund policy, and your rights as a user.",
}

export default function TermsPage() {
  return (
    <>
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--fg)] mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-[var(--fg-muted)] mb-10">
          {/* [KHIDR: vul datum in] */}
          Last updated: —
        </p>

        <div className="prose-content text-[var(--fg-subtle)] leading-relaxed space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">1. Acceptable use</h2>
            <p>{/* [KHIDR: vul aan — wat mag/niet mag, geen scraping, geen resale van transcripts, etc.] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">2. Credits and billing</h2>
            <p>{/* [KHIDR: vul aan — credits verlopen niet, eenmalige aankoop, geen abonnement, geen refund op verbruikte credits] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">3. Refund policy</h2>
            <p>{/* [KHIDR: vul aan — EU consumer rights, 14-daagse bedenktijd voor digitale diensten, waiver bij directe toegang] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">4. Cancellation</h2>
            <p>{/* [KHIDR: vul aan — account sluiten, wat gebeurt er met je data, credits] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">5. Liability</h2>
            <p>{/* [KHIDR: vul aan — disclaimer, geen garantie op 100% nauwkeurigheid, fair use van YouTube content] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">6. Governing law</h2>
            <p>{/* [KHIDR: vul aan — Belgium/NL jurisdictie, toepasselijk recht] */}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">7. Contact</h2>
            <p>
              Questions? <a href="/contact" className="text-[var(--accent)] hover:underline">Contact us</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
