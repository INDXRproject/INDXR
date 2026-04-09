import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://indxr.ai";

  // Static marketing pages
  const staticPages = [
    "",
    "/pricing",
    "/faq",
    "/support",
    "/login",
    "/signup",
  ];

  // SEO landing pages
  const seoPages = [
    "/youtube-transcript-downloader",
    "/youtube-transcript-generator",
    "/youtube-playlist-transcript",
    "/bulk-youtube-transcript",
    "/youtube-srt-download",
    "/youtube-transcript-without-extension",
    "/audio-to-text",
    "/alternative/downsub",
    "/alternative/tactiq",
  ];

  const allPages = [...staticPages, ...seoPages];

  return allPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/alternative") ? 0.6 : 0.8,
  }));
}
