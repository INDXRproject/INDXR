import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AskYourLibrary } from "@/components/docs/AskYourLibrary"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import {
  CREDIT_COSTS,
  FREE_TIER,
  summaryCreditCost,
} from "@indxr/shared/lib/pricing"
import { MAX_PLAYLIST_VIDEOS_PER_JOB, MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { summaryModelName } from "@indxr/shared/lib/models"

// 2026-11-09: re-angled to "study notes from a lecture playlist" (positioning 9-11) and merged with
// youtube-video-summarizer (308 in next.config.ts). Unique summarizer content kept here: the cost table
// by length, "timestamps you can check", what the summary cannot see, and three FAQs. Example figures
// come from the frozen fixture docs/wiki/content/summary-example-justice.md (5 chapters, 3,632 words).

const metaDescription =
  "Turn a lecture playlist into study notes with a reference per section: a searchable, cited collection, chapter summaries with timestamps, and Claude or ChatGPT."

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-to-notes" },
  title: "YouTube to notes: study notes from a lecture playlist | INDXR.AI",
  description: metaDescription,
  ...editorialOg("youtube-to-notes"),
}

const welcomeCredits = FREE_TIER.WELCOME_CREDITS
const welcomeMinutes = FREE_TIER.WELCOME_CREDITS / CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const perMinute = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const freeVideos = FREE_TIER.PLAYLIST_FREE_VIDEOS
const perCaptionVideo = CREDIT_COSTS.PLAYLIST_VIDEO_AUTO_CAPTIONS
const per10 = CREDIT_COSTS.AI_SUMMARY_PER_10MIN

const faqs = [
  {
    q: "Do I need Claude or ChatGPT for this?",
    a: "No. INDXR writes a chapter summary of any single video on its own, which you can edit and export as Markdown. Claude or ChatGPT is the route for notes that span several lectures, or notes in your own format, because the assistant can read across a whole collection.",
  },
  {
    q: "Does connecting Claude or ChatGPT cost credits?",
    a: "No. The connector is free on every account and read-only: it can search and read your transcripts and existing summaries, but it never creates a summary, so it never spends credits.",
  },
  {
    q: "Does the summary export as Markdown?",
    a: "Yes, with front matter and chapter headings, ready to drop into a vault. Plain text is the other option.",
  },
  {
    q: "Can I edit the summary?",
    a: "Yes. The edit tab turns it into a document you can work in, and your version is stored next to the generated one rather than replacing it. If you regenerate, the generated summary is replaced and your edited version is kept.",
  },
  {
    q: "Is there a maximum video length for a summary?",
    a: `There is no hard limit on the summary itself. A video without captions has to be transcribed first, and AI transcription is capped at ${MAX_TRANSCRIPTION_HOURS} hours per file.`,
  },
  {
    q: "What writes the summary, and where does my text go?",
    a: `The summary is written by ${summaryModelName()}, so the transcript text stays inside the EU while it is summarised. It runs in two passes: one to find the chapters, and one to write the notes under each.`,
  },
  {
    q: "Will regenerating give me exactly the same summary?",
    a: "Not exactly. The model is not deterministic, so a regenerated summary can divide the chapters a little differently or word the notes differently, though the substance stays the same.",
  },
  {
    q: "Do the timestamps still work in my notes?",
    a: "Yes. They are links back to that second of the video, so clicking one in Obsidian or Notion opens it at that point.",
  },
]

const sources = [
  {
    label: "Mayer, Fiorella and Stull — Five ways to increase the effectiveness of instructional video (2020)",
    url: "https://link.springer.com/article/10.1007/s11423-020-09749-6",
  },
  {
    label: "Biard, Cojean and Jamet — Effects of segmentation and pacing on procedural learning by video (2017)",
    url: "https://doi.org/10.1016/j.chb.2017.10.002",
  },
  { label: "Obsidian — Properties", url: "https://help.obsidian.md/properties" },
  { label: "Notion — Import data into Notion", url: "https://www.notion.com/help/import-data-into-notion" },
]

function Ctas() {
  return (
    <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <Link href="/signup">
        <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
          Create a free account
        </button>
      </Link>
      <Link href="/docs/guides/ai-assistants" className="text-sm font-medium text-[var(--link)] underline-offset-2 hover:underline">
        How to connect Claude or ChatGPT →
      </Link>
    </div>
  )
}

