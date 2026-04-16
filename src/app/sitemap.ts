import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://indxr.ai";

  const staticPages = [
    { route: "", priority: 1.0 },
    { route: "/pricing", priority: 0.8 },
    { route: "/faq", priority: 0.6 },
    { route: "/support", priority: 0.6 },
    { route: "/login", priority: 0.5 },
    { route: "/signup", priority: 0.5 },
  ];

  const toolPages = [
    { route: "/youtube-transcript-generator", priority: 1.0 },
    { route: "/youtube-to-text", priority: 0.7 },
    { route: "/youtube-playlist-transcript", priority: 0.7 },
    { route: "/bulk-youtube-transcript", priority: 0.7 },
    { route: "/audio-to-text", priority: 0.7 },
    { route: "/how-it-works", priority: 0.7 },
    { route: "/youtube-transcript-without-extension", priority: 0.7 },
  ];

  const featurePages = [
    { route: "/youtube-transcript-not-available", priority: 0.7 },
    { route: "/youtube-transcript-markdown", priority: 0.7 },
    { route: "/youtube-transcript-json", priority: 0.7 },
    { route: "/youtube-transcript-for-rag", priority: 0.7 },
    { route: "/youtube-transcript-obsidian", priority: 0.7 },
    { route: "/youtube-transcript-csv", priority: 0.7 },
    { route: "/youtube-srt-download", priority: 0.7 },
    { route: "/youtube-members-only-transcript", priority: 0.7 },
    { route: "/youtube-age-restricted-transcript", priority: 0.7 },
  ];

  const alternativePages = [
    { route: "/alternative/downsub", priority: 0.7 },
    { route: "/alternative/notegpt", priority: 0.7 },
    { route: "/alternative/turboscribe", priority: 0.7 },
    { route: "/alternative/tactiq", priority: 0.7 },
    { route: "/alternative/happyscribe", priority: 0.7 },
  ];

  const blogPages = [
    { route: "/blog/chunk-youtube-transcripts-for-rag", priority: 0.7 },
    { route: "/blog/youtube-channel-knowledge-base", priority: 0.7 },
    { route: "/blog/youtube-transcripts-vector-database", priority: 0.7 },
  ];

  const allPages = [
    ...staticPages,
    ...toolPages,
    ...featurePages,
    ...alternativePages,
    ...blogPages,
  ];

  return allPages.map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority,
  }));
}
