import type { Metadata } from "next"

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
          Last updated: 2026-07-20
        </p>

        <div className="prose-content text-[var(--fg-subtle)] leading-relaxed space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">1. Who we are</h2>
            <p>
              INDXR.AI is operated by Tiny Web Ventures, a sole proprietorship registered in
              the Netherlands (KvK 98828762). You can reach us at{" "}
              <a href="mailto:support@indxr.ai" className="text-[var(--accent)] hover:underline">
                support@indxr.ai
              </a>. These terms govern your use of our website (indxr.ai) and app
              (app.indxr.ai) — together, the “Service.” By creating an account or using the
              Service, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">2. Who can use the Service</h2>
            <p>
              You must be 16 or older to use INDXR.AI. By using the Service, you confirm that
              you are 16 or older and that the information you give us is accurate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">3. Your account</h2>
            <p>
              You’re responsible for keeping your login details secure and for activity under
              your account. Please keep your email address current so we can reach you. One
              account per person — creating multiple accounts to obtain extra free credits
              isn’t allowed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">4. What the Service does</h2>
            <p>
              INDXR.AI extracts transcripts from YouTube videos, playlists, and audio files you
              provide, and offers optional features such as AI transcription, AI summaries, and
              export formats. Auto-caption extraction for single videos and the first videos of
              a playlist is free; AI transcription and certain features use credits (see below).
              We provide the Service with reasonable care and skill, but we can’t guarantee that
              every video can be processed, or that the Service will always be available or
              error-free. Your statutory rights as a consumer are not affected by this.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">5. The content you transcribe</h2>
            <p>
              You’re responsible for the videos and files you submit. You confirm that you have
              the right to transcribe them and that doing so doesn’t infringe anyone’s copyright
              or other rights. INDXR.AI doesn’t own or control the videos you transcribe —
              they’re public videos or files you provide — and we’re not responsible for their
              content. Don’t use the Service to process content unlawfully, to infringe
              intellectual property, or for any illegal purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">6. Credits, prices, and payment</h2>
            <p>
              Most AI features run on prepaid credits. Prices are shown in euros and include
              VAT. Your credits never expire. Payment is handled by Stripe; we never see or
              store your card details. New accounts receive welcome credits, and some features —
              such as single-video caption extraction — are always free. Credits have no cash
              value except as set out in the Refunds section, and can’t be transferred or sold.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">7. Refunds and your right of withdrawal</h2>
            <p>
              As a consumer, you have a 14-day right of withdrawal on a purchase. Because
              credits let you start using the Service immediately, the following applies:
            </p>
            <ul>
              <li>
                If you haven’t used any of the credits in a purchase, you can request a full
                refund within 14 days.
              </li>
              <li>
                Once you use any credit from a purchase — by generating a transcript — that
                purchase becomes non-refundable: by using the Service you ask us to begin
                immediately, and you accept that the right of withdrawal no longer applies to
                that purchase.
              </li>
              <li>
                If a transcription fails on our side, we automatically return the credits it
                cost, so you’re never charged for a job we couldn’t complete.
              </li>
              <li>
                We don’t issue cash refunds after 14 days, but because your credits never
                expire, their value stays yours.
              </li>
            </ul>
            <p>Refunds are returned to your original payment method.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">8. Acceptable use</h2>
            <p>
              Don’t misuse the Service. In particular, don’t: break the law or infringe others’
              rights; try to gain unauthorised access to, disrupt, or overload the Service;
              scrape, resell, or redistribute the Service itself; abuse free credits through
              multiple accounts; or process content you have no right to. We may suspend or
              limit accounts that breach these rules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">9. Your transcripts and our platform</h2>
            <p>
              The transcripts you create are yours. We don’t claim ownership of your content,
              and we don’t use the content of your transcripts to train models (see our Privacy
              Policy). The Service itself — our software, design, and brand — belongs to Tiny
              Web Ventures, and these terms don’t give you any rights to it beyond using the
              Service as intended.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">10. Availability and changes</h2>
            <p>
              We may update, add, or remove features, and occasionally take the Service down for
              maintenance. We aim to give reasonable notice of significant changes. If we make a
              material change to these terms, we’ll let you know by email or in the app. If you
              don’t agree with the change, you’re free to stop using the Service — your credits
              never expire, so their value stays yours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">11. Our liability</h2>
            <p>
              We are fully liable for damage caused by our intent or gross negligence, and for
              anything Dutch law does not permit us to exclude or limit. For any other damage,
              our liability is limited to the amount you paid us for the Service in the 12 months
              before the event that caused it, and we are not liable for indirect or
              consequential loss, such as lost profits or lost data beyond what we could
              reasonably foresee. Nothing in these terms limits your mandatory rights as a
              consumer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">12. Suspension and closing your account</h2>
            <p>
              You can delete your account at any time from your settings. We may suspend or
              close your account if you seriously or repeatedly breach these terms, or where the
              law requires it. If we close the Service or your account for a reason not
              attributable to you, we’ll refund your unused credits. If we close your account
              because of a serious breach by you, unused credits may be forfeited.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">13. Governing law and disputes</h2>
            <p>
              Dutch law applies to these terms. If you’re a consumer, you also keep the
              mandatory protections of the country you live in, and you can bring a dispute
              before the competent court there or in the Netherlands. If you have a complaint,
              please email us first at{" "}
              <a href="mailto:support@indxr.ai" className="text-[var(--accent)] hover:underline">
                support@indxr.ai
              </a>{" "}
              — we’ll do our best to resolve it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-3">14. Contact</h2>
            <p>
              Tiny Web Ventures (INDXR.AI), Oranjeplein 9, 3331XM Zwijndrecht, the Netherlands.
              Email:{" "}
              <a href="mailto:support@indxr.ai" className="text-[var(--accent)] hover:underline">
                support@indxr.ai
              </a>.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
