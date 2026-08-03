import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsTable } from "@/components/docs/DocsTable"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"
import { EXPORT_FORMAT_COUNT, EXPORT_DOWNLOAD_COUNT, EXPORT_MENU, spellCount } from "@indxr/shared/lib/exportFormats"

const formatCount = spellCount(EXPORT_FORMAT_COUNT)
const downloadCount = spellCount(EXPORT_DOWNLOAD_COUNT)
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const ragPer10Min = CREDIT_COSTS.RAG_JSON_PER_10MIN
const welcomeCredits = FREE_TIER.WELCOME_CREDITS

export const metadata: Metadata = {
  alternates: { canonical: "/docs/quickstart" },
  title: "Get your first transcript — INDXR.AI Docs",
  description: `Turn a YouTube video, a playlist, or an uploaded file into a transcript with INDXR — free YouTube captions, or AI transcription at ${perMin} credit per minute. See the cost before you confirm, then export.`,
  robots: { index: true, follow: true },
}

export default function GettingStartedPage() {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Get your first transcript",
    description: metadata.description,
    url: "https://indxr.ai/docs/quickstart",
    dateModified: "2026-08-02",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Open Transcribe",
        text: `Open Transcribe in the app sidebar. It has three tabs — Video, Playlist, and Audio — and Video is selected. New accounts get ${welcomeCredits} credits; YouTube captions cost nothing either way.`,
        url: "https://indxr.ai/docs/quickstart#1-open-transcribe",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Paste a link and pick a method",
        text: "Paste a public YouTube link, then choose a method. Under Transcription method, YouTube captions is on by default and marked free; AI transcription shows its rate and your balance.",
        url: "https://indxr.ai/docs/quickstart#2-paste-a-link-and-pick-a-method",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Captions come back right away",
        text: "With YouTube captions selected, click Extract and the transcript appears — nothing to approve, no credits spent. If YouTube refuses the request, a card offers Try again and a switch to AI transcription; no credits are charged.",
        url: "https://indxr.ai/docs/quickstart#3-captions-come-back-right-away",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "AI transcription shows the cost first",
        text: `Select AI transcription and click Extract, and a card shows the title, the length, the total, and what you hold and what is left. The rate is ${perMin} credit per minute of audio, rounded up. Cancel and you have spent nothing; once it starts it can't be cancelled, but a failed job returns the credits.`,
        url: "https://indxr.ai/docs/quickstart#4-ai-transcription-shows-the-cost-first",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "It runs in the background",
        text: "AI transcription runs in the background. You can close the tab — the finished transcript lands in your Library regardless.",
        url: "https://indxr.ai/docs/quickstart#5-it-runs-in-the-background",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Read it and export it",
        text: `The result card shows the length, the line count, and — for AI — the credits and how long it took. Reader Mode hides the timestamps. Copy gives you the text; Export gives you a file in one of ${formatCount} formats. Every format is free except RAG JSON, at ${ragPer10Min} credit per 10 minutes.`,
        url: "https://indxr.ai/docs/quickstart#6-read-it-and-export-it",
      },
      {
        "@type": "HowToStep",
        position: 7,
        name: "It stays in your library — fix it once",
        text: "The transcript stays in your Library, where you can edit it; INDXR keeps the original beside your edited version. Correct a misheard name once and every export you make afterwards carries the fix.",
        url: "https://indxr.ai/docs/quickstart#7-it-stays-in-your-library-fix-it-once",
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
          INDXR takes a YouTube link, a playlist, or an audio or video file you upload, and gives you
          back a transcript you can export — as plain text, Markdown, subtitles, or structured data.
          There are two ways to make it. <strong>YouTube captions</strong> copies the subtitle track a
          video already has: free, instant, and only for YouTube videos and playlists.{" "}
          <strong>AI transcription</strong> listens to the audio and writes it out with punctuation and
          full sentences: {perMin} credit per minute, and it works on anything, including uploads.
        </DefinitionLeadOpening>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Use AI when the wording matters — anything you publish, quote, edit, or feed to a model.
          Captions are free and good enough for the rest.
        </p>

        <AnchorHeading as="h2">1. Open Transcribe</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Open{" "}
          <a href="https://app.indxr.ai/dashboard/transcribe" className="text-[var(--accent)] hover:underline">Transcribe</a>{" "}
          in the app sidebar. It has three tabs — <strong>Video</strong>, <strong>Playlist</strong>, and{" "}
          <strong>Audio</strong> — and <strong>Video</strong> is selected. New accounts get{" "}
          {welcomeCredits} credits, enough for a {welcomeCredits / perMin}-minute AI transcription;
          YouTube captions cost nothing either way.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You can also extract captions without an account on the{" "}
          <a href="https://indxr.ai/transcribe" className="text-[var(--accent)] hover:underline">free tool</a>{" "}
          at indxr.ai/transcribe, but that route gives you plain text only and saves nothing to a library.
        </p>

        <AnchorHeading as="h2">2. Paste a link and pick a method</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Paste a public YouTube link into the field, then pick how the transcript is made. Under{" "}
          <strong>Transcription method</strong>, <strong>YouTube captions</strong> is selected by
          default and marked <strong>Free</strong>; <strong>AI transcription</strong> shows its rate
          ({perMin} credit per minute) and how many credits you have.
        </p>
        <DocsFigure
          src="/docs/screenshots/method-choice.png"
          alt="The Transcription method chooser: two cards, YouTube captions (marked Free) selected, and AI transcription showing 1 credit per minute and the available balance."
          caption="Pick the method before you extract. Captions are free; AI shows the rate up front."
        />

        <AnchorHeading as="h2">3. Captions come back right away</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          With <strong>YouTube captions</strong> selected, click <strong>Extract</strong> and the
          transcript appears — there is nothing to approve and no credits are spent.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          If YouTube refuses the request, you get a card with <strong>Try again</strong> (each retry
          goes out over a different connection) and the option to switch to AI transcription; no
          credits are charged. The{" "}
          <a href="/docs/guides/single-video" className="text-[var(--accent)] hover:underline">single-video guide</a>{" "}
          covers the rest — no captions, private videos, the wrong language.
        </p>

        <AnchorHeading as="h2">4. AI transcription shows the cost first</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Select <strong>AI transcription</strong> and click <strong>Extract</strong>, and a card shows
          the cost before anything is charged: the title, the length, the total, and what you hold and
          what is left afterwards. The rate is {perMin} credit per minute of audio, rounded up — the
          card below is one 55-minute lecture, so 55 credits.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          <strong>Cancel</strong> and you have spent nothing. Once it starts it can&apos;t be cancelled,
          but if the job fails the credits come back.
        </p>
        <DocsFigure
          src="/docs/screenshots/cost-card-ai.png"
          alt="The AI transcription cost card for a 55-minute video: title, duration, a Total of 55 credits, a balance line, and an Extract — 55 credits button beside Cancel."
          caption="The price is on the button. Nothing is charged until you click it; Cancel costs nothing."
        />

        <AnchorHeading as="h2">5. It runs in the background</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          AI transcription runs in the background — you can close the tab and the finished transcript
          lands in your <strong>Library</strong> regardless. The card shows each stage as it goes.
        </p>
        <DocsFigure
          src="/docs/screenshots/progress-downloading.png"
          alt="The progress card while an AI transcription runs, showing the Downloading audio stage with a progress bar and an elapsed timer."
          caption="Downloading, then transcribing, then saving — you don't have to wait on the page."
        />

        <AnchorHeading as="h2">6. Read it and export it</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          The result card shows the length and the line count — and for AI transcription, the credits it
          cost and how long it took. Each line carries a timestamp; the <strong>Reader Mode</strong>{" "}
          switch hides them so you can read straight through. If you took the free captions and they read
          poorly, a <strong>Re-extract with AI</strong> line sits below the transcript with the exact
          cost for that video.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          <strong>Copy</strong> gives you the full text; <strong>Export</strong> gives you a file. The
          menu groups the formats as <strong>Text</strong> (TXT and Markdown, each with or without
          timestamps), <strong>Subtitles</strong> (SRT and VTT), <strong>Data</strong> (CSV and JSON),
          and <strong>Developer</strong> (RAG JSON) — {formatCount} formats, {downloadCount} downloads. Everything is free
          except RAG JSON, at {ragPer10Min} credit per 10 minutes of transcript, and re-downloading
          something you already exported is always free. What each file contains is on{" "}
          <a href="/docs/reference/export-formats" className="text-[var(--accent)] hover:underline">Export formats</a>.
        </p>
        {/* Rendered from the export descriptor (EXPORT_MENU) — the same array that builds the real
            Export menu — so the {downloadCount} downloads and the one paid format can never drift from
            the app. (Replaces the old menu screenshot, which was a tall narrow panel that dwarfed the
            other figures.) */}
        <DocsTable>
          <thead>
            <tr>
              <th>Group</th>
              <th>Download</th>
              <th>Contents</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {EXPORT_MENU.map((item) => (
              <tr key={item.id}>
                <td>{item.group}</td>
                <td className="whitespace-nowrap font-medium text-[var(--fg)]">{item.label}</td>
                <td>{item.sub}</td>
                <td className="whitespace-nowrap">
                  {item.paid ? `${ragPer10Min} credit / 10 min` : "Free"}
                </td>
              </tr>
            ))}
          </tbody>
        </DocsTable>

        <AnchorHeading as="h2">7. It stays in your library</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Every transcript is saved to your <strong>Library</strong> — a searchable archive of everything
          you have made. Search by title, filter by how it was made, and open any one again to re-read,
          re-export in another format, or edit. Nothing is one-shot: a transcript you made last month is
          one search away.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          When you edit, INDXR keeps the original alongside your edited version, so you never lose what
          came out of the video. Fixing it early is worth the minute: correct a misheard name once, and
          every export you make afterwards carries the correction — the subtitles, the Markdown, the RAG
          chunks.
        </p>
        <DocsFigure
          src="/docs/screenshots/library-list.png"
          alt="The Library list showing several saved transcripts, each row with its title, a source-method badge (YouTube captions or AI transcription), duration, word count and date."
          caption="Your Library: every transcript you make, searchable and re-openable — tagged with how it was made."
        />

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
