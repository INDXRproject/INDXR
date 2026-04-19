import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "YouTube to text — what you actually get | INDXR.AI",
  description:
    "Most tools give you raw caption fragments. INDXR.AI groups them into readable paragraphs. Free for auto-caption videos — six export formats, nine output options.",
}

const faqs = [
  {
    q: "Is this actually free?",
    a: "For videos with auto-generated captions: yes, completely. No account needed to extract and download as TXT. A free account unlocks all export formats, adds 25 credits for AI transcription testing, and gives access to your personal library — one place for all your transcripts and exports, saved and searchable.",
  },
  {
    q: "How is this different from copying YouTube's built-in transcript?",
    a: "YouTube's transcript panel only works when captions exist, only shows text on-screen, and requires manual copying as raw fragments. INDXR.AI groups those same fragments into readable paragraphs, works when captions don't exist via AI transcription, exports in six formats with nine export options, and saves everything to a personal searchable library.",
  },
  {
    q: "Does it work for non-English videos?",
    a: "Auto-caption extraction works for all 67 languages YouTube supports. AI transcription covers 99+ languages with automatic detection — no need to specify the language.",
  },
  {
    q: "Can I convert a whole playlist to text at once?",
    a: (<>Yes. The <Link href="/youtube-playlist-transcript">Playlist tab</Link> processes all selected videos in one job — first three auto-caption videos free, 1 credit per video from video four onward.</>),
  },
  {
    q: "What about YouTube Shorts?",
    a: "Yes — paste the URL the same way as any other video. Shorts use YouTube's standard caption system.",
  },
  {
    q: "How accurate is AI transcription?",
    a: (<>AssemblyAI, which powers INDXR.AI{"'"}s AI transcription, achieves 95%+ accuracy on clean audio. No model is error-free — results vary on challenging audio. For the full breakdown, see the <Link href="/audio-to-text">audio transcription page</Link>.</>),
  },
  {
    q: "What does the plain TXT output look like?",
    a: "A text file with flowing paragraphs — no timestamps, no line numbers. Segments are grouped by natural speech pauses, typically 60 to 90 seconds per paragraph. The result reads like a document rather than a raw caption file.",
  },
]

