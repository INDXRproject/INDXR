import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3001';

// PostHog first-party reverse proxy (EU). Ingest-target env-gedreven met EU-fallback;
// assets-host per PostHog-docs (eu-assets.i.posthog.com). Zie posthog.com/docs/advanced/proxy/nextjs.
// LET OP: project 298689 leeft in de EU. NEXT_PUBLIC_POSTHOG_HOST MOET de EU-ingest-host zijn
// (eu.i.posthog.com) — nooit us.i.posthog.com, anders verlaten events de EU (privacyverklaring claimt
// EU-verwerking). Leeg laten = de EU-default hieronder. (2026-09-02: lokale .env.local stond fout op us;
// prod bleek al EU — geverifieerd dat indxr.ai/ingest in het EU-project landt.)
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
    // Pre-launch: never submitted to Search Console, no external inbound links. All redirects
    // from our own restructures were dead weight and are removed (ADR-075). Internal links point
    // straight at the real route. Two functional rules survive:
    //   1. cross-host: /account/credits → the app's account page (functional, not a doc move)
    //   2. /faq → /docs/faq (a short URL people type)
    //
    // Article consolidation (2026-08-07, keyword-demand-2026-08 § "Artikeloordeel"): 9 article
    // slugs merged away. Each vanished slug gets a permanent (308) redirect straight to its
    // endpoint — no chains. Internal links already point at the endpoint; these are the safety net.
    return [
      { source: '/account/credits', destination: `${APP_URL}/dashboard/account`, permanent: true },
      { source: '/faq', destination: '/docs/faq', permanent: true },

      // Bulk → Playlist (absorbed)
      { source: '/articles/bulk-youtube-transcript', destination: '/articles/youtube-playlist-transcript', permanent: true },
      // Access restrictions → Transcript Not Available (absorbed / dropped)
      { source: '/articles/youtube-age-restricted-transcript', destination: '/articles/youtube-transcript-not-available', permanent: true },
      { source: '/articles/youtube-members-only-transcript', destination: '/articles/youtube-transcript-not-available', permanent: true },
      // Six format articles → single export-formats hub
      { source: '/articles/youtube-to-text', destination: '/articles/transcript-export-formats', permanent: true },
      { source: '/articles/youtube-transcript-markdown', destination: '/articles/transcript-export-formats', permanent: true },
      { source: '/articles/youtube-transcript-csv', destination: '/articles/transcript-export-formats', permanent: true },
      { source: '/articles/youtube-srt-download', destination: '/articles/transcript-export-formats', permanent: true },
      { source: '/articles/youtube-transcript-json', destination: '/articles/transcript-export-formats', permanent: true },
      { source: '/articles/youtube-transcript-for-rag', destination: '/articles/transcript-export-formats', permanent: true },

      // Slug rename (2026-08-25): article rewritten from an Obsidian-specific angle to the broader
      // "YouTube to notes" keyword (keyword-demand-2026-08 § Meting 3). Single 308 hop; the old slug
      // was never a redirect destination, so no chain.
      { source: '/articles/youtube-transcript-obsidian', destination: '/articles/youtube-to-notes', permanent: true },

      // "Without extension" article removed (2026-08-27): no search-query or unique value beyond the
      // core "no plugin, runs in the browser" message, which the FAQ carries verbatim. 308 straight to
      // that Q&A anchor (a live 200 page → single hop, no chain).
      { source: '/articles/youtube-transcript-without-extension', destination: '/docs/faq#do-i-need-a-browser-extension', permanent: true },
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
