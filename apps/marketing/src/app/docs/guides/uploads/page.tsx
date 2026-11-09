import type { Metadata } from "next"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { AskYourLibrary } from "@/components/docs/AskYourLibrary"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS } from "@indxr/shared/lib/pricing"
import { UPLOAD_FORMAT_COUNT, UPLOAD_FORMAT_COUNT_WORD, UPLOAD_FORMATS_LIST, UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
import { pageOg } from "@/lib/pageOg"

const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

export const metadata: Metadata = {
  alternates: { canonical: "/docs/guides/uploads" },
  title: "Audio & video uploads — INDXR.AI Docs",
  // 155-char budget (Ahrefs crawl 2026-10-27: was 219 chars). Keyword first.
  description:
    `Upload an interview, lecture or other recording and INDXR transcribes it with AI: ${UPLOAD_FORMAT_COUNT} formats, up to ${UPLOAD_MAX_FILE_MB} MB and ${MAX_TRANSCRIPTION_HOURS} hours, ${perMin} credit a minute.`,
  robots: { index: true, follow: true },
  ...pageOg("/docs/guides/uploads"),
}

export default function DocsUploadsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Audio & video uploads",
    author: { "@type": "Organization", name: "INDXR.AI", url: "https://indxr.ai" },
    publisher: { "@type": "Organization", name: "INDXR.AI", url: "https://indxr.ai", logo: { "@type": "ImageObject", url: "https://indxr.ai/apple-touch-icon.png" } },
    description: metadata.description,
    url: "https://indxr.ai/docs/guides/uploads",
  }

  return (
    <>
      <JsonLd schemas={[schema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Guides", href: "/docs" },
            { label: "Audio & video uploads" },
          ]}
        />
        <h1 className="text-4xl font-bold leading-[1] tracking-[-0.04em] text-[var(--fg-strong)] mb-5 sm:text-5xl">Audio &amp; video uploads</h1>
        <DefinitionLeadOpening>
          Uploads let you transcribe a file you already have — a recorded call, a podcast, an interview —
          instead of a YouTube link. You pick a file, INDXR sends it to the transcription service, and
          you get a transcript back in the same formats as everything else. Use this when the audio
          isn&apos;t on YouTube, or when a video is blocked but you have the file.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">What you can upload</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          INDXR accepts {UPLOAD_FORMAT_COUNT_WORD} audio and video formats: {UPLOAD_FORMATS_LIST}. A
          file can be up to <strong>{UPLOAD_MAX_FILE_MB} MB</strong> and up to <strong>{MAX_TRANSCRIPTION_HOURS} hours</strong> long.
          Both limits are checked in the browser before the upload starts and again on the server, so an
          oversized file is stopped early rather than after a long wait.
        </p>

                <DocsFigure
          src="/docs/screenshots/uploader-empty.png"
          alt={`The empty file uploader: a drop zone that says to drag a file or click to browse, with the accepted formats and the ${UPLOAD_MAX_FILE_MB} MB size limit.`}
          caption={`Drag a file in or browse; the accepted formats and the ${UPLOAD_MAX_FILE_MB} MB limit are shown.`}
        />
<AnchorHeading as="h2">Uploads are always transcribed with AI</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A YouTube video can carry captions; a raw file can&apos;t. So every upload goes through AI
          transcription — there is no free caption path for uploads. It costs {perMin} credit per minute
          of audio, rounded up, minimum 1, and the estimate is shown before you start.
        </p>
        <DocsCallout variant="requires-account">
          Uploading needs a free account — the uploader only appears once you are signed in.
        </DocsCallout>

                <DocsFigure
          src="/docs/screenshots/error-storage_full.png"
          alt="The error card shown when your library storage is full: a new transcript is blocked and no credits are lost."
          caption="When your library is full, a new transcript is blocked with no credits lost."
        />
<AnchorHeading as="h2">What happens to your file</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Websites normally cap how big a file you can send them, which would block a large recording.
          To avoid that, your file goes straight to the transcription server instead of passing through
          the website — so large files work. Once transcription finishes, the temporary file (the copy
          the server keeps only while it is working) is deleted in the same step — only the transcript
          text is kept, in your library. Nothing is stored for later: the audio is removed as soon as it
          is processed.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "supported formats, 500 MB cap", verifiedAgainst: "backend/audio_utils.py (SUPPORTED_FORMATS audio_utils.py:18, MAX_FILE_SIZE_MB audio_utils.py:19)" },
            { publisher: "INDXR (own code)", supports: "10-hour cap, upload route, browser + server size check", verifiedAgainst: "backend/main.py (MAX_TRANSCRIPTION_SECONDS main.py:775, upload route main.py:817-922); packages/shared/src/components/free-tool/AudioTab.tsx (AudioTab.tsx:276-282,332,573)" },
            { publisher: "INDXR (own code)", supports: "1 credit/min cost, file deleted after processing", verifiedAgainst: "packages/shared/src/lib/pricing.ts (AI_TRANSCRIPTION_PER_MIN); backend/transcription_pipeline.py:710-715 (temp-file cleanup)" },
          ]}
        />
        <AskYourLibrary lead="Interviews, lectures and recordings you upload are kept in your library, with speakers and timestamps." />

        <RelatedTopicsList
          topics={[
            { label: "Limits", href: "/docs/reference/limits" },
            { label: "Single video", href: "/docs/guides/single-video" },
            { label: "Article: Audio file transcription", href: "/articles/audio-to-text" },
          ]}
        />
      </DocsShell>
    </>
  )
}
