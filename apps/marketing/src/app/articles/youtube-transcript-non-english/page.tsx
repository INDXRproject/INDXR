import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { creditCostEur, getAnchorPackage } from "@indxr/shared/lib/pricing"
import { transcriptionModelName } from "@indxr/shared/lib/models"

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-transcript-non-english" },
  title: "YouTube Transcripts in Non-English Languages — What Works | INDXR.AI",
  description:
    "Extracting YouTube transcripts in Arabic, Spanish, Portuguese, Indonesian, or Turkish? Here's what caption extraction gives you and when AI transcription is the right choice.",
  ...editorialOg("youtube-transcript-non-english"),
}

const faqs = [
  {
    q: "Will an Arabic video come back in Arabic, or translated to English?",
    a: "In Arabic. Many transcript tools return English here, because YouTube's translatable caption track forces a tlang=en translation. INDXR anchors to the video's native (-orig) caption track instead, which never carries that translation, so you get the original language with 'ar' in the language field. If a video has no native track to anchor to, AI transcription will still give you the original language.",
  },
  {
    q: "Does AI Transcription work for languages with non-Latin scripts?",
    a: "Yes. Arabic, Chinese, Japanese, Korean, and other non-Latin script languages are supported and transcribed in their original scripts.",
  },
  {
    q: "Is there a way to get original-language captions without AI Transcription?",
    a: "Yes. INDXR selects the video's native caption track, so caption extraction already returns the original language whenever the video has auto-captions — no AI transcription needed. You only need AI transcription when a video has no captions, or when you want punctuation and higher accuracy.",
  },
  {
    q: "What about RAG in non-English languages?",
    a: "RAG JSON export works for any language. The chunking and overlap logic is language-agnostic — it operates on timestamps, not text structure. The sentence-boundary overlap (available for AssemblyAI transcripts) works on any language with punctuation in the AssemblyAI output.",
  },
]

const sources = [
  {
    label: "AssemblyAI — supported languages (99 languages)",
    url: "https://www.assemblyai.com/docs/speech-to-text/supported-languages",
  },
  {
    label: `${transcriptionModelName()} — speech-to-text model`,
    url: "https://www.assemblyai.com/docs/supported-languages",
  },
]

export default function YouTubeTranscriptNonEnglishPage() {
  return (
    <ToolPageTemplate
      category="Troubleshooting"
      slug="youtube-transcript-non-english"
      title="YouTube Transcripts in Non-English Languages — What Works"
      metaDescription="Extracting YouTube transcripts in Arabic, Spanish, Portuguese, Indonesian, or Turkish? Here's what caption extraction gives you and when AI transcription is the right choice."
      publishedAt="2026-04-24"
      updatedAt="2026-04-24"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Extracting transcripts from non-English YouTube videos works well with INDXR — but the free
        caption route and AI transcription give you different things, and it&apos;s worth knowing which to
        reach for.
      </p>

      <h2>What Caption Extraction Gives You for Non-English Videos</h2>

      <p>
        YouTube&apos;s auto-caption system generates captions in the video&apos;s original language. Arabic
        videos get Arabic captions. Spanish videos get Spanish captions. The catch that trips up most
        transcript tools is at the delivery level: when you fetch captions through YouTube&apos;s timedtext
        API, its CDN can force the output through an English translation layer with a{" "}
        <code>tlang=en</code> parameter — so you ask for Arabic and get English. The{" "}
        <code>language</code> field still reads <code>&quot;ar&quot;</code>, but the text is the English
        translation.
      </p>

      <p>
        INDXR avoids this. Instead of the translatable track, it anchors to the video&apos;s native track —
        the one YouTube marks as the original (its <code>-orig</code> track) — which never carries a{" "}
        <code>tlang=</code> translation. So for a non-English video that has auto-captions, caption
        extraction returns the <strong>original language</strong>, not an English translation. That&apos;s a
        deliberate choice in how INDXR requests captions, and it&apos;s where it differs from tools that take
        whatever the timedtext API hands back.
      </p>

      <p>
        Where caption extraction still can&apos;t help is when a video has no captions at all, or when you
        want punctuation and clean sentences that auto-captions don&apos;t provide. For those, AI
        Transcription is the route.
      </p>

      <h2>What AI Transcription Gives You</h2>

      <p>
        AI Transcription downloads the video audio and runs it through AssemblyAI&apos;s speech recognition
        models directly — bypassing YouTube&apos;s caption system entirely.
      </p>

      <p>
        For Arabic, Spanish, Portuguese, Turkish, Indonesian, and{" "}
        <a
          href="https://www.assemblyai.com/docs/speech-to-text/supported-languages"
          target="_blank"
          rel="noopener noreferrer"
        >
          many other languages
        </a>
        , INDXR transcribes the audio in its original language. We automatically pick the best model for
        the detected language — our highest-quality model,{" "}
        <a
          href="https://www.assemblyai.com/docs/supported-languages"
          target="_blank"
          rel="noopener noreferrer"
        >
          {transcriptionModelName()}
        </a>
        , natively covers 18 languages (including Arabic), and a broader model covers up to 99 languages
        for the rest.
      </p>

      <p>
        The output is the actual spoken language, correctly transcribed, with punctuation. Here&apos;s a
        real example from an Arabic lecture video (Dr. Tariq Al-Suwaidan, 28.5 minutes):
      </p>

      <pre className="prose-content-pre"><code>{`{
  "extraction_method": "assemblyai",
  "language": "ar",
  "segments": [
    {
      "text": "كثير من الناس يُخصّصون كل جهدهم ووقتهم فقط للبحث عن المال",
      "start_time": 35.2,
      "end_time": 42.1
    }
  ]
}`}</code></pre>

      <p>
        Correct Arabic text. Correct timestamps. The same structure as any English transcript.
      </p>

      <h2>When to Use Each Approach</h2>

      <table>
        <thead>
          <tr>
            <th>Situation</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>English video</td>
            <td>Caption extraction (free) or AI Transcription (more accurate)</td>
          </tr>
          <tr>
            <td>Non-English video that has captions</td>
            <td>Caption extraction — returns the original language, free</td>
          </tr>
          <tr>
            <td>Non-English video, you want punctuation or higher accuracy</td>
            <td>AI Transcription</td>
          </tr>
          <tr>
            <td>Video without captions, any language</td>
            <td>AI Transcription only</td>
          </tr>
        </tbody>
      </table>

      <p>
        For RAG pipelines specifically: if you&apos;re building a knowledge base in Arabic, Turkish, or
        Indonesian, AI Transcription is the only reliable route to original-language chunks.
      </p>

      <h2>Cost</h2>

      <p>
        <strong>AI Transcription: 1 credit per minute, minimum 1 credit.</strong>
      </p>

      <p>
        A 28-minute Arabic lecture: 28 credits. At {getAnchorPackage().name} pricing, that&apos;s {creditCostEur(28)}.
      </p>

      <p>
        For Arabic specifically, our highest-quality model handles Modern Standard Arabic and many
        dialects reliably. When a language falls outside the highest-quality model, INDXR automatically
        uses a broad-coverage model spanning 99 languages — so you always get original-language text.
      </p>

      <p>
        For the full JSON export schema, see{" "}
        <Link href="/articles/transcript-export-formats">the export formats reference</Link>. For audio file
        uploads, see <Link href="/articles/audio-to-text">Audio Upload</Link>. For credit packages, see the{" "}
        <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}
