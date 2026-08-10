import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsTable } from "@/components/docs/DocsTable"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
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
    q: "How long does a two-hour file actually take?",
    a: "Roughly the upload time plus the transcription time, and nothing after that. The file uploads from your device, then transcribes on the server: an hour of audio is usually ready within a few minutes, and two hours within about a quarter of an hour. A long recording or a busy moment can stretch that, and it keeps running on our servers so you can close the tab. There is no download step to wait for, because you supplied the file yourself; that wait only applies to YouTube videos, which we have to fetch first.",
  },
  {
    q: "Does it work when people talk over each other?",
    a: "Partly. The model detects who is speaking and labels each speaker, but where voices overlap the boundaries get less precise and a word can end up attached to the wrong speaker. On clean turn-taking the labelling is reliable; through a stretch of crosstalk, expect to fix a few lines.",
  },
  {
    q: "How do I split a file that is too large?",
    a: (
      <>
        Any everyday audio app can do it: open the recording, cut it into parts and export each one,
        choosing a quiet moment to cut rather than the middle of a sentence, since a word split
        across the seam can be lost. Most people never need a terminal for this. If you do work on
        the command line, FFmpeg splits on the hour in a single line:
        <DocsCodeBlock>ffmpeg -i large_file.mp3 -t 3600 part1.mp3 -ss 3600 part2.mp3</DocsCodeBlock>
        Either way the cost is the same, because you pay per minute of audio and not per file. Upload
        each part separately.
      </>
    ),
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
        Upload an audio or video file and get the full text back, punctuated, split by speaker and
        timestamped. It runs on {transcriptionModelName()} across 99 languages and costs one credit
        per minute of audio.{" "}
        <Link href="/signup">A free account</Link> includes {FREE_TIER.WELCOME_CREDITS} credits,
        enough for {FREE_TIER.WELCOME_CREDITS} minutes, so you can transcribe a real recording before
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

      <h2>How it works</h2>

      <ol>
        <li>
          <strong>Create a free account.</strong> The transcript is stored in a library for you
          rather than handed over as a single download, which is why an account is needed. The{" "}
          {FREE_TIER.WELCOME_CREDITS} credits are included and no card is required.
        </li>
        <li>
          <strong>Upload your file.</strong> MP3, MP4, WAV, M4A, WEBM, OGG, FLAC, MPEG or MPGA, up to{" "}
          {UPLOAD_MAX_FILE_MB}MB and up to ten hours. Video files work directly; the audio track is
          extracted for you. You do not pick a language, because the model detects it from the audio.
        </li>
        <li>
          <strong>Wait.</strong> An hour of audio is usually ready within a few minutes, and two
          hours within about a quarter of an hour; a long recording or a busy moment can stretch that.
          It runs on the server, so closing the tab or losing your connection does not cost you the job.
          Everything is processed on European infrastructure, and the uploaded file is deleted once
          transcription finishes. Only the text stays in your library.
        </li>
        <li>
          <strong>Read, edit, export.</strong> The transcript opens in your library, where you can
          correct it, search it, summarise it and export it in {spellCount(EXPORT_FORMAT_COUNT)}{" "}
          formats.
        </li>
      </ol>

      <DocsFigure
        src="/docs/screenshots/uploader-empty.png"
        alt="The INDXR upload screen: a dashed drop area labelled to upload an audio file, with the accepted formats and the file size limit listed underneath."
        caption="Step two: drop in an audio or video file. The accepted formats and the size limit are shown on the upload screen itself."
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
        That structure does practical work. Punctuation lets subtitle export break lines where a
        sentence ends instead of mid-clause. It lets a chunked export for a vector database cut on
        complete thoughts. Speaker labels make an interview quotable without listening back to work
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

      <table>
        <tbody>
          <tr>
            <td>Audio formats</td>
            <td>MP3, WAV, M4A, OGG, FLAC, MPGA</td>
          </tr>
          <tr>
            <td>Video formats</td>
            <td>MP4, WEBM, MPEG</td>
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
        You can have the recording summarised. The summary reads the whole thing, splits it into
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

      <p>There is no subscription and credits never expire.</p>

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
        cancelling to be difficult, and the same survey found that four in ten who did subscribe could
        not find the cancellation information and three in ten had to contact customer service to get
        out. Signing up is designed to take thirty seconds. Leaving is not designed that way at all.
      </p>

      <p>
        If you have one recording this year, you pay for one recording this year. Credits bought in
        April are still there in October. No charge arrives in a month you did not use the site, and
        there is no cancellation to remember because nothing recurs.
      </p>

      <h2>Why not use a free converter</h2>

      <p>
        Free converters are everywhere and for some jobs they are the right choice. One short
        recording, wording that does not have to be exact, nothing you will need again: use one and
        think no further about it. For anything you would rather not hand to an unknown service,
        though, note that here the file is processed inside the EU, is never used to train an AI
        model, and is kept by the transcription provider for one day at most, its shortest setting.
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
