import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const ragPer10Min = CREDIT_COSTS.RAG_JSON_PER_10MIN
const welcomeCredits = FREE_TIER.WELCOME_CREDITS

export const metadata: Metadata = {
  alternates: { canonical: "/docs/quickstart" },
  title: "Get your first transcript — INDXR.AI Docs",
  description: `Turn a YouTube video into text with INDXR — AI transcription at ${perMin} credit per minute, or free caption extraction. See the cost before you confirm, then export or re-extract.`,
  robots: { index: true, follow: true },
}

export default function GettingStartedPage() {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Get your first transcript",
    description: metadata.description,
    url: "https://indxr.ai/docs/quickstart",
    dateModified: "2026-07-23",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Open Transcribe",
        text: `Sign in and open the Transcribe tab in the sidebar. The Single Video tab is selected by default, with Playlist and Audio Upload next to it. New accounts get ${welcomeCredits} credits, enough to transcribe a ${welcomeCredits / perMin}-minute video. You can also extract captions without an account on the INDXR homepage, but that route gives you plain text only and saves nothing.`,
        url: "https://indxr.ai/docs/quickstart#1-open-transcribe",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Paste a URL and choose how it's made",
        text: "Paste any public YouTube video URL into the field. For the free captions, click Extract. For AI transcription, switch on Generate with AI first: the Extract button becomes Check, so you approve the cost before anything is charged.",
        url: "https://indxr.ai/docs/quickstart#2-paste-a-url-and-choose-how-it-s-made",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Check the cost, then confirm",
        text: `Clicking Check looks up the video's length and shows what the transcription will cost, how many credits you hold, and roughly how long it will take. AI transcription costs ${perMin} credit per minute of audio, rounded up. Nothing is charged until you click Confirm & Extract — cancel here and you have spent nothing. If a job fails after you confirm, the credits are returned.`,
        url: "https://indxr.ai/docs/quickstart#3-check-the-cost-then-confirm",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Read what came back",
        text: "The transcript appears under Transcript Results with the video's duration and line count. Each line carries a timestamp; the Reader Mode switch hides them when you want to read straight through. If you took the free captions and they read poorly, Re-extract with AI sits above the transcript with the exact cost for that video.",
        url: "https://indxr.ai/docs/quickstart#4-read-what-came-back",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Export it",
        text: `Click Copy for the full text, or Export for a file. INDXR gives you seven formats: TXT and Markdown, each with or without timestamps, SRT and VTT for subtitles, CSV and JSON for data, and RAG JSON for AI retrieval. Every format is free except RAG JSON, which costs ${ragPer10Min} credit per 10 minutes of transcript.`,
        url: "https://indxr.ai/docs/quickstart#5-export-it",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Find it again, and fix it once",
        text: "The transcript stays in your Library, where you can edit it. INDXR keeps the original alongside your edited version, so you never lose what came out of the video. Correct a misheard name in the transcript and every export you make afterwards carries the correction.",
        url: "https://indxr.ai/docs/quickstart#6-find-it-again-and-fix-it-once",
      },
    ],
  }

  return (
    <>
      <JsonLd schemas={[howToSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Getting started", href: "/docs" },
            { label: "Quickstart" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Get your first transcript</h1>
        <DefinitionLeadOpening>
          INDXR turns a YouTube video into text in one of two ways. AI transcription reads the audio
          and writes it out with punctuation and sentences, at {perMin} credit per minute. Caption
          extraction copies the subtitle track the video already carries, for free.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Transcribe the audio when the quality of the text matters — anything you publish, quote,
          edit, or feed to an AI. Captions are free and fine for everything else.
        </p>

        <AnchorHeading as="h2">1. Open Transcribe</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Sign in and open{" "}
          <a href="https://app.indxr.ai/transcribe" className="text-[var(--accent)] hover:underline">Transcribe</a>{" "}
          in the sidebar. The <strong>Single Video</strong> tab is selected by default, with{" "}
          <strong>Playlist</strong> and <strong>Audio Upload</strong> next to it. New accounts get{" "}
          {welcomeCredits} credits, enough to transcribe a {welcomeCredits / perMin}-minute video.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You can also extract captions without an account on the INDXR homepage, but that route gives
          you plain text only and saves nothing.
        </p>

        <AnchorHeading as="h2">2. Paste a URL and choose how it&apos;s made</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Paste any public YouTube video URL into the field.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          For the free captions, click <strong>Extract</strong>. That is the whole step — skip to
          step 4. For AI transcription, switch on <strong>Generate with AI</strong> first: the{" "}
          <strong>Extract</strong> button becomes <strong>Check</strong>, so you approve the cost
          before anything is charged.
        </p>

        <AnchorHeading as="h2">3. Check the cost, then confirm</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Clicking <strong>Check</strong> looks up the video&apos;s length and shows what the
          transcription will cost, how many credits you hold, and roughly how long it will take. AI
          transcription costs {perMin} credit per minute of audio, rounded up. Nothing is charged
          until you click <strong>Confirm &amp; Extract</strong> — cancel here and you have spent
          nothing. If a job fails after you confirm, the credits are returned.
        </p>
        <DocsFigure
          alt="The Check result for a 22-minute video, showing a cost of 22 credits against a balance of 139, with Confirm & Extract and Cancel buttons."
          caption="The price appears before the charge. Cancel costs nothing."
        />

        <AnchorHeading as="h2">4. Read what came back</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The transcript appears under <strong>Transcript Results</strong> with the video&apos;s
          duration and line count. Each line carries a timestamp; the <strong>Reader Mode</strong>{" "}
          switch hides them when you want to read straight through.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          If you took the free captions and they read poorly, <strong>Re-extract with AI</strong> sits
          above the transcript with the exact cost for that video.
        </p>

        <AnchorHeading as="h2">5. Export it</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Click <strong>Copy</strong> for the full text, or <strong>Export</strong> for a file. INDXR
          gives you seven formats: TXT and Markdown, each with or without timestamps, SRT and VTT for
          subtitles, CSV and JSON for data, and RAG JSON for AI retrieval.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Every format is free except RAG JSON, which costs {ragPer10Min} credit per 10 minutes of
          transcript. Re-downloading an export you already generated is free. What each file contains
          is on{" "}
          <a href="/docs/reference/export-formats" className="text-[var(--accent)] hover:underline">Export formats</a>.
        </p>
        <DocsFigure
          alt="The Export menu open over a finished transcript, listing TXT, Markdown, SRT, VTT, CSV, JSON and RAG JSON in four groups."
          caption="One transcript, nine downloads, exported as often as you like."
        />

        <AnchorHeading as="h2">6. Find it again, and fix it once</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The transcript stays in your <strong>Library</strong>, where you can edit it. INDXR keeps
          the original alongside your edited version, so you never lose what came out of the video.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Editing early is worth the minute. Correct a misheard name in the transcript and every
          export you make afterwards carries the correction — the subtitles, the Markdown, the RAG
          chunks.
        </p>

        <RelatedTopicsList
          title="Next"
          topics={[
            {
              label: "Single video",
              href: "/docs/guides/single-video",
              description:
                "the same flow with everything that can go wrong: no captions, private video, wrong language",
            },
            {
              label: "Playlists",
              href: "/docs/guides/playlists",
              description:
                "a per-video choice across a whole playlist, running in the background after you close the tab",
            },
            {
              label: "Uploads",
              href: "/docs/guides/uploads",
              description: `no caption track to fall back on, so uploaded files are always transcribed at ${perMin} credit per minute`,
            },
          ]}
        />
      </DocsShell>
    </>
  )
}
