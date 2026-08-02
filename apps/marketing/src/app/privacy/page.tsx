import type { Metadata } from "next"

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
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
          Last updated: 2026-08-01
        </p>

        <div className="prose-content text-[var(--fg-subtle)] leading-relaxed space-y-8">
          <p>
            INDXR.AI is operated by Tiny Web Ventures (KvK 98828762), registered in
            the Netherlands. We are the data controller for your personal data. You can
            reach us at{" "}
            <a href="mailto:privacy@indxr.ai" className="text-[var(--accent)] hover:underline">
              privacy@indxr.ai
            </a>.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">What this policy covers</h2>
            <p>
              This policy explains what personal data we collect, why, how long we keep it,
              and your rights. It applies to our website (indxr.ai) and app (app.indxr.ai).
              It does not cover the content of the videos you transcribe — those are public
              videos or files you provide, and we don’t treat their content as data about you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">What we collect</h2>
            <p>
              When you create an account, we collect your email address and a securely hashed
              password — we never see your actual password. If you sign in with Google, we
              receive your email and basic profile information from Google.
            </p>
            <p className="mt-4">
              As you use the service, we record which videos, playlists, and files you
              transcribe, the transcripts saved in your library, your credit balance and
              transaction history, and which export formats you use.
            </p>
            <p className="mt-4">
              When you buy credits, payment is handled entirely by Stripe. We receive a
              confirmation and an invoice record — we never see or store your card details.
            </p>
            <p className="mt-4">
              We also measure how the service is used — which features are popular, where
              people run into trouble — to improve the product. We do this with cookieless,
              EU-hosted product analytics: no tracking cookies, no profile that follows you
              across sessions or sites, and we remove your IP address. We route it through our
              own domain so it stays reliable, we never sell it, and we honour your browser’s
              Do-Not-Track setting.
            </p>
            <p className="mt-4">
              A saved transcript can show the original video in an embedded player. Nothing from
              YouTube loads until you choose to open that player, and when it does it loads from
              YouTube’s privacy-enhanced (no-cookie) domain — it sets no cookie until you press
              play. If you never open the player, YouTube is never contacted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">What we never do with your transcripts</h2>
            <p>
              We never read, analyse, sell, or train models on the content of your transcripts.
              When we look at how the service is used, we look at patterns — which types of
              videos are transcribed, which formats are exported, where people get stuck —
              never at what your videos actually say. We have no reason to: we don’t build
              transcription models ourselves. The content of your transcripts is yours, and it
              stays that way.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">Why we process your data, and on what basis</h2>
            <p>
              We process your account and login data, your transcripts, and your payments in
              order to provide the service you signed up for — this is necessary to perform our
              contract with you. We keep payment records to meet our legal obligations under
              Dutch tax law. We use anonymised, aggregated analytics to understand and improve
              the product, which is our legitimate interest. If you opt in, we send you product
              updates by email, based on your consent, which you can withdraw at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">How long we keep your data</h2>
            <p>
              We keep your account and transcripts for as long as your account is active. You
              can delete individual transcripts at any time — they’re removed from your library
              immediately. You can delete your entire account, and everything that identifies
              you, from your account settings — this removes your account and all your personal
              data.
            </p>
            <p className="mt-4">
              Uploaded audio is never stored on our systems. It’s sent to our transcription
              provider only to create your transcript, then deleted — there is no lasting copy
              on our side.
            </p>
            <p className="mt-4">
              When you delete a transcript, we may keep a copy of the transcribed text or
              captions — linked to the video, not to you — so we don’t have to re-process the
              same public video for other users. This copy contains no personal data and can’t
              be traced back to you.
            </p>
            <p className="mt-4">
              We keep payment and invoice records for 7 years, as Dutch tax law requires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">Who we share data with</h2>
            <p>
              We rely on a small number of trusted providers to run the service, each bound to
              protect the data they handle. Payments are processed by Stripe. Our database and
              authentication run on Supabase, hosted in the EU. AI transcription and the
              optional AI summary are provided by AssemblyAI, which processes your audio and
              transcript on servers inside the EU, and does not use your audio to train its
              models. File storage is provided by Cloudflare. Error monitoring is provided by
              Sentry. We also use providers for proxying public video data, for sending email,
              and for our own product analytics. Some of these providers are based outside the
              EU; where that’s the case, the transfer is protected by the European Commission’s
              Standard Contractual Clauses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">Your rights</h2>
            <p>
              Under the GDPR you can access the personal data we hold about you, correct it,
              delete it, object to how we process it, and receive a copy in a portable format.
              You can delete your account and its data from your settings, or by emailing us. To
              request a copy of your data, email{" "}
              <a href="mailto:privacy@indxr.ai" className="text-[var(--accent)] hover:underline">
                privacy@indxr.ai
              </a>{" "}
              and we’ll provide it. You can withdraw marketing consent through the unsubscribe
              link in any marketing email. For any other request or complaint, email us — and
              you also have the right to lodge a complaint with the Dutch Data Protection
              Authority (Autoriteit Persoonsgegevens).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">Children</h2>
            <p>
              INDXR.AI is not intended for children under 16, and we don’t knowingly collect
              their data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">Changes to this policy</h2>
            <p>
              If we make significant changes, we’ll update the date above and let you know by
              email or in the app.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
