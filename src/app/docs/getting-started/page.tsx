import type { Metadata } from "next"
import { DocsShell } from "@/components/docs/DocsShell"
import { Footer } from "@/components/Footer"

export const metadata: Metadata = {
  title: "Welcome to INDXR — Getting Started",
  description: "Get started with INDXR — learn how to extract and export YouTube transcripts.",
  robots: { index: true, follow: true },
}

export default function GettingStartedPage() {
  return (
    <>
      <DocsShell>
        <article className="prose prose-neutral max-w-none">
          <h1>Welcome to INDXR</h1>

          {/* KHIDR: instructional content komt hier */}
          <p className="lead text-[var(--fg-subtle)]">
            INDXR lets you extract, search, and export YouTube transcripts — in seconds, in any format.
          </p>

          <h2>What you can do</h2>
          <ul>
            <li>Extract transcripts from any public YouTube video</li>
            <li>Export in plain text, Markdown, CSV, SRT, JSON, or RAG-optimized JSON</li>
            <li>Transcribe videos that have no captions using AI transcription</li>
            <li>Process entire playlists in bulk</li>
            <li>Save transcripts to your Library and organize them in Collections</li>
          </ul>

          <h2>Quick start</h2>
          <ol>
            <li>Paste a YouTube URL into the <a href="/youtube-transcript-generator">free tool</a> or the <a href="/dashboard/transcribe">Transcribe page</a> in your dashboard.</li>
            <li>INDXR extracts the transcript — usually within a few seconds.</li>
            <li>Choose your export format and download or copy the result.</li>
          </ol>

          {/* KHIDR: instructional content komt hier — voeg screenshots, GIFs of stap-voor-stap tutorial toe */}

          <h2>Next steps</h2>
          <ul>
            <li><a href="/youtube-transcript-not-available">What to do if a transcript is not available</a></li>
            <li><a href="/youtube-transcript-csv">Export to CSV</a></li>
            <li><a href="/youtube-transcript-obsidian">Use transcripts in Obsidian</a></li>
          </ul>
        </article>
      </DocsShell>
      <Footer />
    </>
  )
}
