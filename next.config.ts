import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
