import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import {
  UPLOAD_MAX_FILE_MB,
  UPLOAD_FORMAT_COUNT_WORD,
  UPLOAD_AUDIO_LABELS,
  UPLOAD_VIDEO_LABELS,
} from "@indxr/shared/lib/uploadFormats"
import { EXPORT_FORMAT_COUNT, spellCount } from "@indxr/shared/lib/exportFormats"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { CREDIT_COSTS, creditCostEur, getAnchorPackage, FREE_TIER } from "@indxr/shared/lib/pricing"
import { transcriptionModelName, TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"

const anchor = getAnchorPackage()
const ragPer10Min = CREDIT_COSTS.RAG_JSON_PER_10MIN

const metaDescription =
  `Upload a video file and get the full text back, punctuated, split by speaker and timestamped. ` +
  `Runs on ${transcriptionModelName()} across ${TRANSCRIPTION_MODEL.totalLanguages} languages at one credit per minute; a free account includes ${FREE_TIER.WELCOME_CREDITS} credits.`

export const metadata: Metadata = {
  alternates: { canonical: "/articles/video-to-text" },
  title: "Video to Text — Transcribe Video Files to Text | INDXR.AI",
  description: metaDescription,
  ...editorialOg("video-to-text"),
}

const faqs = [
  {
    q: "Can I convert an MP4 to text?",
    a: "Yes. INDXR takes the audio track out of the MP4 for you and transcribes it, so you upload the file as it is, with no conversion step. It comes back punctuated, split by speaker and timestamped, at one credit per minute of video.",
  },
  {
    q: "Do I need to convert MKV or MOV before uploading?",
    a: `No. MKV and MOV upload as they are, along with every other accepted format, and the audio track is extracted for you. You never tell us which container you have, and you never run a converter first. A single file can be up to ${UPLOAD_MAX_FILE_MB}MB.`,
  },
  {
    q: "Will I get subtitles I can put straight on the video?",
    a: "Yes. Every transcript exports as SRT and VTT, rebuilt to broadcast conventions rather than left as raw fragments: lines are capped at 42 characters across at most two lines, cues break on sentence boundaries, and speaker names carry through. They drop into a player or editor without cleaning up first.",
  },
  {
    q: "What happens to my video file after it is transcribed?",
    a: "It is deleted from our side as soon as the transcription finishes, and only the text stays in your library. Everything is processed inside the EU, the transcription provider is opted out of training on your data, and its own retention is set to one day, the shortest it offers.",
  },
  {
    q: "How long can a video be?",
    a: "Up to ten hours per file. If a recording runs longer than that, split it at a pause between sentences and upload the parts separately. You pay per minute of video either way, so splitting a file costs nothing extra.",
  },
  {
    q: "What happens if the transcription fails?",
    a: "You are not charged. The cost is reserved from your balance when the job starts and booked straight back on any failure, including a server problem partway through, so a transcription that does not complete never costs you credits.",
  },
]

const sources = [
  {
    label: "AssemblyAI supported languages",
    url: "https://www.assemblyai.com/docs/getting-started/supported-languages",
  },
  {
    label: `${transcriptionModelName()} benchmarks`,
    url: "https://www.assemblyai.com/benchmarks",
  },
  {
    label: "Artificial Analysis speech-to-text leaderboard",
    url: "https://artificialanalysis.ai/speech-to-text",
  },
]

export default function VideoToTextPage() {
  return (
    <ToolPageTemplate
      category="Workflows"
      slug="video-to-text"
      title="Video to text: transcribe any video file"
      metaDescription={metaDescription}
      publishedAt="2026-08-13"
      updatedAt="2026-08-13"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
      image="https://indxr.ai/docs/screenshots/video-transcript-speakers-light.png"
    >
      <p>
        You have a video file and you want what is said in it. INDXR lets you upload the file and gives
        you the text back: punctuated, split by speaker, and timestamped, so you can read it, search it,
        quote from it, or turn it into subtitles. It costs one credit per minute of video, and a free
        account includes {FREE_TIER.WELCOME_CREDITS} credits so you can run a real file through it before
        spending anything.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          See pricing →
        </Link>
      </div>

      <h2>MP4, MOV, MKV, AVI and more</h2>

      <p>
        A video file is transcribed the same way an audio file is: the audio track is taken out of it for
        you, and the picture is discarded. You do not convert anything first. It works with{" "}
        {UPLOAD_FORMAT_COUNT_WORD} formats in all, audio and video together.
      </p>

      <table>
        <tbody>
          <tr>
            <td>Video formats</td>
            <td>{UPLOAD_VIDEO_LABELS.join(", ")}</td>
          </tr>
          <tr>
            <td>Audio formats</td>
            <td>{UPLOAD_AUDIO_LABELS.join(", ")}</td>
          </tr>
          <tr>
            <td>Maximum file size</td>
            <td>{UPLOAD_MAX_FILE_MB}MB</td>
          </tr>
          <tr>
            <td>Maximum length</td>
            <td>10 hours per file</td>
          </tr>
          <tr>
            <td>Languages</td>
            <td>{TRANSCRIPTION_MODEL.totalLanguages}, detected automatically</td>
          </tr>
        </tbody>
      </table>

      <p>
        MOV is what an iPhone records. MKV is what most downloads arrive as. Both work, along with
        everything else in that list, and you do not tell us which one you have. For what each format
        is and where it comes from, see{" "}
        <Link href="/articles/supported-formats">Supported formats</Link>.
      </p>

      <DocsFigure
        src="/docs/screenshots/video-upload-mp4.png"
        alt="The Upload tab with a video file added: the drop zone shows the MP4 file name and size, ready to transcribe, with the accepted formats and the size limit in view."
        caption="A video file drops into the Upload tab like any other; INDXR takes the audio track out and discards the picture."
      />

      <h2>What you get back</h2>

      <p>
        Three things come out of one transcription, and which one you want depends on why you had the
        video open.
      </p>

      <p>
        <strong>The text.</strong> Punctuated, so it reads as sentences rather than one long block;
        separated by speaker, so you can tell who said what; and timestamped, so you can jump back to the
        moment something was said. You can export it as plain text, with or without timestamps, or as
        Markdown.
      </p>

      <p>
        <strong>The subtitles.</strong> SRT and VTT, rebuilt to broadcast conventions instead of the raw
        caption fragments most tools hand back. Lines are held to 42 characters across at most two lines,
        cues break on sentence boundaries rather than mid-clause, and the speaker names carry through.
      </p>

      <p>
        <strong>The export for machines.</strong> A chunked JSON with metadata and timestamps, shaped for
        a vector database, so a video can become something you query in natural language rather than
        scrub through.
      </p>

      <p>
        The first two cost nothing on top of the transcription. The third, the RAG export, costs{" "}
        {ragPer10Min} credit per ten minutes of video.
      </p>

      <h2>A real example</h2>

      <p>
        Here is a real one. A five-minute clip from a podcast interview, uploaded as a 7.4 MB MP4. It cost
        six credits, came back with two speakers detected and labelled, split into 74 timed passages,
        ready in under half a minute, and the model reported 96.5 per cent confidence.
      </p>

      <DocsFigure
        src="/docs/screenshots/video-transcript-speakers.png"
        alt="A finished transcript of the video: each paragraph opens with a timestamp and a speaker label, Speaker A and Speaker B, followed by their words."
        caption="The transcript reads back punctuated, split into paragraphs with a timestamp each, and labelled by speaker."
      />

      <p>The plain text reads back like this:</p>

      <blockquote>
        <p>
          <strong>Speaker A:</strong> The Joe Rogan Experience. Look, you get out in that world, Joe,
          you&apos;re famous everywhere. You&apos;ve never been to these places, but when you get there,
          they&apos;re gonna know you.
        </p>
      </blockquote>

      <p>Exported as subtitles, the same passage looks like this:</p>

      <DocsCodeBlock>{`2
00:00:02,920 --> 00:00:07,338
Look, you get out in that world, Joe,
you're famous everywhere.`}</DocsCodeBlock>

      <p>
        Two lines, neither over 42 characters, cut where the sentence pauses. That is the standard
        broadcast subtitling works to, and it is the difference between subtitles you can ship and
        subtitles you have to fix.
      </p>

      <DocsFigure
        src="/docs/screenshots/video-subtitles-srt.png"
        alt="An exported SRT subtitle file: numbered cues, each with a start and end timestamp and one or two short lines of text."
        caption="The same transcript exported as SRT: numbered cues, timestamps, and lines rebuilt to subtitle length rather than raw fragments."
      />

      <h2>How it works</h2>

      <p>
        <strong>You upload the file.</strong> A free account is needed and takes a moment, no card
        required, with the {FREE_TIER.WELCOME_CREDITS} credits included. Drag the file into the Upload
        tab, and INDXR reads its length and shows the exact cost before anything starts.
      </p>

      <DocsFigure
        src="/docs/screenshots/video-cost-card.png"
        alt="The cost panel after a video is added: the file name, its length, an AI transcription label, and the total in credits shown before anything starts."
        caption="After you add the file, INDXR reads its length and shows the exact cost before anything starts, at one credit per minute."
      />

      <p>
        <strong>It transcribes while you wait.</strong> A five-minute clip is ready well under a minute,
        an hour of video is usually ready within a few minutes, and two hours within about a quarter of
        an hour. It runs on the server, so closing the tab or losing your connection does not cost you the
        job. Everything is processed on European infrastructure, and the uploaded file is deleted once
        transcription finishes, leaving only the text in your library.
      </p>

      <p>
        <strong>You read, edit and export.</strong> The transcript opens in your library, where you can
        correct it, search it, rename the speakers,{" "}
        <Link href="/articles/youtube-video-summarizer">summarise it</Link> and export it in{" "}
        {spellCount(EXPORT_FORMAT_COUNT)} formats. Renaming a speaker works once and changes every place
        the label appears, in the transcript and in every export you make afterwards.
      </p>

      <h2>When the picture matters more than the words</h2>

      <p>Some things a transcript cannot do, and it is worth being clear about them.</p>

      <p>
        It does not describe what happens on screen. For a screen recording you get what was said about
        the screen, not an account of what was shown on it.
      </p>

      <p>
        It does not read text that appears in the picture. Slides, burned-in captions and on-screen names
        are not picked up, because only the audio is processed.
      </p>

      <p>
        Where people talk over each other the speaker boundaries get less precise, and a word can end up
        attached to the wrong speaker. On clean turn-taking the labelling is reliable; through a stretch
        of crosstalk, expect to fix a few lines.
      </p>

      <h2>How accurate it is</h2>

      <p>
        For clear English speech this is close to the current technical ceiling. AssemblyAI, whose model
        runs behind this, places English in its{" "}
        <a
          href="https://www.assemblyai.com/docs/getting-started/supported-languages"
          target="_blank"
          rel="noopener noreferrer"
        >
          highest accuracy band
        </a>
        , below ten per cent word error rate, and on{" "}
        <a
          href="https://artificialanalysis.ai/speech-to-text"
          target="_blank"
          rel="noopener noreferrer"
        >
          independent benchmarks
        </a>{" "}
        {TRANSCRIPTION_MODEL.displayName} sits in the leading group. The measured example above, where the
        model reported 96.5 per cent, is typical of well-recorded conversation.
      </p>

      <p>
        Accuracy falls where you would expect: strong accents, background noise, technical vocabulary,
        unfamiliar names. It handles these better than the automatic captions video platforms produce, but
        no engine handles them perfectly, and on difficult audio expect to correct a few names.
      </p>

      <p>
        For languages other than English, AssemblyAI publishes a{" "}
        <a
          href="https://www.assemblyai.com/docs/getting-started/supported-languages"
          target="_blank"
          rel="noopener noreferrer"
        >
          per-language accuracy table
        </a>{" "}
        worth checking before committing to a long video. We would rather point you there than quote a
        figure for a language we have not measured.
      </p>

      <h2>What it costs</h2>

      <p>
        One credit per minute of video, rounded up, based on the length detected after upload rather than
        the file size. Prices below are on the {anchor.name} package, which is €{anchor.priceEur} for{" "}
        {anchor.credits.toLocaleString()} credits.
      </p>

      <table>
        <thead>
          <tr>
            <th>Video length</th>
            <th>Credits</th>
            <th>Cost at {anchor.name} pricing</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>5 minutes</td><td>5 credits</td><td>{creditCostEur(5)}</td></tr>
          <tr><td>30 minutes</td><td>30 credits</td><td>{creditCostEur(30)}</td></tr>
          <tr><td>1 hour</td><td>60 credits</td><td>{creditCostEur(60)}</td></tr>
          <tr><td>2 hours</td><td>120 credits</td><td>{creditCostEur(120)}</td></tr>
        </tbody>
      </table>

      <p>
        There is no subscription, and credits never expire. If you have one video this year, you pay for
        one video this year; credits bought in one month are still there the next, and no charge arrives
        in a month you did not use the site.
      </p>

      <h2>Try it on your own file</h2>

      <p>
        The only way to judge a transcription service is to run something through it that you care about. A
        free account includes {FREE_TIER.WELCOME_CREDITS} credits, enough for {FREE_TIER.WELCOME_CREDITS}{" "}
        minutes of video, with no subscription and no card. If the result is not good enough, you have
        lost nothing.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          See pricing →
        </Link>
      </div>
    </ToolPageTemplate>
  )
}
