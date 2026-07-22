import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb"
import { DefinitionLeadOpening } from "@/components/docs/DefinitionLeadOpening"
import { AnchorHeading } from "@/components/docs/AnchorHeading"
import { RelatedTopicsList } from "@/components/docs/RelatedTopicsList"
import { JsonLd } from "@/components/seo/JsonLd"
import { transcriptionModelName } from "@indxr/shared/lib/models"

const accDescription = `INDXR gives you two ways to produce text — reading a video's existing captions or transcribing the audio — and the accuracy of each differs. Captions are as accurate as their source; AI transcription runs on ${transcriptionModelName()}, which picks the best model for the detected language.`

export const metadata: Metadata = {
  title: "Accuracy and Languages — INDXR.AI Docs",
  description: accDescription,
}

export default function DocsAccuracyPage() {
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Accuracy and languages",
    description: accDescription,
    url: "https://indxr.ai/docs/how-indxr-works/accuracy",
  }

  return (
    <>
      <JsonLd schemas={[techArticleSchema]} />
      <DocsShell>
        <DocsBreadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Using INDXR", href: "/docs" },
            { label: "Accuracy and languages" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-4">Accuracy and languages</h1>
        <DefinitionLeadOpening>
          INDXR produces text two ways — by reading a video&apos;s existing captions, or by
          transcribing the audio — and how accurate the result is depends on which you pick. At
          AssemblyAI, accuracy is reported per language, so accuracy and language coverage are the
          same subject.
        </DefinitionLeadOpening>

        <AnchorHeading as="h2">Auto-captions</AnchorHeading>
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
          punctuation, capitalisation and real sentences. It runs on {transcriptionModelName()}. In
          internal benchmarks on clean English YouTube audio, our highest-quality model reaches around
          99.4% word-level accuracy; results vary with audio quality, speaker count and language.
        </p>

        <AnchorHeading as="h2">Supported languages</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          For AI transcription, INDXR automatically uses the best model for your video&apos;s language.
          Our highest-quality model, {transcriptionModelName()}, natively covers 18 languages; a
          broader model covers 99 languages for everything else, and the language is detected
          automatically. Caption extraction works for any language YouTube provides captions for.
        </p>

        <AnchorHeading as="h3">Accuracy by language</AnchorHeading>
        <p className="text-[var(--fg-subtle)] leading-relaxed">
          AssemblyAI groups supported languages by expected word error rate (WER), the share of words
          transcribed incorrectly — lower is better:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[var(--fg-subtle)] mt-2">
          <li><strong>≤ 10%</strong> — excellent</li>
          <li><strong>10–25%</strong> — good</li>
          <li><strong>25–50%</strong> — fair</li>
          <li><strong>&gt; 50%</strong> — limited</li>
        </ul>
        <p className="text-[var(--fg-muted)] text-sm mt-3">
          Source:{" "}
          <a
            href="https://www.assemblyai.com/docs/supported-languages"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            AssemblyAI — supported languages
          </a>
        </p>

        <RelatedTopicsList
          topics={[
            { label: "Overview", href: "/docs/how-indxr-works/overview" },
            { label: "Export formats", href: "/docs/how-indxr-works/export-formats" },
            { label: "Limits", href: "/docs/how-indxr-works/limits" },
            { label: "Credits", href: "/docs/account/credits" },
          ]}
        />
      </DocsShell>
    </>
  )
}
