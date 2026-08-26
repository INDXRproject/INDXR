import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { SourcesBlock } from "@/components/docs/SourcesBlock"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { transcriptionModelName, TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"

const accDescription = `INDXR gives you two ways to produce text — reading a video's existing captions or transcribing the audio — and the accuracy of each differs. Captions are as accurate as their source; AI transcription runs on ${transcriptionModelName()}, which picks the best model for the detected language.`

export const metadata: Metadata = {
  alternates: { canonical: "/docs/reference/accuracy" },
  title: "Accuracy and Languages — INDXR.AI Docs",
  description: accDescription,
}

export default function DocsAccuracyPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Accuracy and languages",
    description: accDescription,
    url: "https://indxr.ai/docs/reference/accuracy",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Reference", href: "/docs" },
            { label: "Accuracy and languages" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Accuracy and languages</h1>
        <DefinitionLeadOpening>
          INDXR produces text two ways — by reading a video&apos;s existing captions, or by
          transcribing the audio — and how accurate the result is depends on which you pick. At
          AssemblyAI — the speech-recognition service INDXR uses for AI transcription — accuracy is
          reported per language, so accuracy and language coverage are the same subject.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">YouTube captions</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          YouTube auto-captions are generated either by the video creator or by YouTube&apos;s own
          speech recognition. INDXR fetches these verbatim — their accuracy depends entirely on the
          source caption quality, not on INDXR processing. Automatic captions get words wrong (names,
          brands, technical terms) and get more wrong when the audio is poor, when speakers overlap,
          when the accent is strong, or when the language isn&apos;t English. They are also written for
          on-screen reading: short lines, no punctuation, no sentence structure.
        </p>

        <AnchorHeading as="h2">AI transcription</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          AI transcription reads the audio itself and writes the transcript from scratch, with
          punctuation, capitalisation and real sentences. It runs on {transcriptionModelName()}, and it
          handles names, jargon and accented speech far better than automatic captions do. It is still
          speech recognition, though, so it is not flawless: poor audio, people talking over each other,
          and less widely spoken languages all lower the result. How accurate it is in practice depends
          mostly on the language — see the bands below.
        </p>
        <p className="text-[var(--fg-muted)] text-sm mt-2">
          We don&apos;t publish a single headline accuracy figure for INDXR, because a number measured on
          clean English audio wouldn&apos;t tell you what to expect on your video. The per-language bands
          from AssemblyAI below are the honest guide.
        </p>

        <AnchorHeading as="h2">Which languages, and how accurate</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          For AI transcription, INDXR automatically uses the best model for your video&apos;s language —
          it is a language router, not a fault fallback. {transcriptionModelName()} natively covers{" "}
          {TRANSCRIPTION_MODEL.nativeLanguages} languages; a broader model, Universal-2, covers{" "}
          {TRANSCRIPTION_MODEL.totalLanguages}, and the language is detected automatically.
          Caption extraction works for any language YouTube provides captions for.
        </p>
        <p className="text-[var(--fg-subtle)] leading-relaxed mt-4">
          AssemblyAI reports accuracy per language as an expected word error rate (WER) — the share of
          words transcribed incorrectly, so lower is better — grouped into four bands:
        </p>
        <ul className="space-y-2 text-[var(--fg-subtle)] mt-3">
          <li>
            <strong className="text-[var(--fg)]">≤ 10% (high)</strong> — English, Spanish, French,
            German, Dutch, Italian, Portuguese, Japanese, Russian, Swedish, Turkish, Ukrainian, Polish,
            Indonesian, Catalan.
          </li>
          <li>
            <strong className="text-[var(--fg)]">10–25% (good)</strong> — including Arabic, Mandarin
            Chinese, Hindi, Korean, Danish, Greek, Hebrew, Vietnamese, Thai, Finnish, Norwegian.
          </li>
          <li>
            <strong className="text-[var(--fg)]">25–50% (moderate)</strong> — including Persian,
            Tamil, Marathi, Swahili, Icelandic, Welsh, Kazakh.
          </li>
          <li>
            <strong className="text-[var(--fg)]">&gt; 50% (limited)</strong> — including Bengali,
            Gujarati, Telugu, Kannada, Malayalam, Nepali, Burmese.
          </li>
        </ul>
        <p className="text-[var(--fg-muted)] text-sm mt-3">
          The lists show representative languages; AssemblyAI&apos;s page has the complete breakdown, and
          these bands can change as their models improve.
        </p>

        <AnchorHeading as="h2">How the language is set</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          You don&apos;t set the language — INDXR detects it automatically and shows it on your transcript
          in the library, next to its length and date. It travels into your exports too: the VTT header,
          the Markdown frontmatter and the CSV metadata each carry the detected language. You can&apos;t
          choose a language before transcribing, and you can&apos;t change the detected one afterwards. INDXR
          transcribes in the language that was spoken; it does not translate.
        </p>

        <SourcesBlock
          sources={[
            {
              publisher: "AssemblyAI — supported languages",
              supports: `${TRANSCRIPTION_MODEL.nativeLanguages} languages on ${TRANSCRIPTION_MODEL.displayName}, ${TRANSCRIPTION_MODEL.totalLanguages} on Universal-2, and the four WER accuracy bands with their languages (verified 2026-07-23)`,
              href: "https://www.assemblyai.com/docs/supported-languages",
            },
            {
              publisher: "INDXR (own code)",
              supports: "the transcription model name and the language-router chain (best model per detected language, not a fault fallback)",
              verifiedAgainst: "packages/shared/src/lib/models.ts; backend/assemblyai_client.py:24-28",
            },
          ]}
        />

        <RelatedTopicsList
          topics={[
            { label: "How INDXR works", href: "/docs/how-indxr-works" },
            { label: "Limits", href: "/docs/reference/limits" },
            { label: "Article: Non-English transcripts", href: "/articles/youtube-transcript-non-english" },
          ]}
        />
      </DocsShell>
    </>
  )
}
