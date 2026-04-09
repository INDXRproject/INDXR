import Link from "next/link";

const resources = [
  { href: "/youtube-transcript-downloader", label: "YouTube Transcript Downloader" },
  { href: "/youtube-playlist-transcript", label: "Playlist Transcripts" },
  { href: "/bulk-youtube-transcript", label: "Bulk Download" },
  { href: "/youtube-srt-download", label: "SRT Download" },
  { href: "/youtube-transcript-without-extension", label: "No Extension Needed" },
  { href: "/audio-to-text", label: "Audio to Text" },
];

const company = [
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="text-xl font-bold">
              INDXR.AI
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Extract YouTube transcripts instantly. Free, fast, no extension required.
            </p>
          </div>

          {/* Resources */}
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-4">Resources</h3>
            <div className="grid grid-cols-2 gap-2">
              {resources.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <div className="flex flex-col gap-2">
              {company.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} INDXR.AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
