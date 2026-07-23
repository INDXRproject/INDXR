import type { Metadata } from "next"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { PageHeader } from "@indxr/shared/components/PageHeader"
import { SectionLabel } from "@indxr/shared/components/SectionLabel"
import { ContentCard } from "@/components/content/ContentCard"
import { EditorialImage } from "@/components/content/EditorialImage"
import { editorialAlt, hasEditorialImage } from "@/lib/editorialAlts"

export const metadata: Metadata = {
  alternates: { canonical: "/articles" },
  title: "Articles — YouTube Transcript Guides & Tutorials | INDXR.AI",
  description: "Guides, tutorials, and reference articles on YouTube transcripts — formats, workflows, troubleshooting, and AI transcription.",
}

// description = the article's own metadata description (opening line), not newly written.
// category = a stable internal grouping key; the shown section label is CATEGORY_LABEL below.
const articles = [
  // Troubleshooting
  { href: "/articles/youtube-transcript-not-available", label: "YouTube Transcript Not Available?", category: "Troubleshooting", description: "Missing or not showing? Every reason — and how to get the text anyway." },
  { href: "/articles/youtube-age-restricted-transcript", label: "Age-Restricted Videos", category: "Troubleshooting", description: "Age-restricted videos need authentication, so standard tools fail. Here's the workaround." },
  { href: "/articles/youtube-members-only-transcript", label: "Members-Only Videos", category: "Troubleshooting", description: "Members-only videos are access-restricted by design — what you can and can't do." },
  { href: "/articles/youtube-transcript-non-english", label: "Non-English Transcripts", category: "Troubleshooting", description: "Arabic, Spanish, Portuguese, Indonesian, Turkish — captions vs. AI transcription." },
  { href: "/articles/youtube-transcript-without-extension", label: "Without Browser Extension", category: "Troubleshooting", description: "Chrome extensions break when YouTube changes its UI. INDXR works in any browser." },

  // Formats (internal key: Export Formats)
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
    <div className="relative min-h-screen bg-[var(--bg)]">
      {/* Same very-light honeycomb page texture as the Library, so the mid-tone photos sit on a
          surface instead of floating on flat near-white / near-black. */}
      <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />

      <main className="relative container mx-auto px-4 pb-20 max-w-5xl">
        <PageHeader
          eyebrow="Library"
          title="Articles"
          lead="Guides, tutorials, and reference on YouTube transcripts — formats, workflows, troubleshooting, and AI transcription."
        />

        <div className="space-y-14">
          {categories.map((category) => (
            <section key={category}>
              <SectionLabel label={CATEGORY_LABEL[category] ?? category} />
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
      </main>
    </div>
  )
}
