import type { Metadata } from "next"
import { Footer } from "@indxr/shared/components/Footer"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { TutorialOpening } from "@/components/docs/TutorialOpening"
import { PrerequisitesBlock } from "@/components/docs/PrerequisitesBlock"
import { TutorialStep } from "@/components/docs/TutorialStep"
import { WhatJustHappened } from "@/components/docs/WhatJustHappened"
import { NextStepsBlock } from "@/components/docs/NextStepsBlock"
import { JsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Quickstart — INDXR.AI Docs",
  description: "Get your first YouTube transcript in under 3 minutes. No account required for single videos.",
  robots: { index: true, follow: true },
}

export default function GettingStartedPage() {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Get your first YouTube transcript",
    description: "Extract a YouTube transcript using INDXR in under 3 minutes.",
    totalTime: "PT3M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Go to the transcript tool",
        text: "Open indxr.ai/transcribe in your browser. No account required for single video extraction.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Paste a YouTube URL",
        text: "Copy any YouTube video URL and paste it into the input field on the tool page.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Extract the transcript",
        text: "Click Extract. INDXR fetches the video captions — usually within 2–3 seconds.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Export or copy",
        text: "Copy the transcript to clipboard or download it as TXT. Sign up to unlock Markdown, CSV, SRT, VTT, and JSON formats.",
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
            { label: "Getting started" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Get your first transcript in 3 minutes</h1>
        <TutorialOpening timeEstimate="3 minutes">
          This guide walks you through extracting your first YouTube transcript using INDXR. By the end, you&apos;ll have a transcript you can copy or download — no account required for a single video with captions.
        </TutorialOpening>
        <PrerequisitesBlock
          items={[
            "A YouTube video URL (any public video with captions)",
            "A browser — no extension or app required",
          ]}
        />
        <TutorialStep
          step={1}
          heading="Go to the transcript tool"
          verification="You see the INDXR tool with a URL input field and three tabs: Single Video, Playlist, and Audio Upload."
        >
          <p>Open <a href="/transcribe" className="text-[var(--accent)] underline underline-offset-4">/transcribe</a> in your browser. The Single Video tab is selected by default — that&apos;s what you need.</p>
        </TutorialStep>
        <TutorialStep
          step={2}
          heading="Paste your YouTube URL"
          verification="The URL appears in the input field. The Extract button becomes active."
        >
          <p>Copy any public YouTube video URL (from the browser address bar or the share button) and paste it into the input field.</p>
        </TutorialStep>
        <TutorialStep
          step={3}
          heading="Click Extract"
          verification="The transcript appears in the result area below the input. You'll see the full text, optionally with timestamps."
        >
          <p>Click the Extract button. INDXR fetches the video&apos;s captions — usually within 2–3 seconds for videos with existing YouTube captions.</p>
        </TutorialStep>
        <TutorialStep
          step={4}
          heading="Copy or download"
          verification="The transcript is in your clipboard or downloads as a .txt file."
        >
          <p>Click Copy to copy the full transcript to your clipboard, or Download to save it as a TXT file. Both are free and require no account.</p>
        </TutorialStep>
        <WhatJustHappened>
          INDXR fetched the video&apos;s auto-captions from YouTube using yt-dlp and returned them as clean text. If the video doesn&apos;t have captions, you&apos;d see a message offering AI transcription — that uses 1 credit per minute and requires an account.
        </WhatJustHappened>
        <NextStepsBlock
          steps={[
            { label: "Sign up for 25 free credits", href: "/signup", description: "Unlock playlists, AI transcription, all export formats, and your transcript library." },
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing", description: "Understand what uses credits and what's always free." },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats", description: "Markdown, CSV, SRT, VTT, JSON — when to use each." },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview", description: "A technical overview of the extraction pipeline." },
          ]}
        />
      </DocsShell>
      <Footer />
    </>
  )
}
