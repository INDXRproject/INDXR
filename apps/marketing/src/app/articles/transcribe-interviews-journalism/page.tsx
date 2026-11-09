import type { Metadata } from "next"
import Link from "next/link"
import { ArticleTemplate } from "@/components/content/templates/ArticleTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AUTHORS } from "@/lib/authors"
import { pageOg } from "@/lib/pageOg"
import { CREDIT_COSTS, FREE_TIER, creditCostEur, getAnchorPackage } from "@indxr/shared/lib/pricing"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { UPLOAD_MAX_FILE_MB, UPLOAD_FORMAT_COUNT_WORD } from "@indxr/shared/lib/uploadFormats"
import { TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"

// New 2026-11-09 (positioning 9-11: journalists and non-fiction writers). Product facts: uploads
// (docs/guides/uploads), speaker rename + edits kept separately (docs/guides/library), upload citation
// shape from buildCitation in apps/app/src/components/library/SourceCard.tsx, data handling as stated on
// /articles/audio-to-text and /privacy (audio deleted after transcription, EU processing).

const SLUG = "transcribe-interviews-journalism"
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const welcome = FREE_TIER.WELCOME_CREDITS
const anchor = getAnchorPackage()

const title = "Transcribe interviews you can quote with confidence"
const metaDescription =
  "For journalists and non-fiction writers: transcribe interviews with speakers and timestamps, check every quote against the recording, and find every mention."

export const metadata: Metadata = {
  alternates: { canonical: `/articles/${SLUG}` },
  title: "Transcribe Interviews for Journalism and Non-Fiction | INDXR.AI",
  description: metaDescription,
  ...pageOg(`/articles/${SLUG}`, { type: "article" }),
}

const faqs = [
  {
    q: "What happens to the audio of my interview?",
    a: "It is deleted on our side as soon as the transcription finishes. Only the transcript text is kept, in your library. Transcription runs inside the EU, our provider is opted out of training on your audio, and its own retention is set to one day, the shortest it offers.",
  },
  {
    q: "Can I transcribe a phone interview?",
    a: "Yes, if you have it as an audio file. Recording a call usually requires the consent of the people on it, and the rules differ by country. Getting that consent is your responsibility.",
  },
  {
    q: "How do I fix a misspelled name?",
    a: "Correct it once in the editor. Your edits are stored next to the original transcript, so the machine version is never lost, and every export afterwards carries the correction.",
  },
  {
    q: "Can I share a transcript with an editor?",
    a: "Export it, in plain text with timestamps, Markdown or another format, and send the file. INDXR is built for one person, so there are no shared workspaces.",
  },
  {
    q: "Does it translate interviews?",
    a: `No. It transcribes in the language spoken, detected automatically across ${TRANSCRIPTION_MODEL.totalLanguages} languages. Translation is a separate step, and for quotes it is one worth doing by hand.`,
  },
]

const sources = [
  { label: "AssemblyAI supported languages", url: "https://www.assemblyai.com/docs/getting-started/supported-languages" },
]

export default function TranscribeInterviewsPage() {
  return (
    <ArticleTemplate
      category="Workflows"
      slug={SLUG}
      title={title}
      metaDescription={metaDescription}
      publishedAt="2026-11-09"
      updatedAt="2026-11-09"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        An interview is only as useful as your ability to quote it accurately. A transcript gets you most of
        the way: you can read the conversation in minutes, mark what matters and pull lines into a draft.
        What it cannot do on its own is guarantee that a line is word for word what was said. For that you
        need the recording, and a quick way back to the right second of it.
      </p>

      <p>
        This article is for journalists, non-fiction writers and researchers who interview people. It
        covers transcribing the recording, labelling the speakers, checking each quote against the moment
        it was said, keeping the source, finding every mention across a set of interviews, and drafting with
        Claude or ChatGPT without losing track of what is a real quote.
      </p>

      <h2>Upload the recording</h2>

      <p>
        Upload the file as it came off your phone or recorder. INDXR accepts {UPLOAD_FORMAT_COUNT_WORD} audio
        and video formats, including the M4A an iPhone voice memo produces, up to {UPLOAD_MAX_FILE_MB}MB and{" "}
        {MAX_TRANSCRIPTION_HOURS} hours per file. You do not choose the language; it is detected from the
        audio. An hour usually takes a few minutes, and the job runs on the server, so you can close the tab.
      </p>

      <p>
        It costs {perMin} credit per minute of audio, and the exact cost is shown before you start. A
        one-hour interview is {60 * perMin} credits, {creditCostEur(60 * perMin)} at {anchor.name} pricing.
        Formats and limits are in the <Link href="/docs/guides/uploads">uploads guide</Link>.
      </p>

      <h2>Rename the speakers once</h2>

      <p>
        The transcript comes back punctuated and split by speaker, as Speaker A, Speaker B and so on. Rename
        a label once, to the interviewee&apos;s name or to &ldquo;Me&rdquo;, and it changes everywhere: in the
        transcript and in every export you make afterwards. The original label is always recoverable.
      </p>

      <DocsFigure
        src="/docs/screenshots/transcript-speakers.png"
        alt="A finished transcript where each paragraph opens with a timestamp and a bold speaker name, here Sarah Chen and Dr. Miguel Ferro, followed by their words."
        caption="Each paragraph opens with its timestamp and a speaker name you set once for the whole transcript."
      />

      <p>
        Where two people talk over each other, the speaker boundary gets less precise and a word can land on
        the wrong person. That is one more reason to check quotes against the audio.
      </p>

      <h2>Check every quote against the moment</h2>

      <p>
        Speech recognition is very good on clear audio and still makes mistakes on names, jargon, accents
        and crosstalk. A wrong word inside quotation marks is a correction you have to run. So treat the
        transcript as a map of the recording, not a replacement for it.
      </p>

      <p>
        Each paragraph carries the time it starts. When a line goes into your draft, note that time next to
        it. Before you file, play each quoted line back from its timestamp in your copy of the recording.
        INDXR deletes its copy of the audio after transcription, so keep your original file. The
        timestamps match it.
      </p>

      <p>
        If you correct the transcript as you go, the corrections are stored next to the original version
        rather than over it. You can always see what the machine heard and what you changed.
      </p>

      <h2>Keep the source with the text</h2>

      <p>
        Every transcript in your library keeps where it came from: its title, its length, its
        language and when you added it. It also gives a ready citation. For an uploaded recording that looks
        like <code>Title [Audio recording]. (n.d.).</code>, because a private recording has no publisher or
        upload date for INDXR to read. Add the interviewee and the date of the interview yourself before you
        use it in a reference list.
      </p>

      <p>
        Group the interviews for one story or one book chapter into a collection. Six months later, when a
        fact-checker asks where a line came from, the interview is one search away.
      </p>

      <h2>Find every mention across interviews</h2>

      <p>
        Library search looks inside the transcript text, not just the titles. Search a name, a place or a
        phrase, and you see every interview where it came up, with the passage and its timestamp. Filter to
        one collection to keep the search to one story. That is the step that is hardest to do from memory:
        the third interview where someone mentioned the same meeting in passing.
      </p>

      <h2>Draft with Claude or ChatGPT, with quotes you can check</h2>

      <p>
        Connect your library to Claude or ChatGPT once, read-only and free, and the assistant can search your
        interviews and read them in blocks with timestamps and speaker names. You can ask things like:
      </p>

      <blockquote>
        <p>
          &ldquo;In my Harbour Project interviews, what did each person say about the 2019 closure? Quote them
          with speaker name and timestamp. Do not paraphrase inside quotation marks.&rdquo;
        </p>
      </blockquote>

      <p>
        The assistant takes the quotes from your transcripts, next to whatever background it already knows, and points to the minute for
        each quote. That makes a first draft or a briefing much faster. It does not make the assistant the
        authority on what was said: you are. Every quote it hands you still gets the same check against the
        recording. The setup is in the <Link href="/docs/guides/ai-assistants">Claude and ChatGPT guide</Link>,
        and the broader approach in{" "}
        <Link href="/articles/claude-chatgpt-own-sources">using Claude or ChatGPT with your own sources</Link>.
      </p>

      <h2>Where your recording goes</h2>

      <p>
        Interviews can be sensitive, so here is the whole path. The file goes straight to the transcription
        server and is transcribed inside the EU. As soon as the transcript is done, the uploaded file is
        deleted on our side, and only the text stays in your library. Our provider, AssemblyAI, does not use
        your audio to train its models, and its own retention is set to one day, its shortest setting. If you
        connect Claude or ChatGPT, that provider sees only the passages it reads to answer you, under its own
        terms. Details are in the <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>What it costs</h2>

      <table>
        <thead>
          <tr>
            <th>Interview length</th>
            <th>Credits</th>
            <th>Cost at {anchor.name} pricing</th>
          </tr>
        </thead>
        <tbody>
          {[30, 60, 90].map((m) => (
            <tr key={m}>
              <td>{m} minutes</td>
              <td>{m * perMin}</td>
              <td>{creditCostEur(m * perMin)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        There is no subscription and credits never expire, which suits interview work: a quiet month costs
        nothing, and a week of ten interviews costs what ten interviews cost. Asking Claude or ChatGPT about
        your library costs no credits. A free account includes {welcome} credits to try it on a short
        recording.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link href="/articles/audio-to-text" className="text-sm font-medium text-[var(--link)] underline-offset-2 hover:underline">
          How the transcript is made →
        </Link>
      </div>
    </ArticleTemplate>
  )
}
