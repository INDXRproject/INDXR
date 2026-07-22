import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://indxr.ai";

  const marketingPages = [
    { route: "", priority: 1.0 },
    { route: "/pricing", priority: 0.8 },
    { route: "/transcribe", priority: 1.0 },
    { route: "/about", priority: 0.6 },
    { route: "/contact", priority: 0.5 },
    { route: "/privacy", priority: 0.4 },
    { route: "/terms", priority: 0.4 },
    { route: "/login", priority: 0.5 },
    { route: "/signup", priority: 0.5 },
  ];

  const docsPages = [
    { route: "/docs", priority: 0.7 },
    { route: "/docs/getting-started", priority: 0.7 },
    // How INDXR works
    { route: "/docs/how-indxr-works/overview", priority: 0.6 },
    { route: "/docs/how-indxr-works/accuracy", priority: 0.5 },
    { route: "/docs/how-indxr-works/export-formats", priority: 0.6 },
    { route: "/docs/how-indxr-works/export-formats/txt", priority: 0.5 },
    { route: "/docs/how-indxr-works/export-formats/markdown", priority: 0.5 },
    { route: "/docs/how-indxr-works/export-formats/csv", priority: 0.5 },
    { route: "/docs/how-indxr-works/export-formats/srt", priority: 0.5 },
    { route: "/docs/how-indxr-works/export-formats/vtt", priority: 0.5 },
    { route: "/docs/how-indxr-works/export-formats/json", priority: 0.5 },
    { route: "/docs/how-indxr-works/summaries", priority: 0.5 },
    { route: "/docs/how-indxr-works/limits", priority: 0.5 },
    // Account & data
    { route: "/docs/account-and-data/credits-and-billing", priority: 0.5 },
    { route: "/docs/account-and-data/data-handling", priority: 0.5 },
    // FAQ (promoted to top-level, ADR-073; how-to + troubleshooting removed → /articles)
    { route: "/docs/faq", priority: 0.6 },
  ];

  const articlesPages = [
    { route: "/articles", priority: 0.7 },
    // Troubleshooting
    { route: "/articles/youtube-transcript-not-available", priority: 0.8 },
    { route: "/articles/youtube-age-restricted-transcript", priority: 0.7 },
    { route: "/articles/youtube-members-only-transcript", priority: 0.7 },
    { route: "/articles/youtube-transcript-non-english", priority: 0.7 },
    { route: "/articles/youtube-transcript-without-extension", priority: 0.7 },
    // Workflows & use cases
    { route: "/articles/bulk-youtube-transcript", priority: 0.7 },
    { route: "/articles/youtube-playlist-transcript", priority: 0.7 },
    { route: "/articles/audio-to-text", priority: 0.7 },
    { route: "/articles/youtube-transcript-obsidian", priority: 0.7 },
    // Export formats
    { route: "/articles/youtube-to-text", priority: 0.7 },
    { route: "/articles/youtube-transcript-markdown", priority: 0.7 },
    { route: "/articles/youtube-transcript-csv", priority: 0.7 },
    { route: "/articles/youtube-srt-download", priority: 0.7 },
    { route: "/articles/youtube-transcript-json", priority: 0.7 },
    { route: "/articles/youtube-transcript-for-rag", priority: 0.7 },
    // Deep dives
    { route: "/articles/chunk-youtube-transcripts-for-rag", priority: 0.7 },
    { route: "/articles/youtube-channel-knowledge-base", priority: 0.7 },
    { route: "/articles/youtube-transcripts-vector-database", priority: 0.7 },
  ];

  const allPages = [
    ...marketingPages,
    ...docsPages,
    ...articlesPages,
  ];

  return allPages.map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority,
  }));
}
