import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://indxr.ai'

const nextConfig: NextConfig = {
  transpilePackages: ["@indxr/shared"],
  async redirects() {
    return [
      { source: '/login',           destination: `${MARKETING_URL}/login`,           permanent: true },
      { source: '/signup',          destination: `${MARKETING_URL}/signup`,          permanent: true },
      { source: '/forgot-password', destination: `${MARKETING_URL}/forgot-password`, permanent: true },
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
