import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  alternates: { canonical: "/articles" },
  title: "Articles — YouTube Transcript Guides & Tutorials | INDXR.AI",
  description: "Guides, tutorials, and reference articles on YouTube transcripts — formats, workflows, troubleshooting, and AI transcription.",
}

// description = the article's own metadata description (opening line), not newly written.
const articles = [
  // Troubleshooting
  { href: "/articles/youtube-transcript-not-available", label: "YouTube Transcript Not Available?", category: "Troubleshooting", description: "Missing or not showing? Every reason — and how to get the text anyway." },
  { href: "/articles/youtube-age-restricted-transcript", label: "Age-Restricted Videos", category: "Troubleshooting", description: "Age-restricted videos need authentication, so standard tools fail. Here's the workaround." },
  { href: "/articles/youtube-members-only-transcript", label: "Members-Only Videos", category: "Troubleshooting", description: "Members-only videos are access-restricted by design — what you can and can't do." },
  { href: "/articles/youtube-transcript-non-english", label: "Non-English Transcripts", category: "Troubleshooting", description: "Arabic, Spanish, Portuguese, Indonesian, Turkish — captions vs. AI transcription." },
  { href: "/articles/youtube-transcript-without-extension", label: "Without Browser Extension", category: "Troubleshooting", description: "Chrome extensions break when YouTube changes its UI. INDXR works in any browser." },

  // Formats & Export
  { href: "/articles/youtube-to-text", label: "Plain Text (TXT)", category: "Export Formats", description: "Most tools give you raw caption fragments. INDXR groups them into readable paragraphs." },
  { href: "/articles/youtube-transcript-markdown", label: "Markdown Transcripts", category: "Export Formats", description: "Clean Markdown with YAML frontmatter and clickable timestamp deep links." },
  { href: "/articles/youtube-transcript-csv", label: "CSV Export", category: "Export Formats", description: "One row per segment with timestamps, text, and word count. UTF-8 BOM for Excel." },
  { href: "/articles/youtube-srt-download", label: "SRT / VTT Subtitles", category: "Export Formats", description: "Subtitles with professional timing — 3–7 second segments, 42 characters per line." },
  { href: "/articles/youtube-transcript-json", label: "JSON Export", category: "Export Formats", description: "Structured JSON with video metadata, start/end timestamps, and channel info." },
  { href: "/articles/youtube-transcript-for-rag", label: "RAG-Optimized JSON", category: "Export Formats", description: "Chunked JSON with 15% overlap and per-chunk deep links for Pinecone, Chroma, Weaviate." },

  // Workflows & Use Cases
  { href: "/articles/bulk-youtube-transcript", label: "Bulk Transcript Extraction", category: "Workflows", description: "Download transcripts from entire playlists in one extraction, with real-time progress." },
  { href: "/articles/youtube-playlist-transcript", label: "Playlist Transcripts", category: "Workflows", description: "Extract a whole playlist in one job — first 3 auto-caption videos free." },
  { href: "/articles/audio-to-text", label: "Audio File Transcription", category: "Workflows", description: "Upload any audio or video file and get a full transcript. 1 credit per minute." },
  { href: "/articles/youtube-transcript-obsidian", label: "Obsidian Workflow", category: "Workflows", description: "Markdown export with Dataview-compatible properties — no plugin required." },

  // Deep Dives
  { href: "/articles/chunk-youtube-transcripts-for-rag", label: "Chunking Transcripts for RAG", category: "Deep Dives", description: "The chunk size you pick matters more than your embedding model." },
  { href: "/articles/youtube-channel-knowledge-base", label: "Building a YouTube Knowledge Base", category: "Deep Dives", description: "Extract a whole channel, embed it, and build semantic search over years of video." },
  { href: "/articles/youtube-transcripts-vector-database", label: "Transcripts in Vector Databases", category: "Deep Dives", description: "Step-by-step: extract transcripts, generate embeddings, store, and query in natural language." },
]

const categories = Array.from(new Set(articles.map((a) => a.category)))

// Per-category accent token — same mapping as the article banners, so the index
// and the article headers read as one system.
const CATEGORY_TOKEN: Record<string, string> = {
  "Troubleshooting": "--warning",
  "Export Formats": "--accent",
  "Workflows": "--success",
  "Deep Dives": "--violet",
}

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

        <div className="space-y-14">
          {categories.map((category) => {
            const color = `var(${CATEGORY_TOKEN[category] ?? "--accent"})`
            return (
              <section key={category}>
                {/* Coloured eyebrow + hairline gives each category clear visual separation. */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
                    {category}
                  </h2>
                  <span className="h-px flex-1 bg-[var(--border)]" />
                </div>
                <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {articles
                    .filter((a) => a.category === category)
                    .map((article) => (
                      <li key={article.href}>
                        <Link
                          href={article.href}
                          className="group block rounded-lg -mx-3 px-3 py-2.5 hover:bg-[var(--surface)] transition-colors"
                        >
                          <span className="block text-sm font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                            {article.label}
                          </span>
                          <span className="block text-sm text-[var(--fg-muted)] leading-snug mt-0.5">{article.description}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            )
          })}
        </div>
      </main>
    </>
  )
}
