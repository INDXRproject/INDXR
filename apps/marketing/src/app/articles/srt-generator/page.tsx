import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock"
import { AUTHORS } from "@/lib/authors"
import {
  SUBTITLE_MAX_LINE,
  SUBTITLE_MAX_LINES,
  SUBTITLE_MAX_CUE_SEC,
  SUBTITLE_MIN_CUE_SEC,
  SUBTITLE_TARGET_CPS,
  SUBTITLE_CEIL_CPS,
} from "@indxr/shared/lib/subtitleConfig"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import {
  UPLOAD_MAX_FILE_MB,
  UPLOAD_FORMAT_COUNT_WORD,
  UPLOAD_AUDIO_LABELS,
  UPLOAD_VIDEO_LABELS,
} from "@indxr/shared/lib/uploadFormats"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

// OG/Twitter image: the real exported-SRT screenshot. This article has no bespoke editorial photo,
// so ArticleHero shows the seeded hexagon header (no entry in editorialAlts) and the social card
// uses this product shot. Dimensions are the framed PNG's actual size.
const OG_IMAGE = "https://indxr.ai/docs/screenshots/video-subtitles-srt-light.png"

const metaDescription =
  `Create an SRT or VTT subtitle file from a video, a link or an audio recording. ` +
  `INDXR re-times the transcript per word and regroups it into readable, broadcast-standard cues ` +
  `of at most ${SUBTITLE_MAX_LINE} characters a line, then hands you the file. Free with a free ` +
  `account (${FREE_TIER.WELCOME_CREDITS} welcome credits). It makes the file; it does not burn ` +
  `subtitles into the picture.`

export const metadata: Metadata = {
  alternates: { canonical: "/articles/srt-generator" },
  title: "SRT Generator — Create an SRT or VTT File from Video or Audio | INDXR.AI",
  description: metaDescription,
  openGraph: { type: "article", images: [{ url: OG_IMAGE, width: 2000, height: 1248 }] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE] },
}

const faqs = [
  {
    q: "Is the SRT generator free?",
    a: `The SRT and VTT downloads cost no credits. A free account is needed to export them, and it comes with ${FREE_TIER.WELCOME_CREDITS} credits. If the source is a YouTube video that already has captions, the whole thing is free; if it has no captions or you upload your own file, you pay ${CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit per minute to transcribe it first, and the subtitle files are still free after that.`,
  },
  {
    q: "Can I create an SRT file from audio with no video?",
    a: `Yes. Upload an audio recording and you get the same SRT and VTT back, with the timestamps counted from the start of the recording. There is no video track involved and none is needed.`,
  },
  {
    q: "What is the difference between SRT and VTT?",
    a: `SRT uses a comma before the milliseconds and VTT uses a dot; VTT also opens with a WEBVTT header. Reach for SRT when a desktop editor or an upload form asks for a subtitle file, and VTT when the video plays in a browser through an HTML5 track element. The cue text is segmented the same way in both.`,
  },
  {
    q: "Does the SRT generator burn subtitles into the video?",
    a: `No. INDXR produces the subtitle file, not a new video with the words on the picture. That file is exactly what a video editor imports to add or burn in subtitles; the burning-in itself happens in the editor.`,
  },
  {
    q: "How long and how large can the file be?",
    a: `Up to ${MAX_TRANSCRIPTION_HOURS} hours per file for AI transcription, and up to ${UPLOAD_MAX_FILE_MB}MB for an upload. Extracting captions from a YouTube video that already has them has no length limit at all.`,
  },
  {
    q: "What happens if the audio has no speech?",
    a: `You get no file and no charge. The transcription cost is reserved when the job starts and booked straight back if nothing is transcribed, so silence or music with no speech never costs you credits.`,
  },
]

const sources = [
  {
    label: "Netflix Timed Text Style Guide: English (USA)",
    url: "https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide",
  },
  {
    label: "Netflix Timed Text Style Guide: General Requirements",
    url: "https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements",
  },
]

