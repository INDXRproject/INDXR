import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsTable } from "@/components/docs/DocsTable"
import {
  UPLOAD_MAX_FILE_MB,
  UPLOAD_FORMAT_COUNT_WORD,
  UPLOAD_AUDIO_LABELS,
  UPLOAD_VIDEO_LABELS,
} from "@indxr/shared/lib/uploadFormats"
import {
  EXPORT_FORMAT_COUNT,
  EXPORT_MENU,
  exportFormatsProse,
  spellCount,
} from "@indxr/shared/lib/exportFormats"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { CREDIT_COSTS, creditCostEur, getAnchorPackage, FREE_TIER } from "@indxr/shared/lib/pricing"
import { transcriptionModelName, TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"

const anchor = getAnchorPackage()
const ragPer10Min = CREDIT_COSTS.RAG_JSON_PER_10MIN

const metaDescription =
  `Upload an audio or video file and get the full text back, punctuated, split by speaker and timestamped. ` +
  `Runs on ${transcriptionModelName()} across 99 languages at one credit per minute; a free account includes ${FREE_TIER.WELCOME_CREDITS} credits.`

export const metadata: Metadata = {
  alternates: { canonical: "/articles/audio-to-text" },
  title: "Audio to Text — Transcribe Audio Files to Text | INDXR.AI",
  description: metaDescription,
  ...editorialOg("audio-to-text"),
}

const faqs = [
  {
    q: "Is my recording used to train AI models?",
    a: "No. The file you upload is deleted on our side as soon as the transcription finishes, and only the transcript text stays in your library. Our transcription provider, AssemblyAI, does not use your audio to train its models, because we have opted out of its model-improvement programme, and its own data retention is set to one day, the shortest period it offers. Everything is processed inside the EU.",
  },
  {
    q: "What happens if the transcription fails?",
    a: "Your credits are refunded in full. The cost is reserved from your balance when the job starts, and it is booked straight back on any failure, including when the server goes down in the middle of the job, so a transcription that does not complete never costs you anything.",
  },
  {
    q: "What if I run out of credits partway through a file?",
    a: "It cannot happen. The full cost of the file is reserved before transcription begins, based on the duration we detect, so a job you cannot fully afford is declined up front rather than started and stranded halfway. You are never left with a half-finished transcript and an empty balance.",
  },
  {
    q: "Can I upload a recording of a meeting or a phone call?",
    a: "Technically yes, any audio file works. Bear in mind that recording a conversation legally requires the consent of the people taking part in many countries, and making sure you have that consent is your responsibility, not something the tool can check for you.",
  },
  {
    q: "Why are names and technical terms transcribed wrong, and what can I do about it?",
    a: "Proper names and specialist jargon are the known weak spot of every speech model, because it works from sound and cannot guess a spelling it has never met. The practical fix is to correct it once in the editor: every export you make afterwards carries the correction, and when there are several speakers you rename a speaker label once and it updates everywhere it appears.",
  },
  {
    q: "Does it work when people talk over each other?",
    a: "Partly. The model detects who is speaking and labels each speaker, but where voices overlap the boundaries get less precise and a word can end up attached to the wrong speaker. On clean turn-taking the labelling is reliable; through a stretch of crosstalk, expect to fix a few lines.",
  },
  {
    q: "How do I split a file that is too large?",
    a: `This is rarely necessary: at ${UPLOAD_MAX_FILE_MB}MB a single file already holds hours of speech. If you do have a recording that large, what matters is not which program you use but where you cut it. Cut at a pause between sentences rather than in the middle of one, because a word split across the seam can be lost. Any everyday audio editor can trim a recording into parts and export each one. Sending them separately costs nothing extra, because you pay per minute of audio, not per file.`,
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
  {
    label: "A Closer Look, Subscription Cancellation Customer Experience Study (2024)",
    url: "https://a-closer-look.com/market-research/subscription-cancellation-customer-experience-study/",
  },
]

export default function AudioToTextPage() {
  return (
    <ToolPageTemplate
      category="Workflows"
      slug="audio-to-text"
      title="Audio to text: transcribe any audio file"
      metaDescription={metaDescription}
      publishedAt="2026-04-16"
      updatedAt="2026-08-09"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
      image="https://indxr.ai/docs/screenshots/transcript-speakers-light.png"
    >
      <p>
        You have an audio file or recording and you want the words in it. INDXR lets you upload the file
        and gives you the full text back: punctuated, so it reads as sentences instead of one long
        block; split by speaker, so you can tell who said what; and timestamped, so you can jump back to
        the moment something was said. It costs one credit per minute of audio, and a free account
        includes {FREE_TIER.WELCOME_CREDITS} credits, enough for {FREE_TIER.WELCOME_CREDITS} minutes, so
        you can transcribe a real recording before spending anything.
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

      <h2>How it works</h2>

      <p>
        <strong>You upload the file.</strong> A free account is needed and takes a moment, no card
        required, with the {FREE_TIER.WELCOME_CREDITS} credits included. Audio and video files both
        work, up to {UPLOAD_MAX_FILE_MB}MB and up to ten hours, and for a video the audio track is taken
        out for you. You do not pick a language, because the model detects it from the audio.
      </p>

      <p>
        <strong>It transcribes while you wait.</strong> An hour of audio is usually ready within a few
        minutes, and two hours within about a quarter of an hour; a long recording or a busy moment can
        stretch that. It runs on the server, so closing the tab or losing your connection does not cost
        you the job. Everything is processed on European infrastructure, and the uploaded file is
        deleted once transcription finishes.
      </p>

      <p>
        <strong>You read, edit and export.</strong> The transcript opens in your library, where you can
        correct it, search it, summarise it and export it in {spellCount(EXPORT_FORMAT_COUNT)} formats.
      </p>

      <DocsFigure
        src="/docs/screenshots/cost-card-ai.png"
        alt="INDXR's cost panel after a file is added: the recording's title, its length of 54:56, an AI transcription label, and a total of 55 credits shown before you start, with the balance left afterwards."
        caption="After you add a file, INDXR reads its length and shows the exact cost before anything starts: one credit per minute, here 55 for a recording just under an hour."
      />

      <h2>What the transcript looks like</h2>

      <p>
        Two things determine whether a transcript is usable: how many words are correct, and how the
        text is structured. Both matter, and most tools only address the first. Word accuracy is
        covered in the next section; the structure works as follows.
      </p>

      <p>
        Transcripts come back punctuated, with sentence boundaries the model determined rather than
        one continuous block of lowercase text. Speakers are detected and labelled, and you can
        rename them: change Speaker A to the interviewer&apos;s name once and every occurrence
        updates, in the transcript and in every export, with the original label always recoverable.
        Text is grouped into paragraphs for reading, each with a timestamp marking where that passage
        begins. Exports that include timestamps go down to the individual segment, a few seconds at a
        time.
      </p>

      <DocsFigure
        src="/docs/screenshots/transcript-speakers.png"
        alt="A finished transcript where each paragraph opens with a timestamp and a bold speaker name, here Sarah Chen and Dr. Miguel Ferro, followed by their words."
        caption="A finished transcript reads back with punctuation, a timestamp per paragraph, and speaker labels you rename once to update everywhere."
      />

      <p>
        What you notice first is that it reads. Sentences with punctuation, grouped into paragraphs,
        are something you can skim and quote straight away, rather than a wall of lowercase you have to
        repair before it is any use, which spares you the cleaning up that other tools leave you to do.
        The same structure quietly pays off later: it lets a subtitle export break lines where a
        sentence ends instead of mid-clause, lets a chunked export for a vector database cut on complete
        thoughts, and lets the speaker labels make an interview quotable without listening back to work
        out who said what.
      </p>

      <h2>How accurate it is</h2>

      <p>
        English transcription accuracy here is close to the current technical ceiling. AssemblyAI
        places English in its{" "}
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
        {TRANSCRIPTION_MODEL.displayName} posts an English word error rate in the low single digits.
        The top of that field has converged: on clean audio the best few models are within a
        percentage point or two of one another.
      </p>

      <p>
        Accuracy falls where you would expect: strong accents, overlapping speakers, background
        noise, technical vocabulary, unfamiliar names. It handles these better than the automatic
        captions produced by video platforms, but no engine handles them perfectly, and on difficult
        audio expect to correct a few names.
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
        worth checking before committing to a long recording. We would rather point you there than
        quote a figure for a language we have not measured.
      </p>

      <h2>What you can upload</h2>

      <p>
        Audio or video, in {UPLOAD_FORMAT_COUNT_WORD} formats. A video file is transcribed exactly like
        an audio one: the audio track is taken from it for you, so an MP4 or a MOV is as welcome here as
        an MP3.
      </p>

      <table>
        <tbody>
          <tr>
            <td>Audio formats</td>
            <td>{UPLOAD_AUDIO_LABELS.join(", ")}</td>
          </tr>
          <tr>
            <td>Video formats</td>
            <td>{UPLOAD_VIDEO_LABELS.join(", ")}</td>
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
            <td>99, detected automatically</td>
          </tr>
        </tbody>
      </table>

      <p>
        The {UPLOAD_MAX_FILE_MB}MB limit is worth noting against free browser tools, which commonly
        stop at 50 or 100MB. A single uncompressed hour of audio exceeds that on its own.
      </p>

      <h2>What you can do with the transcript</h2>

      <p>
        Because the transcript is stored rather than downloaded once, you can come back to the same
        recording and get something different out of it later.
      </p>

      <DocsFigure
        src="/docs/screenshots/library-list.png"
        alt="The library list: rows of saved transcripts, each with its title, how it was made, its duration and date, and all of them openable again."
        caption="Every transcript stays in your library. A free converter hands you one download; here you keep an archive you can reopen, search and re-export."
      />

      <p>
        Take a two-hour interview transcribed in March. That month you export plain text and write
        your piece. In June a quote is questioned, so you search the transcript for the phrase, jump
        to the timestamp and check what was actually said. In September you want a clip subtitled, so
        you export SRT and the lines come back rebuilt to a maximum of 42 characters across at most
        two lines, with cues breaking on sentence boundaries where they can and on word boundaries
        otherwise, never mid-word. Nothing was re-uploaded and none of it cost extra.
      </p>

      <p>
        You can correct the text without losing the original, because edits are stored separately and
        the untouched version stays one click away.
      </p>

      <p>
        You can have the recording{" "}
        <Link href="/articles/youtube-video-summarizer">summarised</Link>. The summary reads the whole
        thing, splits it into
        chapters where the subject changes, and writes worked-out notes under each one, with a
        timestamp per chapter that jumps the player to that moment. A four-hour recording produces a
        four-hour summary rather than the three paragraphs a fifteen-minute one would give you, so a
        long lecture becomes an outline you can revise from and a long interview becomes something
        you can navigate.
      </p>

      <p>
        You can export in {spellCount(EXPORT_FORMAT_COUNT)} formats, and everything is free except
        the RAG export, which chunks the transcript with metadata for LangChain, LlamaIndex, Pinecone
        and similar tools.
      </p>

      <DocsTable>
        <thead>
          <tr>
            <th>Group</th>
            <th>Download</th>
            <th>Contents</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {EXPORT_MENU.map((item) => (
            <tr key={item.id}>
              <td>{item.group}</td>
              <td className="whitespace-nowrap font-medium text-[var(--fg)]">{item.label}</td>
              <td>{item.sub}</td>
              <td className="whitespace-nowrap">
                {item.paid ? `${ragPer10Min} credit / 10 min` : "Free"}
              </td>
            </tr>
          ))}
        </tbody>
      </DocsTable>

      <h2>What it costs</h2>

      <p>
        One credit per minute of audio, rounded up, based on the duration detected after upload
        rather than the file size. Prices below are on the {anchor.name} package, which is €
        {anchor.priceEur} for {anchor.credits.toLocaleString()} credits.
      </p>

      <table>
        <thead>
          <tr>
            <th>Audio length</th>
            <th>Credits</th>
            <th>Cost at {anchor.name} pricing</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Under 1 minute</td><td>1 credit</td><td>{creditCostEur(1)}</td></tr>
          <tr><td>10 minutes</td><td>10 credits</td><td>{creditCostEur(10)}</td></tr>
          <tr><td>30 minutes</td><td>30 credits</td><td>{creditCostEur(30)}</td></tr>
          <tr><td>1 hour</td><td>60 credits</td><td>{creditCostEur(60)}</td></tr>
          <tr><td>2 hours</td><td>120 credits</td><td>{creditCostEur(120)}</td></tr>
        </tbody>
      </table>

      <p>
        There is no subscription, and credits never expire. If you have one recording this year, you
        pay for one recording this year; credits bought in April are still there in October, and no
        charge arrives in a month you did not use the site.
      </p>

      <p>
        Most transcription services sell a monthly plan instead.{" "}
        <a
          href="https://a-closer-look.com/market-research/subscription-cancellation-customer-experience-study/"
          target="_blank"
          rel="noopener noreferrer"
        >
          One 2024 survey
        </a>{" "}
        found that six in ten people had avoided subscribing to a service because they expected
        cancelling to be difficult. Here there is nothing to cancel, because nothing recurs.
      </p>

      <h2>Why not use a free converter</h2>

      <p>
        Free converters are everywhere, and for some jobs they are the right choice: one short
        recording, wording that does not have to be exact, nothing you will need again. Use one and
        think no further about it. What you trade, when the result does matter, is quality and headroom.
        A free service has to keep its own costs down, which generally means a lighter transcription
        model and tighter limits on length and file size. That is a fair deal when the words are
        throwaway, and an expensive one in your own time the moment you have to clean up the result or
        cut a file down to fit.
      </p>

      <p>
        So it is worth saying what runs here. Your file is transcribed by {transcriptionModelName()},
        processed inside the EU, never used to train an AI model, and kept by the transcription provider
        for one day at most, its shortest setting. We would rather tell you that than leave you to guess.
      </p>

      <p>Where they fall short is clearest side by side.</p>

      <DocsTable>
        <thead>
          <tr>
            <th></th>
            <th>A free converter</th>
            <th>INDXR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium text-[var(--fg)]">Output</td>
            <td>Usually raw words: little punctuation, no paragraphs, no speaker labels</td>
            <td>Punctuated, split into paragraphs, speaker-labelled and timestamped</td>
          </tr>
          <tr>
            <td className="font-medium text-[var(--fg)]">After you download</td>
            <td>One file, then it is gone</td>
            <td>Kept in your library to search and re-export</td>
          </tr>
          <tr>
            <td className="font-medium text-[var(--fg)]">Speaker labels</td>
            <td>None</td>
            <td>Detected, and renameable once for the whole transcript</td>
          </tr>
          <tr>
            <td className="font-medium text-[var(--fg)]">Export formats</td>
            <td>Usually one, plain text</td>
            <td>{spellCount(EXPORT_FORMAT_COUNT)}: {exportFormatsProse("and")}</td>
          </tr>
          <tr>
            <td className="font-medium text-[var(--fg)]">File size limit</td>
            <td>Often 50 to 100 MB</td>
            <td>{UPLOAD_MAX_FILE_MB} MB</td>
          </tr>
          <tr>
            <td className="font-medium text-[var(--fg)]">Where it is processed</td>
            <td>Usually unstated</td>
            <td>The EU, and never used to train a model</td>
          </tr>
        </tbody>
      </DocsTable>

      <h2>Try it on your own recording</h2>

      <p>
        The only reliable way to judge a transcription service is to run something through it that you
        care about. A free account includes {FREE_TIER.WELCOME_CREDITS} credits, covering{" "}
        {FREE_TIER.WELCOME_CREDITS} minutes of audio, with no subscription and no card. If the result
        is not good enough, you have lost nothing. If it is, the credits you buy afterwards do not
        expire.
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
