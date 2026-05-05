import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@indxr/shared/components/Header";
import { Toaster } from "@indxr/shared/components/ui/sonner";
import { AuthProvider } from "@indxr/shared/contexts/AuthContext";
import { PostHogProvider } from "@indxr/shared/providers/PostHogProvider";
import { ThemeProvider } from "@indxr/shared/components/theme-provider";
import { createClient } from "@indxr/shared/utils/supabase/server";

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
            <AuthProvider initialUser={user}>
              <Header />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Toaster />
            </AuthProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
