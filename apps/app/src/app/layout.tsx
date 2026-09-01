import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@indxr/shared/contexts/AuthContext";
import { PostHogProvider } from "@indxr/shared/providers/PostHogProvider";
import { ThemeProvider } from "@indxr/shared/components/theme-provider";
import { ConsentProvider } from "@indxr/shared/providers/ConsentProvider";
import { regionFromCountry } from "@indxr/shared/lib/consent";
import { createClient } from "@indxr/shared/utils/supabase/server";
import { headers } from "next/headers";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://app.indxr.ai'),
  title: "INDXR.AI - Dashboard",
  description: "Manage your YouTube transcripts and credits",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  // iOS reads these instead of the manifest — without them the home-screen icon opens Safari with the
  // address bar (Next emits apple-mobile-web-app-capable/-title/-status-bar-style + mobile-web-app-capable).
  appleWebApp: {
    capable: true,
    title: "INDXR",
    statusBarStyle: "default",
  },
  // Next 16 emits only the modern `mobile-web-app-capable`; iOS Safari still primarily reads the
  // legacy `apple-mobile-web-app-capable`, so add it explicitly (else the icon opens Safari with the bar).
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

// Theme-aware chrome for the live app; the manifest splash background_color uses the dark --bg token.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#110e0b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Geo for consent default (Vercel injects x-vercel-ip-country). Layout is already
  // dynamic via getUser(), so reading headers() is free. Absent → 'eea' (safe default).
  const region = regionFromCountry((await headers()).get("x-vercel-ip-country"));

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-fg-on-accent focus:rounded"
        >
          Skip to content
        </a>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PostHogProvider>
            <ConsentProvider region={region}>
              <AuthProvider initialUser={user}>
                {children}
              </AuthProvider>
            </ConsentProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
