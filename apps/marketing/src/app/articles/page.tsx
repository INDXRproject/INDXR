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
  { href: "/articles/youtube-transcript-non-english", label: "Non-English Transcripts", category: "Troubleshooting", description: "Arabic, Spanish, Portuguese, Indonesian, Turkish — captions vs. AI transcription." },
  { href: "/articles/youtube-transcript-without-extension", label: "Without Browser Extension", category: "Troubleshooting", description: "Chrome extensions break when YouTube changes its UI. INDXR works in any browser." },

  // Formats (internal key: Export Formats)
  { href: "/articles/transcript-export-formats", label: "Transcript Export Formats", category: "Export Formats", description: "Every export format — plain text, Markdown, CSV, SRT/VTT, JSON, and RAG-optimized JSON." },

  // Workflows & Use Cases
  { href: "/articles/youtube-playlist-transcript", label: "Playlist Transcripts", category: "Workflows", description: "Extract a whole playlist in one job — first 3 YouTube caption videos free." },
  { href: "/articles/audio-to-text", label: "Audio File Transcription", category: "Workflows", description: "Transcribe any audio or video file to text: punctuated, split by speaker, timestamped. One credit per minute." },
  { href: "/articles/video-to-text", label: "Video File Transcription", category: "Workflows", description: "Transcribe any video file to text: the audio track is taken out for you, punctuated, split by speaker, timestamped, and exportable as subtitles." },
  { href: "/articles/youtube-video-summarizer", label: "YouTube Video Summarizer", category: "Workflows", description: "Summarize a YouTube video into chapter notes with clickable timestamps: an overview plus worked-out chapters that scale with the video's length." },
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
