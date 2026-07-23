import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { appHref } from "@indxr/shared/lib/cross-host-links"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

// Volatile numbers render from pricing.ts (single source of truth), never hardcoded.
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const summaryCost = CREDIT_COSTS.AI_SUMMARY
const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN
const perVideo = CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS
const freeVideos = FREE_TIER.PLAYLIST_FREE_VIDEOS

const description =
  "Credits are how you pay for AI work in INDXR. Reading a video's existing captions is always free; AI transcription and AI summaries use credits. One credit is one minute of AI transcription, credits never expire, and anything an AI job doesn't use comes back to your balance."

export const metadata: Metadata = {
  alternates: { canonical: "/docs/account/credits" },
  title: "Credits — INDXR.AI Docs",
  description,
  robots: { index: true, follow: true },
}

export default function DocsCreditsPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Credits",
    description,
    url: "https://indxr.ai/docs/account/credits",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Account", href: "/docs" },
            { label: "Credits" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Credits</h1>
        <DefinitionLeadOpening>
          Credits are how you pay for AI work in INDXR. Reading a video&apos;s existing captions is
          always free; the things that cost credits are AI transcription and AI summaries. One credit is
          one minute of AI transcription, credits never expire, and anything a job doesn&apos;t use comes
          back to your balance.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">What costs credits</AnchorHeading>
        <ul className="space-y-2 text-[var(--fg-subtle)] leading-relaxed">
          <li><strong className="text-[var(--fg)]">Caption extraction — free.</strong> Reading a video&apos;s existing captions never costs credits, with or without an account.</li>
          <li><strong className="text-[var(--fg)]">AI transcription — {perMin} credit per minute.</strong> Rounded up to the next minute, minimum {perMin}. A 12-minute video costs 12 credits.</li>
          <li><strong className="text-[var(--fg)]">AI summary — {summaryCost} credits.</strong> A flat {summaryCost} credits per summary, whatever the transcript&apos;s length.</li>
          <li><strong className="text-[var(--fg)]">RAG JSON export — {ragPer10} credit per 10 minutes.</strong> RAG JSON is the transcript split into bite-size chunks formatted for feeding into an AI search or chatbot; only this chunked export costs credits, while the plain JSON download is free. After a transcript&apos;s first RAG export, re-downloading its other chunk presets is free.</li>
          <li><strong className="text-[var(--fg)]">Playlists — first {freeVideos} caption videos free.</strong> After that, each caption video costs {perVideo} credit. A video you switch to AI transcription is billed per minute instead, with no free-video discount.</li>
        </ul>
        <p className="text-[var(--fg-muted)] text-sm mt-3">
          Every other export — TXT, Markdown, CSV, SRT, VTT and plain JSON — is a free download.
        </p>

        <AnchorHeading as="h2">Reserved up front, the rest comes back</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          When you start an AI transcription or a playlist, INDXR reserves the estimated cost up front —
          so your balance drops by the estimate right away. As the work finishes, only what it actually
          used is settled, and when the job ends the unused remainder is returned automatically. You pay
          for what happened, not for the estimate.
        </p>
        <DocsCallout variant="costs-credits">
          Because the estimate is reserved first, your balance can dip below the final cost mid-job and
          then recover when the unused part is refunded. That is normal — the number you were shown is
          the most you can be charged, never more.
        </DocsCallout>

        <AnchorHeading as="h2">Failed AI work is refunded automatically</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          If an AI transcription or summary fails, the credits held for it are returned to your balance
          automatically — you are never charged for work that didn&apos;t produce a transcript. You&apos;ll
          see a &quot;Refund&quot; line in your transaction history on the{" "}
          <a href={appHref("/dashboard/account")} className="text-[var(--accent)] hover:underline">Account page</a>.
        </p>

        <AnchorHeading as="h2">Credits never expire</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Purchased credits stay in your account until you use them — there is no monthly reset and no
          subscription. Refunds on a purchase itself (as opposed to the automatic refund of failed AI
          work above) are covered in the{" "}
          <a href="/terms" className="text-[var(--accent)] hover:underline">Terms</a>.
        </p>

        <SourcesBlock
          sources={[
            {
              publisher: "INDXR (own code)",
              supports: "credit costs (caption 0, AI 1/min, summary 3, RAG 1/10min, playlist first-3-free then 1/video), the reserve/settle/refund model, and auto-refund on failed AI work",
              verifiedAgainst: "packages/shared/src/lib/pricing.ts (CREDIT_COSTS, FREE_TIER); backend/credit_manager.py:71,84,242-331",
            },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "Billing and invoices", href: "/docs/account/billing" },
            { label: "Pricing", href: "/pricing" },
            { label: "How INDXR works", href: "/docs/how-indxr-works" },
          ]}
        />
      </DocsShell>
    </>
  )
}
