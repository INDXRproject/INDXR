import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { UPLOAD_MAX_FILE_MB } from "@indxr/shared/lib/uploadFormats"
import { EXPORT_FORMAT_COUNT, spellCount } from "@indxr/shared/lib/exportFormats"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { creditCostEur, getAnchorPackage, FREE_TIER } from "@indxr/shared/lib/pricing"
import { transcriptionModelName, TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"

const anchor = getAnchorPackage()

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
    q: "How do I convert an audio file to text?",
    a: `Create a free account, upload the file, and the transcript comes back in a few minutes. INDXR runs it through ${transcriptionModelName()}, returns punctuated text split by speaker with timestamps, and stores it in your library to read, edit and export. It costs one credit per minute of audio.`,
  },
  {
    q: "Can I convert audio to text for free?",
    a: `Yes, up to a point. A free account includes ${FREE_TIER.WELCOME_CREDITS} credits, which covers ${FREE_TIER.WELCOME_CREDITS} minutes of audio at one credit per minute, with no card required. After that, credits are pay as you go and never expire.`,
  },
  {
    q: "Does it work with video files?",
    a: "Yes. MP4, WEBM and MPEG video files work directly, and the audio track is extracted for you, so you do not need to convert the video first.",
  },
  {
    q: "How long can a recording be?",
    a: `Up to ten hours per file, and up to ${UPLOAD_MAX_FILE_MB}MB. Anything longer than ten hours is rejected before any credit is charged, so split it first.`,
  },
  {
    q: "How do I split a file that is too large?",
    a: (
      <>
        Use FFmpeg.{" "}
        <code>ffmpeg -i large_file.mp3 -t 3600 part1.mp3 -ss 3600 part2.mp3</code> writes the first
        hour to part1.mp3 and everything after it to part2.mp3, then you upload each part separately.
      </>
    ),
  },
  {
    q: "What happens to my file after transcription?",
    a: "It is deleted. The upload is processed on European infrastructure and removed once transcription finishes. Only the transcript text stays in your library.",
  },
  {
    q: "Can I edit the transcript?",
    a: "Yes. You can correct the text in the library, and edits are stored separately from the original, so the untouched version is always one click away.",
  },
  {
    q: "Which languages are supported?",
    a: "99 languages, detected automatically from the audio, so you do not choose one. Accuracy varies by language, and AssemblyAI publishes a per-language table worth checking before a long recording.",
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
    label: "DealHub, subscription fatigue (citing A Closer Look research)",
    url: "https://dealhub.io/glossary/subscription-fatigue/",
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
    >
      <p>
        Upload an audio or video file and get the full text back, punctuated, split by speaker and
        timestamped. It runs on {transcriptionModelName()} across 99 languages and costs one credit
        per minute of audio.{" "}
        <Link href="/signup">A free account</Link> includes {FREE_TIER.WELCOME_CREDITS} credits,
        enough for {FREE_TIER.WELCOME_CREDITS} minutes, so you can transcribe a real recording before
        spending anything.
      </p>

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
          <strong>Wait.</strong> Processing takes roughly one minute per ten minutes of audio and
          runs on the server, so closing the tab or losing your connection does not cost you the job.
          Everything is processed on European infrastructure, and the uploaded file is deleted once
          transcription finishes. Only the text stays in your library.
        </li>
        <li>
          <strong>Read, edit, export.</strong> The transcript opens in your library, where you can
          correct it, search it, summarise it and export it in {spellCount(EXPORT_FORMAT_COUNT)}{" "}
          formats.
        </li>
      </ol>

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

      <p>
        That structure does practical work. Punctuation lets subtitle export break lines where a
        sentence ends instead of mid-clause. It lets a chunked export for a vector database cut on
        complete thoughts. Speaker labels make an interview quotable without listening back to work
        out who said what.
      </p>

      <h2>How accurate it is</h2>

      <p>
        English transcription accuracy here is close to the current technical ceiling. AssemblyAI
        places English in their highest accuracy band, below ten per cent word error rate, and on
        independent benchmarks {TRANSCRIPTION_MODEL.displayName} posts an English word error rate in
        the low single digits. The top of that field has converged: on clean audio the best few
        models are within a percentage point or two of one another.
      </p>

      <p>
        Accuracy falls where you would expect: strong accents, overlapping speakers, background
        noise, technical vocabulary, unfamiliar names. It handles these better than the automatic
        captions produced by video platforms, but no engine handles them perfectly, and on difficult
        audio expect to correct a few names.
      </p>

      <p>
        For languages other than English, AssemblyAI publishes accuracy per language, and that table
        is the place to check before committing to a long recording. We would rather point you there
        than quote a figure for a language we have not measured.
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

      <p>
        Take a two-hour interview transcribed in March. That month you export plain text and write
        your piece. In June a quote is questioned, so you search the transcript for the phrase, jump
        to the timestamp and check what was actually said. In September you want a clip subtitled, so
        you export SRT and the lines come back rebuilt to a maximum of 42 characters across at most
        two lines, with cues breaking on sentences, which is how professional subtitling is done.
        Nothing was re-uploaded and none of it cost extra.
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
        You can export in {spellCount(EXPORT_FORMAT_COUNT)} formats: plain text with or without
        timestamps, Markdown with or without timestamps and always with YAML frontmatter for note
        apps, SRT, VTT, CSV and JSON. A RAG export chunks the transcript with metadata for LangChain,
        LlamaIndex, Pinecone and similar tools.
      </p>

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
        Most transcription services sell a monthly plan instead. Surveys on subscription cancellation
        consistently find the same pattern: around six in ten people have avoided subscribing to a
        service because they expected cancelling to be difficult, four in ten who did subscribe could
        not find the cancellation information when they looked for it, and roughly two thirds have at
        some point been billed for a trial they meant to cancel. Signing up is designed to take
        thirty seconds. Leaving is not designed that way at all.
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
        think no further about it.
      </p>

      <p>There are three limits worth knowing before you decide.</p>

      <p>
        <strong>The output needs work.</strong> Most free tools return words and stop, without
        reliable punctuation, without paragraphing, without speaker labels, and with timestamps
        either absent or attached to fragments. The words can be broadly correct and the file still
        costs half an hour of tidying, and the longer the recording the wider that gap gets.
      </p>

      <p>
        <strong>You only get it once.</strong> A free tool gives you a download and that is all it
        gives you. There is nothing to search later, no second export in a different format, no way
        to correct a name and keep the correction.
      </p>

      <p>
        <strong>Size and length.</strong> Most stop below the length of a single podcast episode or
        lecture.
      </p>

      <h2>Try it on your own recording</h2>

      <p>
        The only reliable way to judge a transcription service is to run something through it that you
        care about. A free account includes {FREE_TIER.WELCOME_CREDITS} credits, covering{" "}
        {FREE_TIER.WELCOME_CREDITS} minutes of audio, with no subscription and no card. If the result
        is not good enough, you have lost nothing. If it is, the credits you buy afterwards do not
        expire.
      </p>

      <p>
        <Link href="/signup">Create a free account</Link>
      </p>
      <p>
        <Link href="/pricing">See pricing</Link>
      </p>
    </ToolPageTemplate>
  )
}