export default function YouTubeToTextPage() {
  return (
    <ToolPageTemplate
      title="YouTube to text — what you actually get"
      metaDescription="Most tools give you raw caption fragments. INDXR.AI groups them into readable paragraphs. Free for auto-caption videos — six export formats, nine output options."
      publishedAt="2026-04-16"
      updatedAt="2026-04-19"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={[
        { label: "YouTube Help — Auto-generated captions", url: "https://support.google.com/youtube/answer/6373554" },
        { label: "AssemblyAI benchmarks", url: "https://www.assemblyai.com/benchmarks" },
      ]}
    >
      <p>
        Most tools that extract YouTube captions give you exactly what YouTube gives
        you: hundreds of two-second fragments, each on its own line, strung together
        without structure. INDXR.AI takes that same data and groups it into readable
        paragraphs — the way{" you'd"} actually want to read it.
      </p>

      {/* Side-by-side comparison */}
      <div className="flex flex-col md:flex-row gap-4 my-6 text-sm">
        <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            Raw caption output
          </p>
          <pre className="whitespace-pre-wrap font-mono text-[10px] text-[var(--text-muted)] leading-relaxed overflow-y-auto max-h-48">{`your excellencies delegates ladies
and gentlemen as you spend the next
two weeks debating negotiating
persuading and compromising
as you surely must its easy
to forget that ultimately the
emergency climate comes down
to a single number the concentration
of carbon in our atmosphere
the measure that greatly determines
global temperature and the changes
in that one number is the clearest
way to chart our own story`}</pre>
        </div>
        <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            INDXR.AI plain TXT output
          </p>
          <pre className="whitespace-pre-wrap font-mono text-[10px] text-[var(--text-primary)] leading-relaxed overflow-y-auto max-h-48">{`your excellencies delegates ladies and gentlemen as you spend
the next two weeks debating negotiating persuading and
compromising as you surely must its easy to forget that
ultimately the emergency climate comes down to a single number
the concentration of carbon in our atmosphere the measure that
greatly determines global temperature

that number bounced wildly between 180 and 300 and so too did
global temperatures it was a brutal and unpredictable world
at times our ancestors existed only in tiny numbers but just
over 10 000 years ago that number suddenly stabilized`}</pre>
        </div>
      </div>
      <p className="text-sm text-[var(--text-muted)] -mt-2 mb-6">
        Same source video. Left: raw fragments as delivered by YouTube. Right: INDXR.AI groups them into paragraphs based on natural speech pauses.
      </p>

      <h2>What are auto-generated captions?</h2>

      <p>
        When you watch a YouTube video and see subtitles appear automatically, those
        are auto-generated captions. YouTube{"'"}s speech recognition system listens
        to the audio and converts it to text — no human involvement.
      </p>

      <p>
        Most YouTube videos have them. {"They're"} what tools like INDXR.AI extract
        when you paste a URL.
      </p>

      <p>
        The catch: auto-captions are imperfect by design. YouTube itself{" "}
        <a
          href="https://support.google.com/youtube/answer/6373554"
          target="_blank"
          rel="noopener noreferrer"
        >
          warns
        </a>{" "}
        that automatic captions may misrepresent spoken content due to
        mispronunciations, accents, dialects, background noise, slang, overlapping
        speakers, or fast speech. They arrive without punctuation, without
        capitalization, and sometimes with outright errors — especially on technical
        content, names, or anything outside standard spoken language.
      </p>

      <p>
        For a quick read or reference, this is usually fine. For notes you want to
        keep, content you want to publish, or anything {"you'll"} share — the quality
        gap becomes noticeable, and quickly starts getting in the way.
      </p>

      <p>
        Some creators manually upload their own captions, which are typically more
        accurate and include punctuation — INDXR.AI picks those up automatically. But
        the majority of videos only have auto-generated captions.
      </p>

      <p>
        For deaf and hard-of-hearing people, caption quality {"isn't"} a workflow
        preference — {"it's"} a question of access. Captions are how many people
        engage with video content at all. When auto-captions produce errors on
        technical terms, drop words, or fail on accented speech, a video becomes
        inaccessible. Accurate transcription matters beyond personal convenience — it
        determines whether a video can be followed by a significant part of any
        audience.
      </p>

      <h2>{"When auto-captions don't exist — or aren't good enough"}</h2>

      <p>
        Some videos have no auto-generated captions at all. YouTube{" "}
        <a
          href="https://support.google.com/youtube/answer/6373554"
          target="_blank"
          rel="noopener noreferrer"
        >
          mentions
        </a>{" "}
        common reasons: the creator disabled them, the video is in a language YouTube
        {"doesn't"} support well, or the audio quality was too poor for speech
        recognition to work.
      </p>

      <p>
        For those videos, AI transcription is an alternative. INDXR.AI downloads the
        audio and processes it through{" "}
        <a
          href="https://www.assemblyai.com/benchmarks"
          target="_blank"
          rel="noopener noreferrer"
        >
          AssemblyAI
        </a>
        , one of the most accurate speech-to-text models available. The result is a
        properly punctuated transcript in 99+ languages. {"It's"} meaningfully more
        accurate than auto-captions on most content, though no model is error-free —
        challenging audio conditions, strong accents, or highly technical terminology
        will still produce some mistakes.
      </p>

      <p>
        Cost: 1 credit per minute of audio. The exact cost for any video is shown
        before confirming — no surprises. A free account includes 25 credits, enough
        to test AI transcription on a few videos and decide whether it meets
        expectations before purchasing any credits.
      </p>

      <h2>What you can do with the transcript</h2>

      <p>
        Once a transcript exists — whether from auto-captions or AI transcription —
        it can be exported in six file formats, with nine export options total.
      </p>

      <p>
        Plain text is the simplest output: readable paragraphs, no timestamps, no
        line numbers. Good for reading through a video, taking personal notes, or
        using as a starting point for writing. There is also a plain text file with
        timestamps, where every line is time-coded — useful when the exact moment
        something was said needs to be referenced or quoted.
      </p>

      <p>
        Beyond plain text, the same extraction produces five other formats.{" "}
        <Link href="/youtube-transcript-markdown">Markdown</Link> adds the {"video's"}
        metadata in the header — title, channel, URL, duration — ready to open in any
        notes app or import into Obsidian or Notion. SRT and VTT are subtitle files
        for adding captions to a video or publishing it online. CSV exports every
        segment as a spreadsheet row for analysis or bulk processing. JSON gives
        developers a structured data format with timestamps and video metadata; the{" "}
        <Link href="/youtube-transcript-for-rag">RAG-optimized JSON variant</Link> is
        chunked and formatted for AI pipelines and vector databases — primarily used
        by developers building searchable archives, chatbots over specific content, or
        retrieval systems using tools like LangChain or Pinecone.
      </p>

      <p>Six formats, nine export options:</p>

      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>{"What it's for"}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>TXT plain</td><td>Read through a video like a document, or use as a starting point for your own writing</td></tr>
          <tr><td>TXT with timestamps</td><td>Find exactly when something was said — useful for referencing or quoting</td></tr>
          <tr><td>Markdown plain</td><td>{"A text file with the video's metadata in the header — open in any notes app"}</td></tr>
          <tr><td>Markdown with timestamps</td><td>Same as regular Markdown, but with every line time-coded</td></tr>
          <tr><td>SRT</td><td>Add subtitles to a video — works in Premiere Pro, DaVinci Resolve, CapCut</td></tr>
          <tr><td>VTT</td><td>Subtitles for websites and online courses — Canvas, Moodle, Articulate</td></tr>
          <tr><td>CSV</td><td>Every segment as a spreadsheet row — for analysis or bulk processing</td></tr>
          <tr><td>JSON</td><td>{"Structured data with timestamps and video metadata — for developers"}</td></tr>
          <tr><td>JSON RAG</td><td><Link href="/youtube-transcript-for-rag">Chunked and formatted for AI pipelines and vector databases</Link></td></tr>
        </tbody>
      </table>

      <p>
        All standard exports (TXT, Markdown, SRT, VTT, CSV, JSON) are included with
        every extraction. RAG JSON is the only exception and is available separately
        — see the <Link href="/pricing">pricing page</Link> for credit costs.
      </p>

      <p>
        For playlists, the{" "}
        <Link href="/youtube-playlist-transcript">Playlist tab</Link> processes all
        selected videos in one job. For audio files from any source, the{" "}
        <Link href="/audio-to-text">Audio Upload tab</Link> works the same way —
        upload an audio file and process it like a YouTube URL.
      </p>

      <p>
        Everything you extract is saved to your library — a personal archive of all
        your transcripts, searchable and accessible from any device.{" "}
        <Link href="/signup">Sign up</Link> for a free account to get started: 25
        credits included, no payment or credit card required.
      </p>
    </ToolPageTemplate>
  )
}
