import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"
import { EXPORT_FORMAT_COUNT, spellCount } from "@indxr/shared/lib/exportFormats"
import { LIBRARY_STORAGE_BASE_MB, LIBRARY_STORAGE_MAX_MB } from "@indxr/shared/lib/storage"

const freeSlots = FREE_TIER.PLAYLIST_FREE_VIDEOS
const perCaption = CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS
const perAiMinute = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

const metaDescription =
  `Extract transcripts from an entire YouTube playlist in one job. The first ${freeSlots} caption videos ` +
  `are free, then ${perCaption} credit per video, with AI transcription at ${perAiMinute} credit per ` +
  `minute for videos that have no captions. Up to 500 videos per job; a free account includes ` +
  `${FREE_TIER.WELCOME_CREDITS} credits.`

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-playlist-transcript" },
  title: "YouTube Playlist Transcript: Every Video in One Job | INDXR.AI",
  description: metaDescription,
  ...editorialOg("youtube-playlist-transcript"),
}

const faqs = [
  {
    q: "Why does the total change when I switch a video to AI transcription?",
    a: `Because AI transcription is charged by the minute, at ${perAiMinute} credit per minute, while a caption video is a flat ${perCaption} credit. Turning a video over to AI swaps its flat caption charge for a per-minute one, so the total moves by roughly the length of that video: a long one costs more that way, a short one barely differs.`,
  },
  {
    q: "If a free video fails, does its free slot move to the next video?",
    a: `No. The ${freeSlots} free slots are worked out from the videos you selected before the run starts, so a slot that lands on a video that then fails is simply not used, and the next paid video stays paid. You are not charged for the failed one either way.`,
  },
  {
    q: "Does retrying failed videos give me fresh free slots?",
    a: "No. The free slots belong to the original run and are used up there, so a retry job charges for every caption video in it. Retrying is meant for videos that failed on a temporary problem such as rate-limiting, and it runs on a fresh connection.",
  },
  {
    q: "What happens if some videos in the playlist fail?",
    a: "The rest of the job carries on, and you are never charged for a video that does not produce a transcript. The completion screen groups the failures by reason, keeping retryable ones like rate-limiting apart from permanent ones like a private video, and the credits held for the failed videos come back.",
  },
  {
    q: "What if some of the videos are already in my library?",
    a: "They are detected before the run and left out by default, so you are not charged for a transcript you already have. The review screen shows which selected videos are new and which already exist, with a link to the existing one.",
  },
  {
    q: "Can I mix YouTube captions and AI transcription in one playlist?",
    a: "Yes. On the review screen you set each video to captions or AI, so you can pull free captions for most of a list and spend credits on AI only for the videos that have no captions, or that you want transcribed from the audio for accuracy.",
  },
  {
    q: "Do unlisted playlists work?",
    a: "Yes, as long as the URL opens the playlist. An unlisted playlist, the kind anyone with the link can open, behaves the same as a public one. A private playlist that needs a YouTube login cannot be reached.",
  },
]

