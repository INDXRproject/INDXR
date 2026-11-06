import type { Metadata } from "next"
import { ContentCard } from "@/components/content/ContentCard"
import { EditorialImage } from "@/components/content/EditorialImage"
import { editorialAlt, hasEditorialImage } from "@/lib/editorialAlts"
import { pageOg } from "@/lib/pageOg"

export const metadata: Metadata = {
  alternates: { canonical: "/articles" },
  title: "Articles — Audio, Video and YouTube Transcript Guides | INDXR.AI",
  description: "Guides, tutorials, and reference on transcribing audio, video and YouTube — formats, workflows, troubleshooting, and AI transcription.",
  ...pageOg("/articles"),
}

// description = the article's own metadata description (opening line), not newly written.
// category = a stable internal grouping key; the shown section label is CATEGORY_LABEL below.
const articles = [
  // Troubleshooting
  { href: "/articles/youtube-transcript-not-available", label: "YouTube Transcript Not Available?", category: "Troubleshooting", description: "Missing or not showing? Every reason — and how to get the text anyway." },
  { href: "/articles/youtube-transcript-non-english", label: "Non-English Transcripts", category: "Troubleshooting", description: "Arabic, Spanish, Portuguese, Indonesian, Turkish — captions vs. AI transcription." },

  // Formats (internal key: Export Formats)
  { href: "/articles/transcript-export-formats", label: "Transcript Export Formats", category: "Export Formats", description: "Every export format — plain text, Markdown, CSV, SRT/VTT, JSON, and RAG-optimized JSON." },
  { href: "/articles/srt-generator", label: "SRT Generator", category: "Export Formats", description: "Create an SRT or VTT subtitle file from a video, a link or an audio recording: re-timed per word and regrouped into readable, broadcast-standard cues." },

  // Reference
  { href: "/articles/supported-formats", label: "Supported Formats", category: "Reference", description: "Every input format INDXR transcribes — M4A, WAV, OGG, OPUS, FLAC, MP4, MKV, MOV and more. What each one is, where it comes from, and what happens to it." },

  // Workflows & Use Cases
  { href: "/articles/youtube-playlist-transcript", label: "Playlist Transcripts", category: "Workflows", description: "Extract a whole playlist in one job — first 3 YouTube caption videos free." },
  { href: "/articles/audio-to-text", label: "Audio File Transcription", category: "Workflows", description: "Transcribe any audio or video file to text: punctuated, split by speaker, timestamped. One credit per minute." },
  { href: "/articles/video-to-text", label: "Video File Transcription", category: "Workflows", description: "Transcribe any video file to text: the audio track is taken out for you, punctuated, split by speaker, timestamped, and exportable as subtitles." },
  { href: "/articles/youtube-video-summarizer", label: "YouTube Video Summarizer", category: "Workflows", description: "Summarize a YouTube video into chapter notes with clickable timestamps: an overview plus worked-out chapters that scale with the video's length." },
  { href: "/articles/youtube-to-notes", label: "YouTube to Notes", category: "Workflows", description: "Turn a video into a structured summary with chapters and timestamps, edit it into your own version, and export it as Markdown for Obsidian, Notion or any note app." },

  // AI & RAG (internal key: Deep Dives)
  { href: "/articles/chunk-youtube-transcripts-for-rag", label: "Chunking Transcripts for RAG", category: "Deep Dives", description: "The chunk size you pick matters more than your embedding model." },
  { href: "/articles/youtube-channel-knowledge-base", label: "Building a YouTube Knowledge Base", category: "Deep Dives", description: "Extract a whole channel, embed it, and build semantic search over years of video." },
  { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in Vector Databases", category: "Deep Dives", description: "Step-by-step: extract transcripts, generate embeddings, store, and query in natural language." },
]

const categories = Array.from(new Set(articles.map((a) => a.category)))

// Shown section label per internal category key. The keys stay put (they're the article
// `category` prop identifiers, not URL slugs); only the displayed name changed.
const CATEGORY_LABEL: Record<string, string> = {
  "Troubleshooting": "Troubleshooting",
  "Export Formats": "Formats",
  "Workflows": "Workflows",
  "Deep Dives": "AI & RAG",
}

// Card image renders at ~325px in the 3-col desktop grid; 400 covers 1x, 800 covers 2x.
const CARD_SIZES = "(min-width: 1024px) 325px, (min-width: 640px) 48vw, 92vw"

export default function ArticlesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-[104px] sm:px-6 lg:pt-[120px]">
        {/* Stijl B (2026-11-06): mono label + big title, no page texture. */}
        <header className="mb-14 border-b-2 border-[var(--fg-strong)] pb-10">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">Articles</p>
          <h1 className="mt-4 text-5xl font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-7xl">
            Guides for everything you transcribe.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--fg-subtle)]">
            Guides, tutorials, and reference on transcribing audio, video and YouTube — formats, workflows,
            troubleshooting, and AI transcription.
          </p>
        </header>

        <div className="space-y-14">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="mb-5 font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]">{CATEGORY_LABEL[category] ?? category}</h2>
              <ul className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {articles
                  .filter((a) => a.category === category)
                  .map((article) => {
                    const slug = article.href.split("/").pop() ?? ""
                    return (
                      <li key={article.href}>
                        <ContentCard
                          href={article.href}
                          title={article.label}
                          description={article.description}
                          media={
                            hasEditorialImage(slug) ? (
                              <EditorialImage
                                slug={slug}
                                alt={editorialAlt(slug)}
                                widths={[400, 800]}
                                sizes={CARD_SIZES}
                                rounded="rounded-none"
                                bordered={false}
                              />
                            ) : (
                              <div className="aspect-video bg-[var(--surface-sunken)]" />
                            )
                          }
                        />
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
        </div>

        {/* Comparisons live in the separate /alternatives namespace (ADR-105), not as articles. Linked
            here as a distinct line rather than a card so the article grid stays purely editorial while
            the comparison page still gets an inbound link from this well-crawled hub. */}
        <div className="mt-14 border-t-2 border-[var(--fg-strong)] pt-8 text-sm text-[var(--fg-muted)]">
          Comparing INDXR with another tool?{" "}
          <a href="/alternatives/otter-ai" className="text-[var(--link)] underline-offset-2 hover:underline">
            INDXR vs Otter.ai
          </a>
          .
        </div>
      </main>
    </div>
  )
}
