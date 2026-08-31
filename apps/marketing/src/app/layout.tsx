import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@indxr/shared/components/Header";
import { Footer } from "@indxr/shared/components/Footer";
import { AuthProvider } from "@indxr/shared/contexts/AuthContext";
import { PostHogProvider } from "@indxr/shared/providers/PostHogProvider";
import { AcquisitionCapture } from "@indxr/shared/components/AcquisitionCapture";
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
  metadataBase: new URL('https://indxr.ai'),
  title: "INDXR.AI — Accurate transcripts from audio, video and YouTube",
  description: "Upload a recording or paste a link. Get an accurate, speaker-labelled transcript you can edit, search and export. Credits, no subscription — they never expire.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
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
                <AcquisitionCapture />
                <Header />
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Footer />
              </AuthProvider>
            </ConsentProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