export default function YouTubePlaylistTranscriptPage() {
  return (
    <ToolPageTemplate
      category="Workflows"
      slug="youtube-playlist-transcript"
      title="YouTube playlist transcript: extract every video in one job"
      metaDescription={metaDescription}
      publishedAt="2026-04-16"
      updatedAt="2026-08-24"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      image="https://indxr.ai/docs/screenshots/playlist-complete-light.png"
    >
      <p>
        You have a YouTube playlist and you want the transcript of everything in it: a course, a
        conference channel, a research list, a season of a podcast. Doing it a video at a time means a URL,
        a wait and a download for each one. INDXR takes the playlist URL and runs the whole list as a
        single job on the server, so you start it once and the finished transcripts arrive in your library
        as they complete. The first {freeSlots} videos with captions are free, each caption video after
        that costs {perCaption} credit, and a video with no captions can be transcribed by AI at{" "}
        {perAiMinute} credit per minute. A free account includes {FREE_TIER.WELCOME_CREDITS} credits.
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

      <h2>How a playlist run works</h2>

      <p>
        Paste the playlist URL. Before anything starts, INDXR fetches every video in the list with its
        title and length, and checks which ones you already have in your library. Videos you have already
        transcribed are left out of the job by default, so you are not charged twice for them.
      </p>

      <DocsFigure
        src="/docs/screenshots/playlist-url-input.png"
        alt="The playlist tab: a field to paste a YouTube playlist URL, a Fetch playlist button, and a line beneath it showing the first three caption videos are free, then one credit per video, with AI at one credit per minute."
        caption="Paste a playlist URL. The cost rule sits right under the field, before you fetch anything."
      />

      <p>
        You pick which videos to include and confirm. Each one starts on captions, and you can switch any
        of them to AI transcription on the same screen, with the credit total updating as you go. A video
        that turns out to have no captions is skipped during the run, and the credits held for it come
        back to your balance.
      </p>

      <DocsFigure
        src="/docs/screenshots/playlist-review.png"
        alt="The review screen listing every selected video with its length, a per-video toggle between captions and AI, the free videos marked, and the total credit cost before starting."
        caption="The review screen: set each video to captions or AI, see what it costs, and start when it looks right."
      />

      <p>
        The job then runs on the server. It runs in the background, so it is safe to close this tab. When
        you come back the progress replaces the review screen, and any videos that finished while you were
        away are already in your library.
      </p>

      <DocsFigure
        src="/docs/screenshots/playlist-progress.png"
        alt="A playlist extraction in progress: a heading reading Extracting playlist, a counter of finished over total videos with elapsed time, a progress bar, and a row per video showing done, skipped or queued with a captions or AI badge."
        caption="While it runs you see each video tick over, with a counter and the note that the tab is safe to close."
      />

      <h2>What it costs</h2>

      <p>
        The first {freeSlots} videos with captions in a playlist are free, and each caption video after
        that costs {perCaption} credit. AI transcription, for videos with no captions, costs{" "}
        {perAiMinute} credit per minute wherever it is used. AI transcription never takes one of the free
        caption slots, so the order the videos happen to sit in does not change the total.
      </p>

      <h2>A real example</h2>

      <p>
        This is one of our own test extractions, run to check the numbers, not a customer&apos;s. We ran a
        ten-video playlist, nine of the videos on captions and one on AI transcription. Twelve credits
        were reserved at the start, ten were charged, and two came back, with the whole job finished in
        under four minutes. Two of the three free videos succeeded, and the third dropped out on a network
        error. The four paid caption videos all succeeded. The one AI video, five minutes and fifty-one
        seconds long, cost six credits. Two of the videos turned out to have no captions and were skipped,
        which is where the two refunded credits came from.
      </p>

      <DocsFigure
        src="/docs/screenshots/playlist-complete.png"
        alt="The completion screen for the run: seven of ten videos transcribed, a receipt showing six caption videos, one AI transcription and three not fetched with two credits refunded, a charged total of ten credits, and cards explaining the two failure reasons."
        caption="The completion receipt: what was charged, what came back, and a card for each failure reason."
      />

      <h2>When a video cannot be transcribed</h2>

      <p>
        One video failing never stops the rest of the job, and you are never charged for a video that does
        not produce a transcript. What the run shows you depends on why it failed.
      </p>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>What went wrong</th>
              <th>What the run shows</th>
              <th>Does retrying help</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>The video has no captions</td>
              <td>&ldquo;This video has no captions&rdquo;</td>
              <td>No, but AI transcription can read it from the audio</td>
            </tr>
            <tr>
              <td>Private or removed</td>
              <td>&ldquo;This video isn&apos;t available&rdquo;</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Age-restricted</td>
              <td>&ldquo;This video is age-restricted&rdquo;</td>
              <td>No, though you can upload the audio yourself</td>
            </tr>
            <tr>
              <td>Rate-limited by YouTube</td>
              <td>&ldquo;YouTube rate-limited this request&rdquo;</td>
              <td>Usually, a retry goes out on a fresh connection</td>
            </tr>
            <tr>
              <td>A network problem on our side</td>
              <td>&ldquo;We couldn&apos;t reach this video&apos;s audio&rdquo;</td>
              <td>Sometimes, retry it or upload the audio</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Rate-limited and network failures are grouped together on the completion screen with a Retry all
        button, which re-runs just those videos on a fresh connection. The permanent ones, a private video
        or a video with no captions, are listed separately, because retrying them would not change the
        result.
      </p>

      <h2>Limits and channels</h2>

      <p>
        A few <Link href="/docs/reference/limits">hard limits</Link> are worth knowing before you start a
        large playlist.
      </p>

      <table>
        <tbody>
          <tr>
            <td>Videos per job</td>
            <td>500</td>
          </tr>
          <tr>
            <td>Jobs running at once</td>
            <td>3</td>
          </tr>
          <tr>
            <td>Length per AI-transcribed video</td>
            <td>10 hours (caption extraction has no length limit)</td>
          </tr>
          <tr>
            <td>Library storage</td>
            <td>{LIBRARY_STORAGE_BASE_MB} MB free, up to {LIBRARY_STORAGE_MAX_MB} MB</td>
          </tr>
        </tbody>
      </table>

      <p>
        A playlist larger than 500 videos is split into batches of 500, and every batch lands in the same
        library. Selecting fifty or more videos shows a note that the job will take a while and can run in
        the background; that is a heads-up, not a limit.
      </p>

      <p>
        A channel URL is not accepted. To transcribe a channel, make a playlist of the videos you want in
        YouTube and paste that playlist URL instead. A channel URL that already carries a playlist
        parameter is treated as the playlist it points to.
      </p>

      <h2>What people use it for</h2>

      <p>
        <strong>Course transcription.</strong> Extract all the lectures from an educational playlist and
        export each as Markdown for an Obsidian or Notion knowledge base, or as a merged CSV for analysis.
      </p>

      <p>
        <strong>Research corpus.</strong> Transcribe a conference archive, a speaker&apos;s body of work,
        or a topic-specific playlist, then export the set as a single merged CSV or{" "}
        <Link href="/articles/youtube-transcripts-vector-database">RAG JSON</Link> to get one queryable
        dataset.
      </p>

      <p>
        <strong>Your own archive.</strong> Extract your own video playlist and export it as plain
        Markdown, ready to feed into an assistant for a blog post, a newsletter or social content.
      </p>

      <h2>Exporting a whole playlist</h2>

      <p>
        Every video becomes its own transcript in your library, and each one exports in{" "}
        {spellCount(EXPORT_FORMAT_COUNT)} formats: plain text, Markdown, SRT, VTT, CSV, JSON and a
        RAG-optimised JSON for AI pipelines. See the{" "}
        <Link href="/articles/transcript-export-formats">export formats</Link> reference for the schema
        and what each one is for.
      </p>

      <p>
        To take a whole playlist at once, select the transcripts in your library, pick a format, and
        download a ZIP with one file per video, named consistently as{" "}
        <code>video-title_video-id.ext</code>. For AI pipelines the RAG JSON export can be merged into a
        single array across the playlist, so a course or a channel becomes one dataset rather than a
        folder of files.
      </p>

      <h2>Try it on a playlist</h2>

      <p>
        The way to judge this is to run a real playlist through it. A free account includes{" "}
        {FREE_TIER.WELCOME_CREDITS} credits, enough to pull captions from a playlist and try AI
        transcription on a video or two, with no subscription and no card. For how the wider pipeline
        fits together, see <Link href="/docs/how-indxr-works">how INDXR works</Link>.
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
