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
    // Pre-launch: never submitted to Search Console, no external inbound links. All redirects
    // from our own restructures were dead weight and are removed (ADR-075). Internal links point
    // straight at the real route. Only two rules survive:
    //   1. cross-host: /account/credits → the app's account page (functional, not a doc move)
    //   2. /faq → /docs/faq (a short URL people type)
    return [
      { source: '/account/credits', destination: `${APP_URL}/dashboard/account`, permanent: true },
      { source: '/faq', destination: '/docs/faq', permanent: true },
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
