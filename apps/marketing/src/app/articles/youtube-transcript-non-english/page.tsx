import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

// Real worked example — transcript b05d9d09-00d7-4ba2-9339-d149f049f962 in the production database
// (our own library): Arabic, 917 segments, transcript_confidence 0.98224694. Duration and credits are
// derived here so they stay in step with the per-minute-rounded-up formula; the opening text lower down
// is pasted verbatim from that transcript. Nothing is typed over.
const EXAMPLE_DURATION_S = 4843
const EXAMPLE_MINUTES = Math.ceil(EXAMPLE_DURATION_S / 60)
const EXAMPLE_CREDITS = EXAMPLE_MINUTES * CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const EXAMPLE_SEGMENTS = 917
const EXAMPLE_CONFIDENCE = "0.98"

const metaDescription =
  `YouTube shows captions in a language nobody spoke. INDXR works from the audio and gives you the ` +
  `transcript in the language that was actually spoken, in up to ${TRANSCRIPTION_MODEL.totalLanguages} languages.`

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-transcript-non-english" },
  title: "Non-English YouTube Transcripts — Get the Right Language | INDXR.AI",
  description: metaDescription,
  ...editorialOg("youtube-transcript-non-english"),
}

const faqs = [
  {
    q: "Why does YouTube show captions in a language nobody spoke?",
    a: "Because you are usually looking at an auto-translation of auto-captions rather than the original track, and your account language influences which one appears first.",
  },
  {
    q: "Does INDXR use those translated captions?",
    a: "No. If the original-language text is missing, the video counts as having no transcript and we transcribe the audio instead.",
  },
  {
    q: "Can I choose the language before transcribing?",
    a: "No. The language is recognised from the audio. There is nothing to set.",
  },
  {
    q: "Can I correct the detected language afterwards?",
    a: "Not at the moment. The language is verified against the finished transcript, which catches the common failures, but there is no manual override yet.",
  },
  {
    q: "Does it translate the transcript?",
    a: "No. You get the text in the language that was spoken. Take the export to a translation tool if you need another language.",
  },
  {
    q: "What about a video with two languages in it?",
    a: "One language is recognised for the whole transcript, so a bilingual video gets a single label. The words are still transcribed as spoken.",
  },
  {
    q: "How accurate is it in my language?",
    a: "It varies. The reference page lists accuracy bands per language and is honest about which ones are weaker.",
  },
]

const sources = [
  { label: "FlexClip: YouTube automatic captions in the wrong language", url: "https://www.flexclip.com/learn/youtube-automatic-captions-wrong-language.html" },
  { label: "TechCrunch: YouTube launches auto-captions in Spanish (2012)", url: "https://techcrunch.com/2012/06/15/youtube-launches-auto-captions-in-spanish/" },
  { label: "YouTube Help: Use automatic captioning", url: "https://support.google.com/youtube/answer/6373554" },
  { label: "Adobe Community: Premiere Pro transcribing into the wrong language", url: "https://community.adobe.com/questions-729/premiere-pro-transcribing-into-wrong-language-1415840" },
]

