import type { Metadata } from "next"
import Link from "next/link"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

// Volatile numbers render from the single source of truth (pricing.ts), never hardcoded.
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const summaryCost = CREDIT_COSTS.AI_SUMMARY
const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN
const welcome = FREE_TIER.WELCOME_CREDITS
const freeVideos = FREE_TIER.PLAYLIST_FREE_VIDEOS

const description =
  "INDXR.AI turns YouTube videos, playlists, and audio or video files you upload into text you can use — plain text, Markdown, CSV, subtitles, JSON, or RAG JSON. You choose how the text is produced: extract a video's existing captions, or have the audio transcribed. Everything you extract is saved and stays editable."

export const metadata: Metadata = {
  title: "How INDXR Works — INDXR.AI Docs",
  description,
}

const P = "text-[var(--fg-subtle)] leading-relaxed mb-4"

export default function DocsOverviewPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How INDXR works",
    description,
    url: "https://indxr.ai/docs/how-indxr-works/overview",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "How INDXR works", href: "/docs/how-indxr-works/overview" },
            { label: "Overview" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">How INDXR works</h1>
        <DefinitionLeadOpening>
          INDXR.AI turns YouTube videos, playlists, and audio or video files you upload into text you
          can actually use — plain text, Markdown, CSV, subtitles, JSON, or RAG JSON for retrieval
          systems. You choose how the text is produced: extract the captions a video already has, or
          have the audio transcribed. Everything you extract is saved and stays editable.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">What happens when you use it</AnchorHeading>
        <p className={P}>
          <strong>A single video.</strong> Paste the URL and the transcript comes back — INDXR reads
          the video&apos;s existing captions, which costs nothing. If you want the audio transcribed
          instead, you switch that on before extracting.
        </p>
        <p className={P}>
          <strong>A playlist.</strong> INDXR loads the videos and shows you what each one offers: which
          have captions, which don&apos;t, and which can&apos;t be processed at all. You pick per video
          whether to take the captions or transcribe, and the first {freeVideos} caption extractions
          are free. The job then keeps running after you close the tab, and finished transcripts appear
          in your library as they complete.
        </p>
        <p className={P}>
          <strong>An uploaded file.</strong> There are no captions to fall back on, so the audio is
          transcribed.
        </p>
        <p className={P}>
          Either way the transcript lands in your library, where it stays and can be edited. From there
          you export it in whichever format you need, as often as you need.
        </p>
        <p className={P}>
          If the same video has already been processed, INDXR serves the saved result instead of
          re-processing the audio — you get the exact same transcript, just faster.
        </p>

        <AnchorHeading as="h2">Captions or transcription</AnchorHeading>
        <p className={P}>
          This is the only real decision you make, and it sets the quality of everything you export
          afterwards.
        </p>

        <AnchorHeading as="h3">Extracting existing captions</AnchorHeading>
        <p className={P}>
          Nearly every YouTube video with speech has a caption track — the text you see when you turn
          subtitles on. Most are generated automatically by YouTube&apos;s speech recognition. A
          smaller number are written or corrected by the creator, because doing it by hand takes hours
          and few bother.
        </p>
        <p className={P}>
          INDXR reads that track directly, keeps its original timings, and charges nothing for it.
        </p>
        <p className={P}>
          Two things come with that. The automatic ones are speech recognition, so they get words wrong
          — names, brands, technical terms, anything unexpected — and they get more of them wrong when
          the audio is poor, when people talk over each other, when the accent is strong, or when the
          language isn&apos;t English. And regardless of how accurate they are, captions are written to
          be read on screen: short display lines, no punctuation, no sentence structure. That format
          follows the text wherever you take it.
        </p>

        <AnchorHeading as="h3">Transcribing the audio</AnchorHeading>
        <p className={P}>
          Transcription ignores the caption track and reads the audio itself, writing the transcript
          from scratch. You get punctuation, capitalisation and real sentences, and it handles names,
          jargon and accented speech that automatic captions tend to mangle.
        </p>
        <p className={P}>
          It&apos;s still speech recognition, so it isn&apos;t flawless, and the same things that hurt
          captions — poor audio, overlapping speakers, a less widely spoken language — affect it too,
          just less.
        </p>
        <p className={P}>
          It runs on AssemblyAI, costs {perMin} credit per minute, and works on any video, including
          ones that already have captions. An hour of audio is usually done in a few minutes.
        </p>
        <p className={P}>
          See:{" "}
          <Link href="/docs/how-indxr-works/accuracy" className="text-[var(--accent)] hover:underline">
            Accuracy and languages
          </Link>
        </p>

        <AnchorHeading as="h3">Why the choice sticks</AnchorHeading>
        <p className={P}>
          Whatever you pick becomes the ceiling for every export that follows. Subtitles inherit the
          caption&apos;s line breaks. Markdown notes inherit the missing punctuation. RAG chunks split
          on sentence boundaries that were never marked. No export step puts back a word that was never
          heard correctly.
        </p>
        <p className={P}>
          So the rule is simple: when the quality of the text matters, transcribe. When it
          doesn&apos;t, the free captions are there.
        </p>

        <AnchorHeading as="h2">With and without an account</AnchorHeading>
        <p className={P}>
          Without signing in you can extract captions from single videos — as many as you like — and
          copy or download each one as plain text. That&apos;s the quick one-off: you need the text of
          a video, you take it, you&apos;re done. Nothing is saved.
        </p>
        <p className={P}>
          Anything more structural needs an account, which is free. It unlocks the other six export
          formats, transcription, playlists, file uploads, and the library that keeps everything you
          extract. New accounts get {welcome} credits — enough to try transcription, a playlist, or a
          RAG export before spending anything.
        </p>

        <AnchorHeading as="h2">What you get out</AnchorHeading>
        <p className={P}>Seven formats. Six of them free, however often you export them.</p>
        <ul className="space-y-3 mb-4 text-[var(--fg-subtle)] leading-relaxed">
          <li>
            <Link href="/docs/how-indxr-works/export-formats/txt" className="font-semibold text-[var(--accent)] hover:underline">Plain text</Link>
            {" "}— the transcript as continuous text, with or without timestamps. The only format
            available without an account.
          </li>
          <li>
            <Link href="/docs/how-indxr-works/export-formats/markdown" className="font-semibold text-[var(--accent)] hover:underline">Markdown</Link>
            {" "}— with or without timestamps, and with a frontmatter block carrying the video&apos;s
            title, URL, date and duration, so it drops straight into Obsidian, Notion or Logseq and
            stays linked to its source.
          </li>
          <li>
            <Link href="/docs/how-indxr-works/export-formats/csv" className="font-semibold text-[var(--accent)] hover:underline">CSV</Link>
            {" "}— one row per segment with start, end, duration and word count, for spreadsheets and
            text analysis.
          </li>
          <li>
            <Link href="/docs/how-indxr-works/export-formats/srt" className="font-semibold text-[var(--accent)] hover:underline">SRT</Link>
            {" "}and{" "}
            <Link href="/docs/how-indxr-works/export-formats/vtt" className="font-semibold text-[var(--accent)] hover:underline">VTT</Link>
            {" "}— subtitle files, re-cut to broadcast line lengths instead of dumped as raw caption
            blocks, so they load cleanly into editors and players.
          </li>
          <li>
            <Link href="/docs/how-indxr-works/export-formats/json" className="font-semibold text-[var(--accent)] hover:underline">JSON</Link>
            {" "}— the segments as they are, with a metadata wrapper. Take this when you want to handle
            the chunking and indexing yourself.
          </li>
          <li>
            <Link href="/docs/how-indxr-works/export-formats/json" className="font-semibold text-[var(--accent)] hover:underline">RAG JSON</Link>
            {" "}— the transcript already chunked and prepared for a vector database, so you can ask
            questions of your own material. This is the one format that costs credits: {ragPer10} per
            10 minutes of transcript. Downloading an export you&apos;ve already generated is free.
          </li>
        </ul>
        <p className={P}>
          See:{" "}
          <Link href="/docs/how-indxr-works/export-formats" className="text-[var(--accent)] hover:underline">
            Export formats
          </Link>
        </p>

        <AnchorHeading as="h2">Your library</AnchorHeading>
        <p className={P}>
          Transcripts aren&apos;t one-off downloads. Everything you extract is kept in your library, and
          the point of it is that you can keep it in order: group transcripts into collections, keep a
          playlist together as the set it came from, find things by searching, and delete what you no
          longer need.
        </p>
        <p className={P}>
          They also stay editable, and the original is never overwritten — your edited version is stored
          alongside it, so you keep both what came out of the video and what you made of it.
        </p>
        <p className={P}>
          That matters more than it sounds. Speech recognition gets names, brands and jargon wrong, and
          the place to fix that is once, in the transcript. Correct a speaker&apos;s name in the editor
          and every export you make afterwards carries the correction — the subtitles, the Markdown, the
          RAG chunks. Without a stored, editable transcript you&apos;d be making the same correction in
          every file you&apos;d already downloaded.
        </p>
        <p className={P}>
          See:{" "}
          <Link href="/docs/getting-started" className="text-[var(--accent)] hover:underline">
            Getting started
          </Link>
        </p>

        <AnchorHeading as="h2">Summaries</AnchorHeading>
        <p className={P}>
          Any transcript can be summarised for {summaryCost} credits — a flat price, whatever the length
          of the video. The summary is stored with the transcript and is editable the same way, with the
          original kept alongside your edits.
        </p>
        <p className={P}>
          See:{" "}
          <Link href="/docs/how-indxr-works/summaries" className="text-[var(--accent)] hover:underline">
            Summaries
          </Link>
        </p>

        <AnchorHeading as="h2">Credits</AnchorHeading>
        <p className={P}>
          Caption extraction is free. Transcription, summaries and RAG JSON use prepaid credits, which
          never expire.
        </p>
        <p className={P}>
          See:{" "}
          <Link href="/docs/account-and-data/credits-and-billing" className="text-[var(--accent)] hover:underline">
            Credits and billing
          </Link>
        </p>

        <RelatedTopicsList
          topics={[
            { label: "Accuracy and languages", href: "/docs/how-indxr-works/accuracy" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Limits", href: "/docs/how-indxr-works/limits" },
            { label: "Credits and billing", href: "/docs/account-and-data/credits-and-billing" },
          ]}
        />
      </DocsShell>
    </>
  )
}