const exportExample = `---
title: "Justice: What's The Right Thing To Do? Episode 01"
url: "https://www.youtube.com/watch?v=kBdfcR-8hEY"
channel: "Harvard University"
duration: 3282
language: "en"
transcript_source: "YouTube captions"
created: "2026-08-25"
type: youtube
tags: [youtube, summary]
---

# Justice: What's The Right Thing To Do? Episode 01

## Overview

This video introduces the field of moral philosophy by presenting a series of challenging ethical dilemmas, such as the classic trolley problem and variations involving doctors and organ transplants. These scenarios serve to illustrate two fundamental approaches to moral reasoning: consequentialist ethics, which judges actions based on their outcomes, and categorical ethics, which emphasizes inherent duties and rights irrespective of consequences...

## [00:00:00](https://youtu.be/kBdfcR-8hEY?t=0) Introduction to Moral Dilemmas and Reasoning

The course begins with a story about **Justice**.

**The Trolley Problem (Variant 1: Driver)**
*   **Scenario:** You are the driver of a trolley car traveling at 60 mph. Your brakes fail. Ahead are five workers on the track. You will kill all five if you continue.
*   **Alternative:** There is a side track to the right with one worker. Your steering works, allowing you to turn onto the side track, killing the one worker but sparing the five.
*   **Dilemma:** What is the right thing to do? Turn, killing one to save five, or go straight, killing five?

## [00:24:44](https://youtu.be/kBdfcR-8hEY?t=1484) Revisiting Moral Frameworks and Introducing Utilitarianism
...`

const dataviewExample = `TABLE channel, duration / 60 AS "Minutes"
FROM #youtube
WHERE type = "youtube"
SORT duration DESC`

