import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import {
  CREDIT_COSTS,
  FREE_TIER,
  summaryCreditCost,
} from "@indxr/shared/lib/pricing"

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-to-notes" },
  title: "YouTube to notes: turn any video into notes you keep | INDXR.AI",
  description:
    "Turn a YouTube video into a structured summary with chapters and timestamps, edit it into your own version, and export it as Markdown for Obsidian, Notion or any note app.",
  ...editorialOg("youtube-to-notes"),
}

const welcomeCredits = FREE_TIER.WELCOME_CREDITS
const welcomeMinutes = FREE_TIER.WELCOME_CREDITS / CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const perMinute = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN

const faqs = [
  {
    q: "Does the summary export as Markdown?",
    a: "Yes, with front matter and chapter headings, ready to drop into a vault. Plain text is the other option.",
  },
  {
    q: "Can I edit the summary?",
    a: "Yes. The edit tab turns it into a document you can work in, and your version is stored next to the generated one rather than replacing it.",
  },
  {
    q: "What happens to my edits if I regenerate?",
    a: "They stay. The generated summary is replaced, your edited version is kept and marked as older than the new one.",
  },
  {
    q: "How long does a summary take?",
    a: "A full-length lecture takes a few minutes. You can watch it work through the chapters, and it runs on our servers so the tab can be closed.",
  },
  {
    q: "How many chapters will I get?",
    a: "It follows the video. A fifty-five minute lecture gets around five; a ten minute explainer gets two or three. Chapters break where the topic changes, not on a fixed interval.",
  },
  {
    q: "What if the video has no captions?",
    a: `AI transcription handles it at ${perMinute} credit per minute, and the summary works the same way afterwards.`,
  },
  {
    q: "Do the timestamps still work in my notes?",
    a: "Yes. They are links back to that second of the video, so clicking one in Obsidian or Notion opens it at that point.",
  },
  {
    q: "Can I do this for a whole playlist?",
    a: "Transcripts yes, as one job. Summaries are generated per video.",
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
  {
    label: "Obsidian — Properties",
    url: "https://help.obsidian.md/properties",
  },
  {
    label: "Obsidian Forum — Web Clipper YouTube transcript breakage (thread 111550)",
    url: "https://forum.obsidian.md/t/111550",
  },
  {
    label: "Notion — Import data into Notion",
    url: "https://www.notion.com/help/import-data-into-notion",
  },
  {
    label: "Logseq",
    url: "https://logseq.com",
  },
  {
    label: "Bear",
    url: "https://bear.app",
  },
  {
    label: "Craft",
    url: "https://www.craft.do",
  },
]

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
      title="YouTube to notes: turn any video into notes you keep"
      metaDescription="Turn a YouTube video into a structured summary with chapters and timestamps, edit it into your own version, and export it as Markdown for Obsidian, Notion or any note app."
      publishedAt="2026-04-16"
      updatedAt="2026-08-25"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        You watched an hour of something worth remembering. A lecture, a long interview, a talk you
        will want to quote later. A week from now you will remember that it was good and nothing
        else.
      </p>

      <p>
        INDXR helps you turn that video into something you can work with. The transcript becomes a
        summary broken into chapters, each with the timestamp it starts at and worked-out notes
        underneath. Read it as reference later, or edit it into the shape you actually want and
        export it as Markdown into Obsidian or wherever you keep your notes. The thinking stays
        yours. The structure is what we hand you.
      </p>

      <p>
        A free account comes with {welcomeCredits} credits. That is enough for {welcomeMinutes}{" "}
        minutes of AI transcription, or for summarising several full-length videos that already have
        captions.
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

      <h2>What the summary looks like</h2>

      <p>
        The summary follows the video. Each chapter is a real section of the talk, with the
        timestamp where it starts and notes that work the material out rather than compress it into a
        sentence.
      </p>

      <DocsFigure
        src="/docs/screenshots/summary-overview.png"
        alt="A summary of a video: a few-paragraph overview at the top, then the first chapter below it with a heading and a clickable timestamp."
        caption="The summary opens with an overview of the whole video, then the chapters beneath it, each with a heading and the timestamp it starts at."
      />

      <p>
        That is the trade it makes. These are study notes, not an abstract: a fifty-five minute
        Harvard lecture with a seven thousand word transcript produces around thirty-six hundred
        words of notes across five chapters. Shorter than the transcript, but that is not the point.
        The point is that it has a structure you can navigate, headings you can scan, and timestamps
        that take you back to the moment something was said.
      </p>

      <p>
        The chapter breaks follow the talk, not a stopwatch.{" "}
        <a
          href="https://link.springer.com/article/10.1007/s11423-020-09749-6"
          target="_blank"
          rel="noopener noreferrer"
        >
          Research on instructional video
        </a>{" "}
        puts the useful segment at around six to nine minutes, and that is the density we aim for.
        Where one argument runs longer than that, it stays in a single chapter rather than being cut
        in half, because{" "}
        <a href="https://doi.org/10.1016/j.chb.2017.10.002" target="_blank" rel="noopener noreferrer">
          a break in the wrong place
        </a>{" "}
        costs more than a long chapter does.
      </p>

      <h2>Then you make it yours</h2>

      <p>
        A generated summary is a starting point, not a finished note. Open the edit tab and it
        becomes a document you can work in: cut the chapters you do not need, add the connection you
        saw that the model did not, put your own question at the top.
      </p>

      <DocsFigure
        src="/docs/screenshots/summary-edit.png"
        alt="The summary open in the edit tab: a formatting toolbar above a document with the chapter headings and timestamps, editable in place."
        caption="The edit tab turns the generated summary into a document you can rewrite, cut down and add to."
      />

      <p>
        Your version is stored next to the generated one, never on top of it. Both are exportable and
        labelled separately, so the file you download is always the one you meant.
      </p>

      <h2>What lands in your vault</h2>

      <p>This is a real export of that Harvard lecture:</p>

      <pre className="prose-content-pre"><code>{exportExample}</code></pre>

      <p>
        The front matter is filled from what the video actually carries: title, channel, duration,
        language and source. Fields without a value are left out rather than filled with
        placeholders.
      </p>

      <h2>How it works</h2>

      <p>
        <strong>Paste the link.</strong> A video with captions is extracted for free and appears in
        seconds. A video without them can be transcribed with AI at {perMinute} credit per minute.
      </p>

      <p>
        <strong>Generate the summary.</strong> One button on the summary tab, with the price and your
        balance shown before you confirm. It runs in the background and you can watch it work through
        the chapters, so the tab can be closed and picked up later.
      </p>

      <p>
        <strong>Edit it if you want to.</strong> The edit tab gives you the summary as a document.
        Save when you are done; the generated version stays untouched.
      </p>

      <p>
        <strong>Export it.</strong> Markdown or plain text, the generated version or your edited one.
        Download it and move it into your vault. The transcript is a separate export with its own
        formats, if you want that alongside the notes.
      </p>

      <h2>In Obsidian</h2>

      <p>
        The front matter maps onto{" "}
        <a href="https://help.obsidian.md/properties" target="_blank" rel="noopener noreferrer">
          Obsidian Properties
        </a>{" "}
        without any configuration, so a vault of these notes is queryable the moment you drop them
        in. Duration is stored in seconds, which makes length comparisons trivial:
      </p>

      <pre className="prose-content-pre"><code>{dataviewExample}</code></pre>

      <p>
        There is no plugin to install and nothing to keep working. A plugin reads YouTube&apos;s page
        in your browser, and YouTube changes that page without notice: it{" "}
        <a href="https://forum.obsidian.md/t/111550" target="_blank" rel="noopener noreferrer">
          changed twice in 2026 alone
        </a>
        , and each time the transcript came back empty with no error at all. A Markdown file has no
        such dependency.
      </p>

      <h2>In Notion and elsewhere</h2>

      <p>
        Notion{" "}
        <a
          href="https://www.notion.com/help/import-data-into-notion"
          target="_blank"
          rel="noopener noreferrer"
        >
          imports Markdown files directly
        </a>{" "}
        and turns the headings into a page outline, so the chapter structure survives. It does not
        map YAML front matter onto database properties automatically, so if you keep a video database
        there you either paste the fields in once or strip the front matter before importing.
      </p>

      <p>
        Anything that reads Markdown works:{" "}
        <a href="https://logseq.com" target="_blank" rel="noopener noreferrer">
          Logseq
        </a>
        ,{" "}
        <a href="https://bear.app" target="_blank" rel="noopener noreferrer">
          Bear
        </a>
        ,{" "}
        <a href="https://www.craft.do" target="_blank" rel="noopener noreferrer">
          Craft
        </a>
        , a git repo, a folder of files. The file is plain text.
      </p>

      <h2>What it costs</h2>

      <div className="overflow-x-auto">
        <table>
          <tbody>
            <tr>
              <td>Transcript from YouTube captions</td>
              <td>Free</td>
            </tr>
            <tr>
              <td>AI transcription</td>
              <td>{perMinute} credit per minute</td>
            </tr>
            <tr>
              <td>Summary</td>
              <td>
                {CREDIT_COSTS.AI_SUMMARY_PER_10MIN} credit per 10 minutes of video (rounded up, minimum 1)
              </td>
            </tr>
            <tr>
              <td>Editing and exporting</td>
              <td>Included</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        The Harvard lecture above: the transcript cost nothing because the video had captions, and
        the summary cost {summaryCreditCost(3282)} credits. Every text and Markdown export is
        included, for the transcript and for the summary. RAG JSON, meant for feeding a vector
        database rather than a note app, is priced separately at {CREDIT_COSTS.RAG_JSON_PER_10MIN}{" "}
        credit for every 10 minutes of video, rounded up. Re-downloading a transcript you have
        already exported is free.
      </p>

      <p>No subscription, and credits never expire.</p>

      <h2>Try it</h2>

      <p>
        A free account includes {welcomeCredits} credits, enough for {welcomeMinutes} minutes of AI
        transcription or several caption-based summaries, with no subscription and no card.
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
