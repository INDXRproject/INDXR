import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsTable } from "@/components/docs/DocsTable"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { AskYourLibrary } from "@/components/docs/AskYourLibrary"
import {
  UPLOAD_MAX_FILE_MB,
  UPLOAD_FORMAT_COUNT_WORD,
  UPLOAD_AUDIO_LABELS,
  UPLOAD_VIDEO_LABELS,
  uploadFormatsProse,
} from "@indxr/shared/lib/uploadFormats"
import {
  EXPORT_FORMAT_COUNT,
  EXPORT_MENU,
  exportFormatsProse,
  spellCount,
} from "@indxr/shared/lib/exportFormats"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { SUBTITLE_MAX_LINE, SUBTITLE_MAX_LINES } from "@indxr/shared/lib/subtitleConfig"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { CREDIT_COSTS, creditCostEur, getAnchorPackage, FREE_TIER } from "@indxr/shared/lib/pricing"
import { transcriptionModelName, TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"

// 2026-11-09: video-to-text and supported-formats were merged into this page (308s in next.config.ts).
// Their unique content lives below: the video section with the measured podcast-clip example and the
// on-screen limits (from video-to-text), and the per-format notes (from supported-formats).

const anchor = getAnchorPackage()
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const ragPer10Min = CREDIT_COSTS.RAG_JSON_PER_10MIN
const welcome = FREE_TIER.WELCOME_CREDITS
const welcomeMinutes = welcome / perMin

// 155-char budget (Ahrefs crawl 2026-10-27). Keyword first.
const metaDescription =
  `Turn interviews, lectures and podcasts into transcripts you keep, search and quote by timestamp. ${perMin} credit per minute; a free account includes ${welcome} credits.`

export const metadata: Metadata = {
  alternates: { canonical: "/articles/audio-to-text" },
  title: "Audio to Text — Transcribe Interviews, Lectures & Podcasts | INDXR.AI",
  description: metaDescription,
  ...editorialOg("audio-to-text"),
}

const faqs = [
  {
    q: "Is my recording used to train AI models?",
    a: "No. The file you upload is deleted on our side as soon as the transcription finishes, and only the transcript text stays in your library. Our transcription provider, AssemblyAI, does not use your audio to train its models, because we have opted out of its model-improvement programme, and its own data retention is set to one day, the shortest period it offers. Everything is processed inside the EU.",
  },
  {
    q: "Can I convert an MP4 or a MOV to text?",
    a: `Yes. INDXR takes the audio track out of the video for you, so you upload the file as it is. MKV, MOV, AVI and the other video formats work the same way, up to ${UPLOAD_MAX_FILE_MB}MB per file.`,
  },
  {
    q: "What happens if the transcription fails?",
    a: "Your credits are refunded in full. The cost is reserved from your balance when the job starts, and it is booked straight back on any failure, including when the server goes down in the middle of the job, so a transcription that does not complete never costs you anything.",
  },
  {
    q: "What if I run out of credits partway through a file?",
    a: "It cannot happen. The full cost of the file is reserved before transcription begins, based on the duration we detect, so a job you cannot fully afford is declined up front rather than started and stranded halfway.",
  },
  {
    q: "Can I upload a recording of a meeting or a phone call?",
    a: "Technically yes, any audio file works. Bear in mind that recording a conversation legally requires the consent of the people taking part in many countries, and making sure you have that consent is your responsibility, not something the tool can check for you.",
  },
  {
    q: "Why are names and technical terms transcribed wrong, and what can I do about it?",
    a: "Proper names and specialist jargon are the known weak spot of every speech model, because it works from sound and cannot guess a spelling it has never met. Correct it once in the editor: every export you make afterwards carries the correction, and when there are several speakers you rename a speaker label once and it updates everywhere it appears.",
  },
  {
    q: "Does it work when people talk over each other?",
    a: "Partly. The model detects who is speaking and labels each speaker, but where voices overlap the boundaries get less precise and a word can end up attached to the wrong speaker. On clean turn-taking the labelling is reliable; through a stretch of crosstalk, expect to fix a few lines.",
  },
  {
    q: "How do I split a file that is too large or too long?",
    a: `Cut it at a pause between sentences rather than in the middle of one, because a word split across the seam can be lost. Any everyday audio editor can do this. Sending the parts separately costs nothing extra, because you pay per minute of audio, not per file. The limits are ${UPLOAD_MAX_FILE_MB}MB and ${MAX_TRANSCRIPTION_HOURS} hours per file.`,
  },
]

const sources = [
  { label: "AssemblyAI supported languages", url: "https://www.assemblyai.com/docs/getting-started/supported-languages" },
  { label: `${transcriptionModelName()} benchmarks`, url: "https://www.assemblyai.com/benchmarks" },
  { label: "Artificial Analysis speech-to-text leaderboard", url: "https://artificialanalysis.ai/speech-to-text" },
  { label: "RFC 6716 — Definition of the Opus Audio Codec", url: "https://datatracker.ietf.org/doc/html/rfc6716" },
  { label: "Matroska — the MKV container", url: "https://www.matroska.org/" },
  {
    label: "A Closer Look, Subscription Cancellation Customer Experience Study (2024)",
    url: "https://a-closer-look.com/market-research/subscription-cancellation-customer-experience-study/",
  },
]

function Ctas() {
  return (
    <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <Link href="/signup">
        <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
          Create a free account
        </button>
      </Link>
      <Link href="/transcribe" className="text-sm font-medium text-[var(--link)] underline-offset-2 hover:underline">
        Or try the free tool first →
      </Link>
    </div>
  )
}

export default function AudioToTextPage() {
  return (
    <ToolPageTemplate
      category="Workflows"
      slug="audio-to-text"
      title="Audio to text: interviews, lectures and podcasts you can search and quote"
      metaDescription={metaDescription}
      publishedAt="2026-04-16"
      updatedAt="2026-11-09"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
      image="https://indxr.ai/docs/screenshots/transcript-speakers-light.png"
    >
      <p>
        You recorded an interview, sat through a lecture, or have a podcast episode you need to work from.
        Upload the file and INDXR gives you the full text back: punctuated, split by speaker, with a
        timestamp on every paragraph. The transcript stays in your library with its source, so you can
        search it later, check a quote against the exact moment in the recording, and ask Claude or
        ChatGPT about it.
      </p>

      <p>
        It costs {perMin} credit per minute of audio. A free account includes {welcome} credits, enough
        for {welcomeMinutes} minutes, so you can run a real recording through it before you pay anything.
        There is no subscription, and credits never expire.
      </p>

      <Ctas />

      <h2>Who it is for</h2>

      <p>
        <strong>Interviews.</strong> A journalist, a researcher or a writer with a stack of recorded
        conversations. You rename the speakers once, find every place someone said a thing, and check the
        wording against the recording before you quote it. There is a full walkthrough in{" "}
        <Link href="/articles/transcribe-interviews-journalism">transcribing interviews</Link>.
      </p>

      <p>
        <strong>Lectures.</strong> A student with recorded classes, or a course you downloaded. Put the
        lectures in one collection and search the whole course for a term, or have an assistant write
        study notes with a reference per section.
      </p>

      <p>
        <strong>Podcasts.</strong> An episode you want to cite, or your own show you want in writing. Long
        files are fine: up to {MAX_TRANSCRIPTION_HOURS} hours each.
      </p>

      <h2>How it works</h2>

      <p>
        <strong>You upload the file.</strong> Uploading needs a free account, no card required. Audio and
        video both work, up to {UPLOAD_MAX_FILE_MB}MB and {MAX_TRANSCRIPTION_HOURS} hours per file. You do
        not pick a language: the model detects it from the audio.
      </p>

      <p>
        <strong>It transcribes while you wait.</strong> An hour of audio is usually ready within a few
        minutes, two hours within about a quarter of an hour. It runs on the server, so closing the tab
        does not cost you the job. Everything is processed on European infrastructure, and the uploaded
        file is deleted once transcription finishes.
      </p>

      <p>
        <strong>It lands in your library.</strong> There you can correct it, search it, put it in a
        collection, summarise it, export it in {spellCount(EXPORT_FORMAT_COUNT)} formats, or let Claude or
        ChatGPT read it.
      </p>

      <DocsFigure
        src="/docs/screenshots/cost-card-ai.png"
        alt="INDXR's cost panel after a file is added: the recording's title, its length of 54:56, an AI transcription label, and a total of 55 credits shown before you start, with the balance left afterwards."
        caption="After you add a file, INDXR reads its length and shows the exact cost before anything starts: one credit per minute, here 55 for a recording just under an hour."
      />

      <h2>What the transcript looks like</h2>

      <p>
        Transcripts come back punctuated, with sentence boundaries the model found, rather than one long
        block of lowercase text. Speakers are detected and labelled, and you can rename them: change
        Speaker A to the interviewer&apos;s name once and every occurrence updates, in the transcript and
        in every export, with the original label always recoverable. Text is grouped into paragraphs, each
        with a timestamp for where that passage begins.
      </p>

      <DocsFigure
        src="/docs/screenshots/transcript-speakers.png"
        alt="A finished transcript where each paragraph opens with a timestamp and a bold speaker name, here Sarah Chen and Dr. Miguel Ferro, followed by their words."
        caption="A finished transcript reads back with punctuation, a timestamp per paragraph, and speaker labels you rename once to update everywhere."
      />

      <h2>Check every quote against the recording</h2>

      <p>
        A transcript is a strong draft of what was said, not proof of it. Before a sentence goes into a
        paper or an article, it is worth hearing it once. Because each paragraph carries the moment it
        starts, that takes seconds: search the library for the phrase, open the transcript at that
        paragraph, and play it back from there.
      </p>

      <p>
        Take a two-hour interview transcribed in March. That month you write your piece from it. In June a
        quote is questioned, so you search for the phrase, jump to the timestamp and check what was
        actually said. Nothing was re-uploaded, and none of it cost extra.
      </p>

      <AskYourLibrary lead="Every recording you transcribe is kept in your library, with its source and a citation." />

      <p>
        The assistant searches your transcripts and answers with the passage and the minute it was said, so
        you can check its answer the same way you check your own. More on this in{" "}
        <Link href="/articles/claude-chatgpt-own-sources">using Claude or ChatGPT with your own sources</Link>.
      </p>

      <h2>How accurate it is</h2>

      <p>
        English transcription accuracy here is close to the current technical ceiling. AssemblyAI places
        English in its{" "}
        <a href="https://www.assemblyai.com/docs/getting-started/supported-languages" target="_blank" rel="noopener noreferrer">
          highest accuracy band
        </a>
        , below ten per cent word error rate, and on{" "}
        <a href="https://artificialanalysis.ai/speech-to-text" target="_blank" rel="noopener noreferrer">
          independent benchmarks
        </a>{" "}
        {TRANSCRIPTION_MODEL.displayName} posts an English word error rate in the low single digits.
      </p>

      <p>
        Accuracy falls where you would expect: strong accents, overlapping speakers, background noise,
        technical vocabulary, unfamiliar names. On difficult audio, expect to correct a few names. For
        languages other than English, AssemblyAI publishes a{" "}
        <a href="https://www.assemblyai.com/docs/getting-started/supported-languages" target="_blank" rel="noopener noreferrer">
          per-language accuracy table
        </a>{" "}
        worth checking before you commit a long recording.
      </p>

      <h2>What you can upload</h2>

      <p>
        Audio or video, in {UPLOAD_FORMAT_COUNT_WORD} formats. Upload the file as it reached you: there is
        no conversion step and no question about which container you have.
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
            <td>{MAX_TRANSCRIPTION_HOURS} hours per file</td>
          </tr>
          <tr>
            <td>Languages</td>
            <td>{TRANSCRIPTION_MODEL.totalLanguages}, detected automatically</td>
          </tr>
        </tbody>
      </table>

      <p>Where the common ones come from, and what to know about each:</p>

      <ul>
        <li>
          <strong>M4A</strong> is what the iPhone Voice Memos app records. Upload it as it is; converting it
          to MP3 first only adds a step and loses a little quality.
        </li>
        <li>
          <strong>OPUS</strong> is what WhatsApp exports a voice message as. OGG is the open container Opus
          audio usually travels in. Both upload without renaming.
        </li>
        <li>
          <strong>WAV</strong> is uncompressed, which is why a recorder set to archival quality writes it
          and why the files are big: an hour of stereo WAV at CD quality is roughly 600MB, over the{" "}
          {UPLOAD_MAX_FILE_MB}MB limit. Split it at a pause rather than compressing it.
        </li>
        <li>
          <strong>FLAC</strong> is lossless. It does not transcribe better than a good MP3 of the same
          recording, so upload it because it is the file you have, not for accuracy.
        </li>
        <li>
          <strong>MOV</strong> is what an iPhone camera films; <strong>MKV</strong> is what many downloads
          and archives arrive as; <strong>WEBM</strong> is what a browser writes when it records your
          screen. All upload directly.
        </li>
      </ul>

      <p>
        The full upload flow and its checks are in the <Link href="/docs/guides/uploads">uploads guide</Link>.
      </p>

      <h2>Video files</h2>

      <p>
        A video is transcribed the same way as audio: the audio track is taken out and the picture is
        discarded. That has two consequences worth knowing. The transcript does not describe what happens on
        screen, so a screen recording gives you what was said about the screen. And text that appears in the
        picture, such as slides or burned-in captions, is not read.
      </p>

      <p>
        Here is a measured one. A clip of just over five minutes from a podcast interview, uploaded as a
        7.4MB MP4. It cost six credits, came back with two speakers labelled, split into 74 timed passages,
        ready in under half a minute, and the model reported 96.5 per cent confidence.
      </p>

      <DocsFigure
        src="/docs/screenshots/video-transcript-speakers.png"
        alt="A finished transcript of the video: each paragraph opens with a timestamp and a speaker label, Speaker A and Speaker B, followed by their words."
        caption="The transcript of a video file reads back punctuated, split into paragraphs with a timestamp each, and labelled by speaker."
      />

      <p>
        The same transcript exports as SRT or VTT subtitles, rebuilt to broadcast conventions: at most{" "}
        {SUBTITLE_MAX_LINE} characters per line and {SUBTITLE_MAX_LINES} lines per cue, breaking on
        sentence boundaries where it can:
      </p>

      <DocsCodeBlock>{`2
00:00:02,920 --> 00:00:07,338
Look, you get out in that world, Joe,
you're famous everywhere.`}</DocsCodeBlock>

      <p>
        If subtitles are what you are after, the <Link href="/articles/srt-generator">SRT generator</Link>{" "}
        article covers them in full.
      </p>

      <h2>Common questions about uploading</h2>

      <h3>Which audio and video formats can I upload?</h3>
      <p>
        {uploadFormatsProse("and")}, up to {UPLOAD_MAX_FILE_MB}MB per file. You do not need to convert
        anything first.
      </p>

      <h3>Can I transcribe a voice memo from my iPhone?</h3>
      <p>
        Yes. iPhone voice memos are M4A files, which upload directly. The limits are the same as for any
        file: up to {UPLOAD_MAX_FILE_MB}MB and {MAX_TRANSCRIPTION_HOURS} hours.
      </p>

      <h3>What happens if my file has no speech in parts of it?</h3>
      <p>
        Silence and background noise are skipped in the transcript. You are charged per minute of audio,
        rounded up, so a recording with long pauses costs the same as one without.
      </p>

      <h3>Do I need an account to upload a file?</h3>
      <p>
        Yes, uploads require an account, because transcription runs on credits and the transcript is saved
        to your library. New accounts start with {welcome} credits, so you can transcribe a short recording
        before deciding whether to <Link href="/pricing">buy more</Link>.
      </p>

      <h2>What else you can do with the transcript</h2>

      <p>
        You can correct the text without losing the original: edits are stored separately and the untouched
        version stays one click away.
      </p>

      <p>
        You can have the recording <Link href="/articles/youtube-to-notes">summarised into chapter notes</Link>,
        with a timestamp per chapter that takes you back to that moment.
      </p>

      <DocsFigure
        src="/docs/screenshots/library-list.png"
        alt="The library list: rows of saved transcripts, each with its title, how it was made, its duration and date, and all of them openable again."
        caption="Every transcript stays in your library. A free converter hands you one download; here you keep an archive you can reopen, search and re-export."
      />

      <p>
        And you can export in {spellCount(EXPORT_FORMAT_COUNT)} formats. Everything is free except the RAG
        export, which chunks the transcript with metadata for vector databases.
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
              <td className="whitespace-nowrap">{item.paid ? `${ragPer10Min} credit / 10 min` : "Free"}</td>
            </tr>
          ))}
        </tbody>
      </DocsTable>

      <h2>What it costs</h2>

      <p>
        {perMin} credit per minute of audio, rounded up, based on the duration detected after upload rather
        than the file size. Prices below are on the {anchor.name} package, €{anchor.priceEur} for{" "}
        {anchor.credits.toLocaleString()} credits.
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
          {[1, 10, 30, 60, 120].map((m) => (
            <tr key={m}>
              <td>{m < 60 ? `${m} minute${m === 1 ? "" : "s"}` : `${m / 60} hour${m === 60 ? "" : "s"}`}</td>
              <td>{m * perMin} credit{m * perMin === 1 ? "" : "s"}</td>
              <td>{creditCostEur(m * perMin)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        There is no subscription, and credits never expire. Most transcription services sell a monthly plan
        instead.{" "}
        <a
          href="https://a-closer-look.com/market-research/subscription-cancellation-customer-experience-study/"
          target="_blank"
          rel="noopener noreferrer"
        >
          One 2024 survey
        </a>{" "}
        found that six in ten people had avoided subscribing to a service because they expected cancelling to
        be difficult. Here there is nothing to cancel. If you are weighing this against a subscription tool,
        see <Link href="/alternatives/otter-ai">INDXR vs Otter.ai</Link>.
      </p>

      <h2>Why not use a free converter</h2>

      <p>
        For one short recording whose wording does not have to be exact, a free converter is fine. What you
        trade, when the result does matter, is quality, headroom and the archive. A free service has to keep
        its own costs down, which generally means a lighter model and tighter limits, and it hands you one
        download and forgets it.
      </p>

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
            <td>Kept in your library with its source, searchable, and readable by Claude or ChatGPT</td>
          </tr>
          <tr>
            <td className="font-medium text-[var(--fg)]">Export formats</td>
            <td>Usually one, plain text</td>
            <td>{spellCount(EXPORT_FORMAT_COUNT)}: {exportFormatsProse("and")}</td>
          </tr>
          <tr>
            <td className="font-medium text-[var(--fg)]">File size limit</td>
            <td>Often 50 to 100MB</td>
            <td>{UPLOAD_MAX_FILE_MB}MB</td>
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
        The only reliable way to judge a transcription service is to run something through it that you care
        about. A free account includes {welcome} credits, covering {welcomeMinutes} minutes of audio, with no
        card. If the result is good, the credits you buy afterwards do not expire, and every transcript you
        make stays in your library.
      </p>

      <Ctas />
    </ToolPageTemplate>
  )
}