export default function YouTubeToNotesPage() {
  return (
    <ToolPageTemplate
      category="Workflows"
      slug="youtube-to-notes"
      title="YouTube to notes: study notes from a lecture playlist, with a reference per section"
      metaDescription={metaDescription}
      publishedAt="2026-04-16"
      updatedAt="2026-11-09"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        You are working through a course on YouTube: twenty lectures, an hour each. By the exam you will
        remember that lecture seven was good and very little of what was in it. Notes help, but notes you
        cannot trace back to the lecture are hard to trust when you revise, and impossible to cite.
      </p>

      <p>
        INDXR turns the playlist into a collection of transcripts, each kept with its source and a ready
        APA citation. From there you have two ways to get notes: a chapter summary of each video, with a
        timestamp per chapter, or Claude or ChatGPT writing notes across the whole collection with a
        reference under every section. Either way, every point leads back to the moment it was said.
      </p>

      <p>
        A free account includes {welcomeCredits} credits. Pulling YouTube captions is free for a single
        video, and in a playlist the first {freeVideos} caption videos are free, then {perCaptionVideo}{" "}
        credit per video.
      </p>

      <Ctas />

      <h2>Step 1: the playlist becomes a collection</h2>

      <p>
        Paste the playlist URL into the Playlist tab. INDXR lists every video with its length, you choose
        which ones to include, and the job runs in the background, up to {MAX_PLAYLIST_VIDEOS_PER_JOB}{" "}
        videos per job. The transcripts are filed into a collection named after the playlist, so the course
        stays together. Videos without captions can be transcribed with AI at {perMinute} credit per minute.
        The full flow is in <Link href="/articles/youtube-playlist-transcript">playlist transcripts</Link>.
      </p>

      <p>
        Each transcript keeps its source: the channel, the link, the length, the date it was published, and
        a citation in APA 7. That is the part that makes notes citable later. How that citation is built is
        covered in <Link href="/articles/cite-youtube-video-apa">how to cite a YouTube video in APA</Link>.
      </p>

      <h2>Step 2a: notes across lectures, from Claude or ChatGPT</h2>

      <p>
        Connect your library to Claude or ChatGPT once. The connection is read-only and free. The assistant
        can then list your collections, search the transcripts, read a lecture in blocks with timestamps,
        and look up each source with its citation. Ask it for notes the way you want them:
      </p>

      <blockquote>
        <p>
          &ldquo;Turn lectures 6 to 10 of my Early Middle Ages collection into study notes. One section per
          lecture, the key arguments as bullets, and under each section the APA reference and the
          timestamps you used.&rdquo;
        </p>
      </blockquote>

      <p>
        Because the assistant reads your transcripts rather than recalling the course from memory, it can
        quote the lecturer and point to the minute. Check a few of those points against the video before
        you rely on them: the assistant can still misread a passage, and the timestamp is how you find out
        quickly.
      </p>

      <AskYourLibrary lead="A playlist becomes a collection: a whole course you can search at once." />

      <h2>Step 2b: a chapter summary of each video, inside INDXR</h2>

      <p>
        For one video at a time, INDXR writes the notes itself. It reads the whole transcript, splits it
        into chapters where the subject changes, and writes worked-out notes under each one, with a
        timestamp that jumps the player to that moment.
      </p>

      <DocsFigure
        src="/docs/screenshots/summary-overview.png"
        alt="A summary of a video: a few-paragraph overview at the top, then the first chapter below it with a heading and a clickable timestamp."
        caption="The summary opens with an overview of the whole video, then the chapters beneath it, each with a heading and the timestamp it starts at."
      />

      <p>
        These are study notes, not an abstract. A fifty-five minute Harvard lecture with a seven thousand
        word transcript produced around thirty-six hundred words of notes across five chapters. The chapter
        breaks follow the talk, not a stopwatch.{" "}
        <a href="https://link.springer.com/article/10.1007/s11423-020-09749-6" target="_blank" rel="noopener noreferrer">
          Research on instructional video
        </a>{" "}
        puts the useful segment at around six to nine minutes, and that is the density we aim for. Where one
        argument runs longer, it stays in a single chapter rather than being cut in half, because{" "}
        <a href="https://doi.org/10.1016/j.chb.2017.10.002" target="_blank" rel="noopener noreferrer">
          a break in the wrong place
        </a>{" "}
        costs more than a long chapter does.
      </p>

      <h3>Timestamps you can check</h3>

      <p>
        A summary you cannot check is a summary you have to trust. Every chapter carries the moment it
        starts, and clicking it takes the player there. Read the chapter list, find the part that matters,
        and watch three minutes instead of an hour.
      </p>

      <h3>Then make it yours</h3>

      <p>
        Open the edit tab and the summary becomes a document you can work in: cut the chapters you do not
        need, add the connection you saw that the model did not, put your own question at the top. Your
        version is stored next to the generated one, never on top of it.
      </p>

      <DocsFigure
        src="/docs/screenshots/summary-edit.png"
        alt="The summary open in the edit tab: a formatting toolbar above a document with the chapter headings and timestamps, editable in place."
        caption="The edit tab turns the generated summary into a document you can rewrite, cut down and add to."
      />

      <h3>What it cannot see</h3>

      <p>
        The summary works from the transcript, so it knows nothing about what happens on screen. Slides,
        diagrams and demonstrations only reach it through what was said about them.
      </p>

      <h2>What lands in your notes app</h2>

      <p>This is a real Markdown export of that Harvard lecture:</p>

      <pre className="prose-content-pre"><code>{exportExample}</code></pre>

      <p>
        The front matter is filled from what the video carries: title, channel, duration, language and
        source. Fields without a value are left out rather than filled with placeholders.
      </p>

      <h3>In Obsidian</h3>

      <p>
        The front matter maps onto{" "}
        <a href="https://help.obsidian.md/properties" target="_blank" rel="noopener noreferrer">
          Obsidian Properties
        </a>{" "}
        without any configuration, so a vault of these notes is queryable the moment you drop them in.
        Duration is stored in seconds, which makes length comparisons trivial:
      </p>

      <pre className="prose-content-pre"><code>{dataviewExample}</code></pre>

      <h3>In Notion and elsewhere</h3>

      <p>
        Notion{" "}
        <a href="https://www.notion.com/help/import-data-into-notion" target="_blank" rel="noopener noreferrer">
          imports Markdown files directly
        </a>{" "}
        and turns the headings into a page outline, so the chapter structure survives. It does not map YAML
        front matter onto database properties automatically, so if you keep a video database there you
        either paste the fields in once or strip the front matter before importing. Anything else that reads
        Markdown works too: the file is plain text.
      </p>

      <h2>What it costs</h2>

      <div className="overflow-x-auto">
        <table>
          <tbody>
            <tr>
              <td>Transcript from YouTube captions</td>
              <td>Free for a single video; in a playlist the first {freeVideos} free, then {perCaptionVideo} credit per video</td>
            </tr>
            <tr>
              <td>AI transcription</td>
              <td>{perMinute} credit per minute</td>
            </tr>
            <tr>
              <td>Summary inside INDXR</td>
              <td>{per10} credit per 10 minutes of video (rounded up, minimum 1)</td>
            </tr>
            <tr>
              <td>Notes from Claude or ChatGPT via the connector</td>
              <td>Free on the INDXR side (your assistant&apos;s own plan applies)</td>
            </tr>
            <tr>
              <td>Editing and exporting</td>
              <td>Included</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>Summary cost by video length:</p>

      <table>
        <thead>
          <tr>
            <th>Video length</th>
            <th>Credits</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Up to 10 minutes</td><td>{summaryCreditCost(10 * 60)}</td></tr>
          <tr><td>30 minutes</td><td>{summaryCreditCost(30 * 60)}</td></tr>
          <tr><td>1 hour</td><td>{summaryCreditCost(60 * 60)}</td></tr>
          <tr><td>2 hours</td><td>{summaryCreditCost(2 * 60 * 60)}</td></tr>
        </tbody>
      </table>

      <p>
        The Harvard lecture above: the transcript cost nothing because the video had captions, and the
        summary cost {summaryCreditCost(3282)} credits. No subscription, and credits never expire.
      </p>

      <h2>Try it on a course</h2>

      <p>
        A free account includes {welcomeCredits} credits, enough for {welcomeMinutes} minutes of AI
        transcription or a few caption-based summaries, with no card. Start with a short playlist, connect
        Claude or ChatGPT, and ask for notes on one lecture before you do the whole course.
      </p>

      <Ctas />
    </ToolPageTemplate>
  )
}
