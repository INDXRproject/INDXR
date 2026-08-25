import { MetadataRoute } from "next";
import { SITEMAP_LASTMOD } from "./sitemap-lastmod";

// Route-set = de canonieke, indexeerbare publieke pagina's. URL's spiegelen exact
// de self-referencing canonical van elke pagina (baseUrl + route, geen trailing slash;
// homepage-canonical is eveneens https://indxr.ai zonder slash — geverifieerd live).
//
// GEEN priority/changefreq: Google negeert beide (Search Central). /login en /signup
// staan er bewust NIET in — het zijn geen zoeklandingspagina's.
//
// <lastmod> komt uit SITEMAP_LASTMOD (echte contentdata, in de repo). Een route zonder
// entry krijgt géén <lastmod> — nooit een buildstempel of Date.now() (zie sitemap-lastmod.ts).

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://indxr.ai";

  const routes = [
    // Marketing
    "",
    "/pricing",
    "/transcribe",
    "/about",
    "/contact",
    "/privacy",
    "/terms",

    // Docs — Getting started
    "/docs",
    "/docs/quickstart",
    "/docs/how-indxr-works",
    "/docs/faq",
    // Docs — Guides
    "/docs/guides/single-video",
    "/docs/guides/playlists",
    "/docs/guides/uploads",
    "/docs/guides/library",
    "/docs/guides/summaries",
    // Docs — Reference
    "/docs/reference/export-formats",
    "/docs/reference/export-formats/txt",
    "/docs/reference/export-formats/markdown",
    "/docs/reference/export-formats/csv",
    "/docs/reference/export-formats/srt",
    "/docs/reference/export-formats/vtt",
    "/docs/reference/export-formats/json",
    "/docs/reference/accuracy",
    "/docs/reference/limits",
    // Docs — Account
    "/docs/account/credits",
    "/docs/account/billing",
    "/docs/account/settings",

    // Articles
    "/articles",
    "/articles/youtube-transcript-not-available",
    "/articles/youtube-transcript-non-english",
    "/articles/youtube-transcript-without-extension",
    "/articles/transcript-export-formats",
    "/articles/youtube-playlist-transcript",
    "/articles/audio-to-text",
    "/articles/video-to-text",
    "/articles/youtube-video-summarizer",
    "/articles/youtube-to-notes",
    "/articles/chunk-youtube-transcripts-for-rag",
    "/articles/youtube-channel-knowledge-base",
    "/articles/youtube-transcripts-vector-database",
  ];

  return routes.map((route) => {
    const lastmod = SITEMAP_LASTMOD[route];
    return {
      url: `${baseUrl}${route}`,
      // Alleen een <lastmod> als er een echte contentdatum bekend is.
      ...(lastmod ? { lastModified: lastmod } : {}),
    };
  });
}
