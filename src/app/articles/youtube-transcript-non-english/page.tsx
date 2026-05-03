import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube Transcripts in Non-English Languages — What Works | INDXR.AI",
  description:
    "Extracting YouTube transcripts in Arabic, Spanish, Portuguese, Indonesian, or Turkish? Here's what caption extraction gives you and when AI transcription is the right choice.",
}

const faqs = [
  {
    q: "Why does the language field say \"ar\" but the text is English?",
    a: "The language field reflects the audio language detected from YouTube's metadata or our language detection system. The text is English because YouTube's caption delivery forces English translation at the infrastructure level. This is expected behavior, not a bug.",
  },
  {
    q: "Does AI Transcription work for languages with non-Latin scripts?",
    a: "Yes. Arabic, Chinese, Japanese, Korean, and other non-Latin script languages are supported and transcribed in their original scripts.",
  },
  {
    q: "Is there a way to get original-language captions without AI Transcription?",
    a: "Not through our current pipeline. The YouTube CDN limitation affects all tools that use the standard timedtext API. If you have a specific use case for original-language captions, AI Transcription is the reliable alternative.",
  },
  {
    q: "What about RAG in non-English languages?",
    a: "RAG JSON export works for any language. The chunking and overlap logic is language-agnostic — it operates on timestamps, not text structure. The sentence-boundary overlap (available for AssemblyAI transcripts) works on any language with punctuation in the AssemblyAI output.",
  },
]

const sources = [
  {
    label: "AssemblyAI Universal-2 — supported languages (99+ languages)",
    url: "https://www.assemblyai.com/docs/speech-to-text/supported-languages",
  },
  {
    label: "AssemblyAI Universal-3 Pro — speech-to-text model",
    url: "https://www.assemblyai.com/universal-3",
  },
]

export default function YouTubeTranscriptNonEnglishPage() {
  return (
    <ToolPageTemplate
      title="YouTube Transcripts in Non-English Languages — What Works"
      metaDescription="Extracting YouTube transcripts in Arabic, Spanish, Portuguese, Indonesian, or Turkish? Here's what caption extraction gives you and when AI transcription is the right choice."
      publishedAt="2026-04-24"
      updatedAt="2026-04-24"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        If you&apos;re extracting transcripts from non-English YouTube videos, there&apos;s something you should
        know upfront before you spend time on a workflow that won&apos;t give you what you expect.
      </p>

      <h2>What Caption Extraction Gives You for Non-English Videos</h2>

      <p>
        YouTube&apos;s auto-caption system generates captions in the video&apos;s original language. Arabic
        videos get Arabic captions. Spanish videos get Spanish captions. That much is straightforward.
      </p>

      <p>
        The problem is at the infrastructure level. When our system downloads captions via YouTube&apos;s
        timedtext API, YouTube&apos;s CDN forces the output through an English translation layer — regardless
        of what language was requested. The URL parameter <code>tlang=en</code> is appended by
        YouTube&apos;s server, not by us, and it isn&apos;t overridable through standard API calls.
      </p>

      <p>
        The result: you submit an Arabic video, you get an English-translated transcript. The{" "}
        <code>language</code> field in the metadata will correctly say{" "}
        <code>&quot;ar&quot;</code> — that&apos;s the audio language — but the text itself is the English
        translation.
      </p>

      <p>
        This is a YouTube infrastructure limitation, not something unique to INDXR.AI. We&apos;ve confirmed
        the same behavior across other transcript tools including Tactiq and YouTubeToTranscript.
      </p>

      <p>
        If you need the original language text, caption extraction is not the right route. AI
        Transcription is.
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
          95 other languages
        </a>
        , AssemblyAI&apos;s Universal-2 model transcribes the audio in the original language. For English,
        Spanish, German, French, Portuguese, and Italian,{" "}
        <a
          href="https://www.assemblyai.com/universal-3"
          target="_blank"
          rel="noopener noreferrer"
        >
          Universal-3 Pro
        </a>{" "}
        is used — the higher-accuracy model.
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
            <td>Non-English video, you want the original language text</td>
            <td>AI Transcription</td>
          </tr>
          <tr>
            <td>Non-English video, English translation is fine</td>
            <td>Caption extraction (free)</td>
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
        A 28-minute Arabic lecture: 28 credits. At Basic pricing (€6.99/500 credits), that&apos;s €0.39.
      </p>

      <p>
        AssemblyAI Universal-2 (used for non-English languages outside the Universal-3 Pro set) has
        comparable accuracy to Universal-3 Pro for most languages. For Arabic specifically, it handles
        Modern Standard Arabic and many dialects reliably.
      </p>

      <p>
        For the full JSON export schema, see{" "}
        <Link href="/youtube-transcript-json">YouTube Transcript JSON Export</Link>. For audio file
        uploads, see <Link href="/audio-to-text">Audio Upload</Link>. For credit packages, see the{" "}
        <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}