export default function SrtGeneratorPage() {
  return (
    <ToolPageTemplate
      category="Export Formats"
      slug="srt-generator"
      title="SRT generator: create a subtitle file from video or audio"
      metaDescription={metaDescription}
      publishedAt="2026-08-26"
      updatedAt="2026-08-26"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
      image={OG_IMAGE}
    >
      <p>
        You have a video, a link or a recording, and you need a subtitle file. Not subtitles painted onto
        the picture, but the file itself: an <strong>.srt</strong> or <strong>.vtt</strong> you can hand to
        an editor, upload to a player, or attach to a course. INDXR turns the spoken words into that file,
        rebuilt to read cleanly rather than left as the raw fragments most tools return. It is free with a
        free account, which includes {FREE_TIER.WELCOME_CREDITS} credits.
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

      <h2>What you get: an SRT or VTT file</h2>

      <p>
        Every transcript exports as both SRT and VTT, and both are free. Here is a real fragment, taken
        verbatim from the generator running on a stored transcript, the opening of a lecture on YouTube:
      </p>

      <DocsCodeBlock>{`3
00:00:33,509 --> 00:00:38,799
This is a course about Justice and we
begin with a story suppose you're the

4
00:00:38,799 --> 00:00:43,760
driver of a trolley car, and your trolley
car is hurdling down the track at sixty

5
00:00:43,760 --> 00:00:48,999
miles an hour and at the end of the track
you notice five workers working on the`}</DocsCodeBlock>

      <p>
        Numbered cues, a start and end time, and one or two short lines each. No line runs over{" "}
        {SUBTITLE_MAX_LINE} characters, and no cue stays on screen so briefly that it flickers past. That is
        the shape a player or an editor expects.
      </p>

      <DocsFigure
        src="/docs/screenshots/video-subtitles-srt.png"
        alt="An exported SRT subtitle file: numbered cues, each with a start and end timestamp and one or two short lines of text."
        caption="An exported SRT file: numbered cues, timestamps, and lines rebuilt to subtitle length rather than raw transcript fragments."
      />

      <h2>How the blocks are made</h2>

      <p>
        This is where the file is won or lost. Many generators cut on a character count, or take the
        transcript&apos;s own segments and copy them across one for one, which leaves you with fragments that
        flicker and lines that overflow. INDXR does neither. It throws the segment boundaries away, builds a
        timeline for each individual word, and then groups the words again for reading, following the{" "}
        <a
          href="https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide"
          target="_blank"
          rel="noopener noreferrer"
        >
          Netflix guideline
        </a>{" "}
        that most of the industry works to.
      </p>

      <p>The rules, in plain terms:</p>

      <ul>
        <li>At most <strong>{SUBTITLE_MAX_LINE} characters</strong> per line, across at most{" "}
          <strong>{SUBTITLE_MAX_LINES} lines</strong> per block. A block that would need a third line, or a
          word past the limit, starts a new block instead.</li>
        <li>No block on screen longer than <strong>{SUBTITLE_MAX_CUE_SEC} seconds</strong>, and none shorter
          than <strong>{SUBTITLE_MIN_CUE_SEC} second</strong>.</li>
        <li>A block prefers to end on a <strong>sentence boundary</strong>: if it would stop mid-sentence but
          a sentence ended earlier inside it, it is cut back to that point, so a sentence is only split when
          it is too long for one block.</li>
        <li>Each block is held long enough to read, lengthened toward{" "}
          <strong>{SUBTITLE_TARGET_CPS} characters per second</strong> by filling the silence before the next
          block, and never left above <strong>{SUBTITLE_CEIL_CPS} characters per second</strong>. Filling
          silence keeps the timing from drifting out of sync.</li>
        <li>A <strong>change of speaker</strong> always starts a new block.</li>
      </ul>

      <p>
        The reference pages carry the exact fields and are the place to look for the format itself:{" "}
        <Link href="/docs/reference/export-formats/srt">the SRT spec</Link> and{" "}
        <Link href="/docs/reference/export-formats/vtt">the VTT spec</Link>.
      </p>

      <h2>A segment is not a subtitle block</h2>

      <p>
        The clearest way to see the difference is to put the raw transcript next to the file. The three cues
        above did not come from three neat segments. This is what went in:
      </p>

      <DocsCodeBlock>{`[00:33.5]  This is a course about Justice and we begin with a story
[00:37.8]  suppose you're the driver of a trolley car,
[00:40.2]  and your trolley car is hurdling down the track at sixty miles an hour`}</DocsCodeBlock>

      <p>
        Three segments, cut where the speech recognition happened to pause. In the file above, the first
        segment and the opening words of the second were <strong>merged</strong> into block 3, and the second
        segment was <strong>split</strong>: the rest of it opens block 4, which then borrows the start of the
        third segment. A segment boundary and a block boundary are not the same thing, and forcing them to be
        is what produces subtitles you have to fix by hand.
      </p>

      <p>
        Across a whole file the effect is large. One real 55-minute lecture came in as{" "}
        <strong>1,142 transcript segments</strong> and came out as <strong>630 subtitle blocks</strong>,
        averaging about 5.2 seconds each, with no line over {SUBTITLE_MAX_LINE} characters.
      </p>

      <h2>SRT or VTT, and what happens to speakers</h2>

      <p>
        The two files hold the same cues; the surface differs. SRT writes the time with a comma before the
        milliseconds; VTT uses a dot and opens with a <code>WEBVTT</code> header, plus a short note carrying
        the title and language:
      </p>

      <DocsCodeBlock>{`WEBVTT

NOTE
title: Justice: What's The Right Thing To Do? Episode 01
language: en

3
00:00:33.509 --> 00:00:38.799
This is a course about Justice and we
begin with a story suppose you're the`}</DocsCodeBlock>

      <p>
        Where a transcript has speaker labels, the two formats carry the name differently, and that changes
        how each one breaks into blocks. SRT has no speaker field, so the name goes inside the text as a{" "}
        <code>Name: </code> prefix, and it counts against the {SUBTITLE_MAX_LINE}-character line. VTT has a
        native <code>&lt;v Name&gt;</code> voice tag that sits outside the line budget and is invisible on
        screen, so the full {SUBTITLE_MAX_LINE} characters stay free for the words. Because the name costs
        characters in SRT but not in VTT, the block that opens a speaker&apos;s turn fits less text in SRT, so
        the two files divide the same speech into slightly different blocks.
      </p>

      <h2>From a file or a link to a download</h2>

      <p>
        Paste a YouTube link or upload a file, wait for the transcript, then pick SRT or VTT from the export
        menu and the file downloads. If the video already has captions, extracting them is free and takes a
        few seconds; if it does not, or you uploaded your own file, it is transcribed first at{" "}
        {CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit per minute.
      </p>

      <p>
        One thing to be straight about: <strong>anonymously you can only download plain text</strong>. SRT,
        VTT and the other formats need an account, which is free and includes{" "}
        {FREE_TIER.WELCOME_CREDITS} credits. It is a sign-in wall, not a paywall, on the subtitle files
        themselves.
      </p>

      <h2>It works on an audio file too</h2>

      <p>
        You do not need a video. Upload an audio recording and you get the same SRT and VTT, with the
        timestamps counted from the start of the recording rather than a video timeline. Uploads run through
        AI transcription, so the words come back punctuated and split by speaker, which gives the block
        builder real sentence boundaries to cut on. It accepts {UPLOAD_FORMAT_COUNT_WORD} formats in all,
        audio and video together.
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
        </tbody>
      </table>

      <h2>What it will not do</h2>

      <p>
        It does not burn subtitles into the picture. INDXR makes the subtitle file, and the SRT it hands you
        is precisely what a video editor imports to lay subtitles over the video or burn them in; that step
        belongs in the editor. If a recording has no speech at all, you get no file and no charge, because the
        transcription cost is reserved when the job starts and returned in full if nothing is transcribed.
      </p>

      <p>
        For getting the words out of a video file in the first place,{" "}
        <Link href="/articles/video-to-text">video to text</Link> covers the upload side; for every other way
        to export a transcript, and for importing subtitles into a specific editor,{" "}
        <Link href="/articles/transcript-export-formats">transcript export formats</Link> is the hub.
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
