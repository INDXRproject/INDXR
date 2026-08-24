import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AUTHORS } from "@/lib/authors"
import {
  CREDIT_COSTS,
  summaryCreditCost,
  AI_SUMMARY_BASE_MINUTES,
  AI_SUMMARY_STEP_MINUTES,
  FREE_TIER,
} from "@indxr/shared/lib/pricing"
import { summaryModelName } from "@indxr/shared/lib/models"

// OG/Twitter image: the real summary screenshot (this article has no bespoke editorial photo yet,
// so the ArticleHero shows the hexagon fallback and the social card uses the product shot).
const OG_IMAGE = "https://indxr.ai/docs/screenshots/summary-overview-light.png"

const metaDescription =
  `Summarize any YouTube video into chapter notes with clickable timestamps. INDXR reads the whole ` +
  `transcript and writes worked-out notes under each chapter, a YouTube summary generator for material ` +
  `you work through rather than a one-line video summarizer. From ${CREDIT_COSTS.AI_SUMMARY} credits, ` +
  `and a free account includes ${FREE_TIER.WELCOME_CREDITS} credits.`

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-video-summarizer" },
  title: "YouTube Video Summarizer — Summarize Any Video into Chapter Notes | INDXR.AI",
  description: metaDescription,
  openGraph: { type: "article", images: [{ url: OG_IMAGE, width: 2000, height: 1440 }] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE] },
}

const faqs = [
  {
    q: "Is there a maximum video length for a summary?",
    a: "There is no hard limit on the summary itself. If a video has no captions you transcribe it first, and AI transcription is capped at ten hours per file; past roughly five hours the summary keeps its chapters longer rather than adding more of them.",
  },
  {
    q: "Can I export the summary, or only read it?",
    a: "You can copy it or download it as a .txt file from the summary view. The overview, the chapter headings, their timestamps and the notes all come across as plain text.",
  },
  {
    q: "What writes the summary, and where does my text go?",
    a: `Your summary is written by ${summaryModelName()}, so the transcript text stays inside the EU while it is summarised. It runs in two passes: one to find the chapters, and one to write the notes under each.`,
  },
  {
    q: "Where is the summary kept after it is made?",
    a: "With its transcript, in your library, so it is there whenever you reopen that video. You can regenerate it later, which replaces it with a fresh one.",
  },
  {
    q: "How many chapters will a summary have?",
    a: "As many as the material supports. As a rough guide it aims for about one chapter per eight minutes of video, but it follows the actual structure, so a two-part talk can come back as two chapters and a sprawling one as many more.",
  },
  {
    q: "Will regenerating give me exactly the same summary?",
    a: "Not exactly. The model is not deterministic, so regenerating can divide the chapters a little differently or word the notes differently, though the substance stays the same.",
  },
]

