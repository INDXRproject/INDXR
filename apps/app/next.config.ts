import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://indxr.ai'

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
    return [
      { source: '/login',           destination: `${MARKETING_URL}/login`,           permanent: true },
      { source: '/signup',          destination: `${MARKETING_URL}/signup`,          permanent: true },
      { source: '/forgot-password', destination: `${MARKETING_URL}/forgot-password`, permanent: true },
      // Billing → Credits rename (ADR-084). Query (?checkout=…) is preserved by Next automatically.
      { source: '/dashboard/billing',          destination: '/dashboard/credits',          permanent: true },
      { source: '/dashboard/billing/:path*',   destination: '/dashboard/credits/:path*',   permanent: true },
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
