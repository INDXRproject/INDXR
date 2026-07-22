import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3001';

// PostHog first-party reverse proxy (EU). Ingest-target env-gedreven met EU-fallback;
// assets-host per PostHog-docs (eu-assets.i.posthog.com). Zie posthog.com/docs/advanced/proxy/nextjs.
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const POSTHOG_ASSETS = 'https://eu-assets.i.posthog.com';

const nextConfig: NextConfig = {
  transpilePackages: ["@indxr/shared"],
  // Vereist door de PostHog-proxy: ingestion-endpoints (bijv. /e/) gebruiken trailing slashes;
  // zonder dit redirect Next.js die weg en breekt event-capture.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: `${POSTHOG_ASSETS}/static/:path*` },
      { source: '/ingest/array/:path*', destination: `${POSTHOG_ASSETS}/array/:path*` },
      { source: '/ingest/:path*', destination: `${POSTHOG_HOST}/:path*` },
    ];
  },
  async redirects() {
    return [
      // Docs restructure: how-indxr-works 15 → 11 pages (ADR-072)
      { source: '/docs/how-indxr-works/credits', destination: '/docs/account-and-data/credits-and-billing', permanent: true },
      { source: '/docs/how-indxr-works/accuracy/auto-captions', destination: '/docs/how-indxr-works/accuracy', permanent: true },
      { source: '/docs/how-indxr-works/accuracy/ai-transcription', destination: '/docs/how-indxr-works/accuracy', permanent: true },
      { source: '/docs/how-indxr-works/languages', destination: '/docs/how-indxr-works/accuracy', permanent: true },
      { source: '/docs/how-indxr-works/api', destination: '/docs/how-indxr-works/limits', permanent: true },

      // Docs restructure: Help section removed, FAQ promoted to /docs/faq (ADR-073)
      { source: '/docs/help/how-to', destination: '/articles', permanent: true },
      { source: '/docs/help/troubleshooting', destination: '/articles', permanent: true },
      { source: '/docs/help/faq', destination: '/docs/faq', permanent: true },

      // Legacy URL cleanup
      { source: '/faq', destination: '/docs/faq', permanent: true },
      { source: '/account/credits', destination: `${APP_URL}/dashboard/account`, permanent: true },
      { source: '/how-it-works', destination: '/', permanent: true },

      // Renamed routes
      { source: '/youtube-transcript-generator', destination: '/transcribe', permanent: true },
      { source: '/support', destination: '/contact', permanent: true },

      // Articles migration (top-level SEO → /articles/*)
      { source: '/youtube-transcript-not-available', destination: '/articles/youtube-transcript-not-available', permanent: true },
      { source: '/youtube-age-restricted-transcript', destination: '/articles/youtube-age-restricted-transcript', permanent: true },
      { source: '/youtube-members-only-transcript', destination: '/articles/youtube-members-only-transcript', permanent: true },
      { source: '/youtube-transcript-non-english', destination: '/articles/youtube-transcript-non-english', permanent: true },
      { source: '/youtube-transcript-without-extension', destination: '/articles/youtube-transcript-without-extension', permanent: true },
      { source: '/bulk-youtube-transcript', destination: '/articles/bulk-youtube-transcript', permanent: true },
      { source: '/youtube-playlist-transcript', destination: '/articles/youtube-playlist-transcript', permanent: true },
      { source: '/audio-to-text', destination: '/articles/audio-to-text', permanent: true },
      { source: '/youtube-to-text', destination: '/articles/youtube-to-text', permanent: true },
      { source: '/youtube-transcript-markdown', destination: '/articles/youtube-transcript-markdown', permanent: true },
      { source: '/youtube-transcript-csv', destination: '/articles/youtube-transcript-csv', permanent: true },
      { source: '/youtube-srt-download', destination: '/articles/youtube-srt-download', permanent: true },
      { source: '/youtube-transcript-json', destination: '/articles/youtube-transcript-json', permanent: true },
      { source: '/youtube-transcript-for-rag', destination: '/articles/youtube-transcript-for-rag', permanent: true },
      { source: '/youtube-transcript-obsidian', destination: '/articles/youtube-transcript-obsidian', permanent: true },
      { source: '/blog/chunk-youtube-transcripts-for-rag', destination: '/articles/chunk-youtube-transcripts-for-rag', permanent: true },
      { source: '/blog/youtube-channel-knowledge-base', destination: '/articles/youtube-channel-knowledge-base', permanent: true },
      { source: '/blog/youtube-transcripts-vector-database', destination: '/articles/youtube-transcripts-vector-database', permanent: true },

      // Docs URL hernesting (2026-05-04 — flat → categorical). Targets that were later
      // removed (ADR-072/073) now point straight at the final route — one hop, no chain.
      { source: '/docs/credits', destination: '/docs/account-and-data/credits-and-billing', permanent: true },
      { source: '/docs/accuracy', destination: '/docs/how-indxr-works/accuracy', permanent: true },
      { source: '/docs/accuracy/auto-captions', destination: '/docs/how-indxr-works/accuracy', permanent: true },
      { source: '/docs/accuracy/ai-transcription', destination: '/docs/how-indxr-works/accuracy', permanent: true },
      { source: '/docs/export-formats', destination: '/docs/how-indxr-works/export-formats', permanent: true },
      { source: '/docs/export-formats/txt', destination: '/docs/how-indxr-works/export-formats/txt', permanent: true },
      { source: '/docs/export-formats/markdown', destination: '/docs/how-indxr-works/export-formats/markdown', permanent: true },
      { source: '/docs/export-formats/csv', destination: '/docs/how-indxr-works/export-formats/csv', permanent: true },
      { source: '/docs/export-formats/srt', destination: '/docs/how-indxr-works/export-formats/srt', permanent: true },
      { source: '/docs/export-formats/vtt', destination: '/docs/how-indxr-works/export-formats/vtt', permanent: true },
      { source: '/docs/export-formats/json', destination: '/docs/how-indxr-works/export-formats/json', permanent: true },
      { source: '/docs/languages', destination: '/docs/how-indxr-works/accuracy', permanent: true },
      { source: '/docs/limits', destination: '/docs/how-indxr-works/limits', permanent: true },
      { source: '/docs/api', destination: '/docs/how-indxr-works/limits', permanent: true },
      { source: '/docs/account', destination: '/docs/account-and-data/credits-and-billing', permanent: true },
      { source: '/docs/privacy-handling', destination: '/docs/account-and-data/data-handling', permanent: true },
      // ADR-073 cleanup: these legacy flat paths pointed at /docs/help/* which is now removed.
      // Flattened straight to the final target. `/docs/faq` is now a REAL page, so it must NOT be
      // a redirect source — the old `/docs/faq → /docs/help/faq` rule caused an infinite loop
      // (with `/docs/help/faq → /docs/faq`) and is deleted.
      { source: '/docs/how-to', destination: '/articles', permanent: true },
      { source: '/docs/troubleshooting', destination: '/articles', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
    proxyClientMaxBodySize: '30mb',
  },
};

export default withSentryConfig(nextConfig, {
  org: "indxrai",
  project: "indxr-frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
