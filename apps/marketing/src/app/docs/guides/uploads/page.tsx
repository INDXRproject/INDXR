import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { DocsCallout } from "@/components/docs/DocsCallout"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { CREDIT_COSTS } from "@indxr/shared/lib/pricing"

const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

export const metadata: Metadata = {
  title: "Audio & video uploads — INDXR.AI Docs",
  description:
    "Upload an audio or video file you already have and INDXR transcribes it with AI. Nine formats, up to 500 MB and 10 hours per file, 1 credit per minute. The file is deleted from the server as soon as it is processed.",
  robots: { index: true, follow: true },
}

export default function DocsUploadsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Audio & video uploads",
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
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Audio &amp; video uploads</h1>
        <DefinitionLeadOpening>
          Uploads let you transcribe a file you already have — a recorded call, a podcast, an interview —
          instead of a YouTube link. You pick a file, INDXR sends it to the transcription service, and
          you get a transcript back in the same formats as everything else. Use this when the audio
          isn&apos;t on YouTube, or when a video is blocked but you have the file.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">What you can upload</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          INDXR accepts nine audio and video formats: MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM, OGG and
          FLAC. A file can be up to <strong>500 MB</strong> and up to <strong>10 hours</strong> long.
          Both limits are checked in the browser before the upload starts and again on the server, so an
          oversized file is stopped early rather than after a long wait.
        </p>

        <AnchorHeading as="h2">Uploads are always transcribed with AI</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          A YouTube video can carry captions; a raw file can&apos;t. So every upload goes through AI
          transcription — there is no free caption path for uploads. It costs {perMin} credit per minute
          of audio, rounded up, minimum 1, and the estimate is shown before you start.
        </p>
        <DocsCallout variant="requires-account">
          Uploading needs a free account — the uploader only appears once you are signed in.
        </DocsCallout>

        <AnchorHeading as="h2">What happens to your file</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          Your file goes straight to the transcription server, not through the website&apos;s size
          limit, so large files work. Once transcription finishes, the temporary file is deleted from
          the server in the same step — only the transcript text is kept, in your library. There is no
          retention window: the audio is removed as soon as it is processed.
        </p>

        <SourcesBlock
          sources={[
            { publisher: "INDXR (own code)", supports: "supported formats, 500 MB cap", verifiedAgainst: "backend/audio_utils.py (SUPPORTED_FORMATS audio_utils.py:18, MAX_FILE_SIZE_MB audio_utils.py:19)" },
            { publisher: "INDXR (own code)", supports: "10-hour cap, upload route, browser + server size check", verifiedAgainst: "backend/main.py (MAX_TRANSCRIPTION_SECONDS main.py:775, upload route main.py:817-922); packages/shared/src/components/free-tool/AudioTab.tsx (AudioTab.tsx:276-282,332,573)" },
            { publisher: "INDXR (own code)", supports: "1 credit/min cost, file deleted after processing", verifiedAgainst: "packages/shared/src/lib/pricing.ts (AI_TRANSCRIPTION_PER_MIN); backend/transcription_pipeline.py:710-715 (temp-file cleanup)" },
          ]}
        />
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