export default function YouTubeVideoSummarizerPage() {
  return (
    <ToolPageTemplate
      category="Workflows"
      slug="youtube-video-summarizer"
      title="YouTube video summarizer: turn a long video into chapter notes"
      metaDescription={metaDescription}
      publishedAt="2026-08-24"
      updatedAt="2026-08-24"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      image={OG_IMAGE}
    >
      <p>
        You want a summary of a video. Maybe a lecture you need to revise from, an interview you want
        the substance of, a course you are working through, or something you came across and do not
        have an hour for. INDXR reads the whole transcript, splits it into chapters at the points where
        the subject changes, and writes worked-out notes under each one, with a timestamp that jumps the
        player to that moment. It costs {CREDIT_COSTS.AI_SUMMARY} credits for a video up to{" "}
        {AI_SUMMARY_BASE_MINUTES} minutes and 1 more for each additional {AI_SUMMARY_STEP_MINUTES}{" "}
        minutes, and a free account includes {FREE_TIER.WELCOME_CREDITS} credits.
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

      <h2>What a YouTube video summary looks like</h2>

      <p>
        What you get back is not a paragraph but a set of notes. At the top is an overview of a few
        paragraphs that covers the whole video. Below it are the chapters, each with a heading, a
        timestamp and the content written out: the arguments, the examples, the figures and the names
        that came up in that part, rather than a summary of them. More content produces more chapters,
        and more chapters produce a longer whole, so a long video really does give you a long set of
        notes. That makes it suited to material you have to do something with, and less to the case
        where you only want to know what something is about.
      </p>

      <DocsFigure
        src="/docs/screenshots/summary-overview.png"
        alt="A summary of a video: a few-paragraph overview at the top, then the first chapter below it with a heading and a clickable timestamp."
        caption="A summary opens with an overview of the whole video, then the chapters beneath it, each with a heading and a timestamp."
      />

      <h2>A real example</h2>

      {/* Example figures: docs/wiki/content/summary-example-justice.md (measured 2026-08-24). */}
      <p>
        Take a 55-minute lecture on justice, with almost seven thousand words of transcript. The summary
        came back as a three-paragraph overview plus two chapters, a little over seventeen hundred words
        together: roughly one word for every four spoken. Two chapters and not ten, because the lecture
        really is in two parts, and that division comes from the material rather than from the clock. The
        first chapter covers the trolley problem and its variants. The second begins at 24:40 with
        Bentham&apos;s utilitarianism and the case of Dudley and Stephens. It took about 35 seconds and
        cost 5 credits.
      </p>

      <DocsFigure
        src="/docs/screenshots/summary-chapter.png"
        alt="One chapter of the summary: a heading, a clickable timestamp, and the worked-out notes written out beneath it in full."
        caption="Each chapter is written out in full: a heading, the timestamp it starts at, and the arguments and examples from that part of the video."
      />

      <h2>Timestamps you can check</h2>

      <p>
        A summary you cannot check is a summary you have to trust. Every chapter carries the moment it
        starts, and clicking it takes the player there. That changes what the summary is for: it does
        not replace the video, it gives you a way into it. Read the chapter list, find the part that
        matters, jump to it, and watch three minutes instead of two hours.
      </p>

      <h2>What it costs</h2>

      <p>
        A summary costs {CREDIT_COSTS.AI_SUMMARY} credits for a video up to {AI_SUMMARY_BASE_MINUTES}{" "}
        minutes, and 1 more credit for each additional {AI_SUMMARY_STEP_MINUTES} minutes.
      </p>

      <table>
        <thead>
          <tr>
            <th>Video length</th>
            <th>Credits</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Up to {AI_SUMMARY_BASE_MINUTES} minutes</td><td>{summaryCreditCost(AI_SUMMARY_BASE_MINUTES * 60)} credits</td></tr>
          <tr><td>1 hour</td><td>{summaryCreditCost(60 * 60)} credits</td></tr>
          <tr><td>2 hours</td><td>{summaryCreditCost(2 * 60 * 60)} credits</td></tr>
          <tr><td>4 hours</td><td>{summaryCreditCost(4 * 60 * 60)} credits</td></tr>
        </tbody>
      </table>

      <p>
        The price scales because the work scales: a longer video means more chapters and more text to
        write. A flat price would mean short videos paying for the long ones. There is no subscription,
        and credits never expire.
      </p>

      <h2>How to summarize a YouTube video</h2>

      <p>
        Transcribe the video first, with YouTube&apos;s own captions, which are free, or with AI
        transcription at {CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit per minute if it has no captions.
        Open the transcript in your library and choose Summarise. It runs in the background, so you can
        close the tab, and an hour-long video is usually ready within a minute. The summary works on any
        transcript in your library, whatever its source: YouTube captions, AI transcription, or a file
        you uploaded yourself.
      </p>

      <h2>What it does not do</h2>

      <p>
        The summary works from the transcript, so it knows nothing about what happens on screen. Slides,
        diagrams and demonstrations only reach it through what was said about them, not through what was
        shown.
      </p>

      <p>
        And you do not edit the summary in place. It is read-only: to change it you regenerate it, which
        replaces the current one with a fresh version, or you copy it out and edit that copy wherever you
        keep your notes. The transcript underneath is editable, and editing it marks the summary as out
        of date so you can regenerate it, but the summary text itself is not something you rewrite in the
        library.
      </p>

      <h2>Try it</h2>

      <p>
        A free account includes {FREE_TIER.WELCOME_CREDITS} credits, which covers pulling captions from a
        video and summarising it several times over. No subscription and no card.
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
