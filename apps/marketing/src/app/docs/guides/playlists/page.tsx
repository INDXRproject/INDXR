import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

const freeVideos = FREE_TIER.PLAYLIST_FREE_VIDEOS
const perVideo = CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

export const metadata: Metadata = {
  title: "Transcribe a playlist — INDXR.AI Docs",
  description:
    "Turn a whole YouTube playlist into transcripts in one job. Choose per video whether to use captions or AI, the first three auto-caption videos are free, credits are reserved up front and the unused part is returned, and the job keeps running after you close the tab. Up to 500 videos per job.",
  robots: { index: true, follow: true },
}

export default function DocsPlaylistsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Transcribe a playlist",
    description: metadata.description,
    url: "https://indxr.ai/docs/guides/playlists",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Guides", href: "/docs" },
            { label: "Playlists" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Playlists</h1>
        <DefinitionLeadOpening>
          A playlist job transcribes a whole YouTube playlist in one go. You paste the playlist link,
          pick which videos to include and how to transcribe each one, and INDXR works through them in
          the background. It&apos;s the way to handle a course, a channel&apos;s series, or any batch
          without pasting links one at a time.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Run a playlist job</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The flow is four steps, and you decide the cost before anything is charged.
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-[var(--fg-subtle)] leading-relaxed">
          <li>Paste the playlist URL. INDXR runs an availability check on every video and marks each one as <strong>has captions</strong>, <strong>needs AI</strong>, or <strong>unavailable</strong>.</li>
          <li>Choose per video: take the free captions, or switch that video to AI transcription. Unavailable videos are skipped.</li>
          <li>Review the credit estimate, then start. Credits are reserved up front for the whole job.</li>
          <li>Let it run. The job continues in the background — you can close the tab and the transcripts appear in your <a className="text-[var(--accent)] hover:underline" href="/docs/guides/library">library</a> as they finish.</li>
        </ol>

        <AnchorHeading as="h2">What a playlist costs</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The first {freeVideos} auto-caption videos in a playlist are free. From the fourth onward,
          each caption video costs {perVideo} credit. Any video you switch to AI transcription costs
          {" "}{perMin} credit per minute instead, with no per-video charge and no free discount.
        </p>
        <DocsCallout variant="costs-credits">
          Credits are <strong>reserved</strong> up front for the estimated total. As each video
          finishes, only what it actually used is settled — and when the job ends, the unused
          remainder is returned to your balance automatically.
        </DocsCallout>

        <AnchorHeading as="h2">One job holds up to 500 videos</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A single job processes up to 500 videos. A larger playlist has to be split into batches of
          500. INDXR also warns you before you start a job of 50 or more, so a big run is never a
          surprise. See <a className="text-[var(--accent)] hover:underline" href="/docs/reference/limits">Limits</a> for the full list.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "per-video availability check (has captions / needs AI / unavailable)", verifiedAgainst: "apps/app/src/app/api/check-playlist-availability/route.ts (route.ts:9,64-74)" },
            { publisher: "INDXR (own code)", supports: "first-3-free, per-video and per-minute cost, 500-video cap and ≥50 warning", verifiedAgainst: "backend/worker.py:431; backend/main.py:780,1340-1344; packages/shared/src/components/PlaylistManager.tsx:354,381; packages/shared/src/lib/pricing.ts" },
            { publisher: "INDXR (own code)", supports: "reserve up front, settle per video, refund the unused remainder; runs in background", verifiedAgainst: "backend/credit_manager.py:242-331 (reserve/settle/refund_credits); backend/main.py:1410-1442" },
          ]}
        />
        <RelatedTopicsList
          topics={[
            { label: "How INDXR works", href: "/docs/how-indxr-works" },
            { label: "Credits", href: "/docs/account/credits" },
            { label: "Article: Playlist transcripts", href: "/articles/youtube-playlist-transcript" },
          ]}
        />
      </DocsShell>
    </>
  )
}
