import type { Metadata } from "next"
import Link from "next/link"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { HowItWorksFlow } from "@/components/docs/HowItWorksFlow"
import { JsonLd } from "@/components/seo/JsonLd"
import { EXPORT_FORMAT_COUNT, spellCount } from "@indxr/shared/lib/exportFormats"

const formatCount = spellCount(EXPORT_FORMAT_COUNT)

const description =
  "INDXR gets text out of a video in one of two ways: it copies the caption track the video already carries, or it sends the audio to a speech recognition model and writes the transcript from scratch. Which of the two you use decides the quality of everything you export afterwards."

export const metadata: Metadata = {
  alternates: { canonical: "/docs/how-indxr-works" },
  title: "How INDXR works — INDXR.AI Docs",
  description,
}

const P = "text-[var(--fg-subtle)] leading-relaxed mb-4"
const A = "text-[var(--accent)] hover:underline"

export default function DocsOverviewPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How INDXR works",
    description,
    url: "https://indxr.ai/docs/how-indxr-works",
    dateModified: "2026-07-23",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Getting started", href: "/docs" },
            { label: "How INDXR works" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">How INDXR works</h1>
        <DefinitionLeadOpening>
          INDXR gets text out of a video in one of two ways: it copies the caption track the video
          already carries, or it sends the audio to a speech recognition model and writes the
          transcript from scratch. Which of the two you use decides the quality of everything you
          export afterwards.
        </DefinitionLeadOpening>
        <p className={P}>
          Everything else in INDXR — <Link href="/docs/guides/playlists" className={A}>playlists</Link>,{" "}
          <Link href="/docs/guides/uploads" className={A}>uploads</Link>, the{" "}
          <Link href="/docs/guides/library" className={A}>library</Link>, the{" "}
          <Link href="/docs/reference/export-formats" className={A}>export formats</Link> — is built on
          that one distinction.
        </p>
        <HowItWorksFlow />

        <AnchorHeading as="h2">The caption track a video already has</AnchorHeading>
        <p className={P}>
          Nearly every YouTube video with speech carries a caption track: the text you see when you
          turn subtitles on. Most tracks are produced by YouTube&apos;s own speech recognition. A
          smaller number are written or corrected by the creator, because doing it by hand takes hours.
        </p>
        <p className={P}>
          INDXR reads that track directly and keeps its original timings, at no cost, on a video of any
          length. It anchors on the original-language track, so you get what was said rather than a
          translation.
        </p>
        <p className={P}>
          Automatic tracks are speech recognition, so they get words wrong — names, brands, technical
          terms — and they get more of them wrong when the audio is poor, when speakers talk over each
          other, when an accent is strong, or when the language isn&apos;t English. Creator-corrected
          tracks read cleanly. You cannot tell which kind a video carries before you extract it, and
          INDXR does not check in advance.
        </p>
        <p className={P}>
          Occasionally YouTube refuses the request outright and asks us to prove we&apos;re not a bot.
          It lands on a small share of caption requests — on the order of five percent — and it is
          about YouTube throttling us, not about your video. No credits are charged. Trying again sends
          the request over a different connection, which usually gets through; if it keeps failing, AI
          transcription reads the audio instead and is the reliable way in.
        </p>
        <DocsFigure
          src="/docs/screenshots/error-bot_detection.png"
          alt="The error card shown when YouTube rate-limits a caption request: it says each attempt goes out over a different connection, that no credits were used, and offers Try again."
          caption="When YouTube throttles a request: no credits spent, and Try again goes out over a fresh connection."
        />

        <AnchorHeading as="h2">Transcribing the audio instead</AnchorHeading>
        <p className={P}>
          AI transcription ignores the caption track and reads the audio itself, writing the transcript
          from scratch. It returns punctuation, capitalisation and complete sentences, and it handles
          the names, jargon and accented speech that automatic captions tend to mangle. It works on any
          video, including one that already has captions.
        </p>
        <p className={P}>
          INDXR runs transcription on AssemblyAI and selects the model that covers the detected language
          natively. The figures per language are published on{" "}
          <Link href="/docs/reference/accuracy" className={A}>Accuracy and languages</Link>.
        </p>
        <p className={P}>
          Transcription is the closest INDXR gets to what was actually said. It costs credits where
          caption extraction does not; the rates are on{" "}
          <Link href="/docs/account/credits" className={A}>Credits</Link>.
        </p>
        <DocsFigure
          src="/docs/screenshots/method-choice.png"
          alt="The Transcription method chooser: YouTube captions, marked Free, selected by default, next to AI transcription showing its per-minute rate and your available balance."
          caption="You pick between the two routes before extracting: captions are free, AI shows its rate up front."
        />

        <AnchorHeading as="h2">What happens between the video and the transcript</AnchorHeading>
        <p className={P}>
          The path is the same whichever way you start. INDXR takes a single video URL, a{" "}
          <Link href="/docs/guides/playlists" className={A}>playlist</Link> URL, or an audio or video
          file you <Link href="/docs/guides/uploads" className={A}>upload</Link>. It fetches what it
          needs — the caption track, or the audio — produces the transcript, and stores it in your{" "}
          <Link href="/docs/guides/library" className={A}>library</Link>.
        </p>
        <p className={P}>
          Nothing is checked before a job starts. In a{" "}
          <Link href="/docs/guides/playlists" className={A}>playlist</Link>, videos that turn out to
          have no captions, or that cannot be reached at all, are skipped while the job runs, and the
          credits held for them are returned. An uploaded file has no caption track to fall back on, so
          uploads are always transcribed.
        </p>
        <p className={P}>
          Audio is deleted as soon as the job ends, whether it succeeds or fails; INDXR keeps no
          recording of it. If a video has been transcribed before, INDXR serves the stored transcript
          instead of fetching and processing it again — the same text, sooner.
        </p>

        <AnchorHeading as="h2">Why the choice sticks</AnchorHeading>
        <p className={P}>
          Whichever route you take becomes the ceiling for every export that follows. Subtitles inherit
          the caption track&apos;s line breaks. Markdown notes inherit the missing punctuation. Chunks
          for a vector database split on sentence boundaries that were never marked. No export step puts
          back a word that was never heard correctly.
        </p>
        <p className={P}>
          There is one place to raise that ceiling after the fact, and that is the transcript itself.
          INDXR stores every transcript so you can edit it, and keeps the original alongside your edited
          version. Correct a misheard name once and every export you make afterwards carries the
          correction.
        </p>
        <p className={P}>
          The rule follows from that. When the text is going somewhere — something you publish, quote,
          edit, or hand to an AI — transcribe the audio. When you only need to know what was said, the
          free caption track is enough.
        </p>

        <AnchorHeading as="h2">Where the transcript goes from there</AnchorHeading>
        <p className={P}>
          Every transcript INDXR produces lands in your{" "}
          <Link href="/docs/guides/library" className={A}>library</Link>, stays editable, and can be
          exported as often as you like into any of the{" "}
          <Link href="/docs/reference/export-formats" className={A}>{formatCount} formats</Link>, from
          plain text to subtitles to a JSON file prepared for a vector database. Only the last of those
          costs credits.
        </p>
        <p className={P}>
          A transcript can also be{" "}
          <Link href="/docs/guides/summaries" className={A}>summarised</Link>, and the summary is stored
          and edited the same way.
        </p>

        <RelatedTopicsList
          topics={[
            {
              label: "Accuracy and languages",
              href: "/docs/reference/accuracy",
              description: "which model runs for your language and the published figures",
            },
            {
              label: "Export formats",
              href: "/docs/reference/export-formats",
              description: `what each of the ${formatCount} files actually contains`,
            },
            {
              label: "Credits",
              href: "/docs/account/credits",
              description: "what costs credits, how reservations work, and when they come back",
            },
          ]}
        />
      </DocsShell>
    </>
  )
}
