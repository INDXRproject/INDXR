import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy URL cleanup
      { source: '/faq', destination: '/docs/faq', permanent: true },
      { source: '/account/credits', destination: '/dashboard/account', permanent: true },
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
