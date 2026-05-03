import type { Metadata } from "next"
import Link from "next/link"
import { Footer } from "@/components/Footer"

export const metadata: Metadata = {
  title: "Articles — YouTube Transcript Guides & Tutorials | INDXR.AI",
  description: "Guides, tutorials, and reference articles on YouTube transcripts — formats, workflows, troubleshooting, and AI transcription.",
}

const articles = [
  // Troubleshooting
  { href: "/articles/youtube-transcript-not-available", label: "YouTube Transcript Not Available?", category: "Troubleshooting" },
  { href: "/articles/youtube-age-restricted-transcript", label: "Age-Restricted Videos", category: "Troubleshooting" },
  { href: "/articles/youtube-members-only-transcript", label: "Members-Only Videos", category: "Troubleshooting" },
  { href: "/articles/youtube-transcript-non-english", label: "Non-English Transcripts", category: "Troubleshooting" },
  { href: "/articles/youtube-transcript-without-extension", label: "Without Browser Extension", category: "Troubleshooting" },

  // Formats & Export
  { href: "/articles/youtube-to-text", label: "Plain Text (TXT)", category: "Export Formats" },
  { href: "/articles/youtube-transcript-markdown", label: "Markdown Transcripts", category: "Export Formats" },
  { href: "/articles/youtube-transcript-csv", label: "CSV Export", category: "Export Formats" },
  { href: "/articles/youtube-srt-download", label: "SRT / VTT Subtitles", category: "Export Formats" },
  { href: "/articles/youtube-transcript-json", label: "JSON Export", category: "Export Formats" },
  { href: "/articles/youtube-transcript-for-rag", label: "RAG-Optimized JSON", category: "Export Formats" },

  // Workflows & Use Cases
  { href: "/articles/bulk-youtube-transcript", label: "Bulk Transcript Extraction", category: "Workflows" },
  { href: "/articles/youtube-playlist-transcript", label: "Playlist Transcripts", category: "Workflows" },
  { href: "/articles/audio-to-text", label: "Audio File Transcription", category: "Workflows" },
  { href: "/articles/youtube-transcript-obsidian", label: "Obsidian Workflow", category: "Workflows" },

  // Deep Dives
  { href: "/articles/chunk-youtube-transcripts-for-rag", label: "Chunking Transcripts for RAG", category: "Deep Dives" },
  { href: "/articles/youtube-channel-knowledge-base", label: "Building a YouTube Knowledge Base", category: "Deep Dives" },
  { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in Vector Databases", category: "Deep Dives" },
]

const categories = Array.from(new Set(articles.map((a) => a.category)))

export default function ArticlesPage() {
  return (
    <>
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--fg)] mb-3">
          Articles
        </h1>
        <p className="text-[var(--fg-muted)] mb-12">
          Guides, tutorials, and reference on YouTube transcripts — formats, workflows, troubleshooting, and AI transcription.
        </p>

        <div className="space-y-12">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--fg-muted)] mb-4">
                {category}
              </h2>
              <ul className="space-y-2">
                {articles
                  .filter((a) => a.category === category)
                  .map((article) => (
                    <li key={article.href}>
                      <Link
                        href={article.href}
                        className="text-sm text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors"
                      >
                        {article.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