export default function YouTubeTranscriptNonEnglishPage() {
  return (
    <ToolPageTemplate
      category="Troubleshooting"
      slug="youtube-transcript-non-english"
      title="Non-English YouTube transcripts: get the right language"
      metaDescription={metaDescription}
      publishedAt="2026-04-24"
      updatedAt="2026-08-26"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
      image="https://indxr.ai/docs/screenshots/method-choice-light.png"
    >
      <p>
        You open a Spanish video, click the transcript, and get Korean. Or Dutch. Or one auto-generated
        option in a language nobody in the video speaks.
      </p>

      <p>
        This is not your settings, and it is not rare. It has been{" "}
        <a href="https://www.flexclip.com/learn/youtube-automatic-captions-wrong-language.html" target="_blank" rel="noopener noreferrer">a known problem for years</a>,
        and the text you end up reading is often a translation of a guess rather than what was said.
        Professional tools fail the same way: editors report{" "}
        <a href="https://community.adobe.com/questions-729/premiere-pro-transcribing-into-wrong-language-1415840" target="_blank" rel="noopener noreferrer">English interviews transcribed as Mandarin</a>,
        with auto-detect switched on, and the answer is always to set the language by hand and start over.
      </p>

      <p>
        INDXR works from the audio. A free account comes with {FREE_TIER.WELCOME_CREDITS} credits.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link href="/pricing" className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline">
          See pricing →
        </Link>
      </div>

      <h2>Why YouTube gives you the wrong language</h2>

      <p>Two different things get confused under one word.</p>

      <p>
        Auto-captions are a speech-recognition guess at what was said. They only exist in{" "}
        <a href="https://support.google.com/youtube/answer/6373554" target="_blank" rel="noopener noreferrer">a limited set of languages</a>,
        and they are wrong more often on accented or noisy audio.
      </p>

      <p>
        Auto-translate takes those captions and runs them through machine translation. YouTube has combined
        the two{" "}
        <a href="https://techcrunch.com/2012/06/15/youtube-launches-auto-captions-in-spanish/" target="_blank" rel="noopener noreferrer">since 2012</a>{" "}
        to produce subtitles in more than fifty languages, so what you see can be a translation of a guess,
        two steps away from the audio.
      </p>

      <p>
        The transcript panel does not always tell you which of the two you are looking at, and your own
        account language influences what surfaces first. That is how a Spanish lecture ends up showing you
        English text that nobody said.
      </p>

      <h2>What INDXR does instead</h2>

      <p>
        We start from the audio, not from a label. A caption file carries a language tag, and that tag is
        often wrong or describes a translation rather than the video. So we do not trust it. We work from
        what is actually spoken.
      </p>

      <p>
        We never hand you a translation dressed up as a transcript. If the only text available for a video
        is machine-translated, we treat that video as having no transcript at all and offer to transcribe
        the audio properly instead. A translation of a guess is worse than nothing, and it is the reason you
        are reading this.
      </p>

      <p>
        The language is recognised, then checked. Recognition happens automatically across up to{" "}
        {TRANSCRIPTION_MODEL.totalLanguages} languages, and the result is verified against the finished
        transcript before we label it. A talk in one language that is full of terms from another is exactly
        where automatic recognition slips, and that check is there to catch it.
      </p>

      <p>
        You do not configure any of this. You paste a link or upload a file, and the transcript comes back
        in the language that was spoken.
      </p>

      <DocsFigure
        src="/docs/screenshots/method-choice.png"
        alt="The method chooser after pasting a link: free caption extraction alongside AI transcription, which reads the audio and detects the language automatically."
        caption="When a video's only captions are the wrong language, you transcribe the audio instead, and the language is recognised from what was spoken."
      />

      <h2>What you get back</h2>

      <p>
        An example from our own library: an {EXAMPLE_MINUTES}-minute Arabic lecture, transcribed with AI,{" "}
        {EXAMPLE_SEGMENTS.toLocaleString()} segments, with a confidence score of {EXAMPLE_CONFIDENCE}. It
        opens like this:
      </p>

      <blockquote dir="auto" className="text-lg leading-loose">
        السلام عليكم في هذه الحلقة سأعيد مرة أخرى مناقشة إنكار بعض فقهاء المعاصرين لمسألة المست الشيطاني والتي
        تقريباً أجمعت عليها الأمة ولم يخالف فيها إلا قلة قليلة فقط
      </blockquote>

      <p>
        The text reads right to left where the language does, speakers are separated where there is more
        than one voice, and timestamps work as they do in any other transcript. Every export format is
        available.
      </p>

      <p>
        The detected language travels with the file. It sits in the VTT header, in the Markdown front matter
        and in the CSV metadata, so a player or a note app knows what it is reading. You also see it next to
        your transcript in the library.
      </p>

      <h2>Which languages</h2>

      <table>
        <tbody>
          <tr>
            <td>YouTube captions</td>
            <td>Any language the video has its own caption track for</td>
          </tr>
          <tr>
            <td>AI transcription</td>
            <td>Up to {TRANSCRIPTION_MODEL.totalLanguages} languages, recognised automatically</td>
          </tr>
          <tr>
            <td>Highest-quality model</td>
            <td>{TRANSCRIPTION_MODEL.nativeLanguages} languages natively, including Arabic</td>
          </tr>
        </tbody>
      </table>

      <p>
        Accuracy differs by language and we do not publish one number for all of them. The{" "}
        <Link href="/docs/reference/accuracy">per-language accuracy bands</Link> are on the reference page,
        taken from the provider rather than from our own measurements, and honest about which languages are
        weaker.
      </p>

      <h2>What it does not do</h2>

      <p>
        It does not translate. INDXR transcribes what was spoken, in the language it was spoken in. If you
        need the text in another language, take the transcript to a translation tool of your choice. We
        would rather give you an accurate original than an automatic translation of a guess, which is the
        thing that sent you here.
      </p>

      <p>
        You cannot pick the language. Recognition is automatic. Nothing to set, nothing to get wrong.
      </p>

      <h2>What it costs</h2>

      <table>
        <tbody>
          <tr>
            <td>Captions in the original language</td>
            <td>Free</td>
          </tr>
          <tr>
            <td>AI transcription</td>
            <td>{CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit per minute, in any language</td>
          </tr>
          <tr>
            <td>Text and subtitle exports</td>
            <td>Included</td>
          </tr>
        </tbody>
      </table>

      <p>
        The Arabic lecture above cost {EXAMPLE_CREDITS} credits for its {EXAMPLE_MINUTES} minutes. There is
        no subscription, and credits never expire.
      </p>

      <h2>Try it</h2>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link href="/pricing" className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline">
          See pricing →
        </Link>
      </div>
    </ToolPageTemplate>
  )
}
