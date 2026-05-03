import Link from "next/link";

const exportFormats = [
  { href: "/articles/youtube-to-text", label: "Plain TXT / Timestamps" },
  { href: "/articles/youtube-transcript-markdown", label: "Markdown transcript" },
  { href: "/articles/youtube-transcript-json", label: "JSON export" },
  { href: "/articles/youtube-transcript-for-rag", label: "RAG-optimized JSON" },
  { href: "/articles/youtube-transcript-csv", label: "CSV export" },
  { href: "/articles/youtube-srt-download", label: "SRT / VTT download" },
];

const learn = [
  { href: "/docs", label: "Documentation" },
  { href: "/docs/getting-started", label: "Getting started" },
  { href: "/docs/faq", label: "FAQ" },
  { href: "/articles/youtube-playlist-transcript", label: "Playlist transcripts" },
  { href: "/articles/audio-to-text", label: "Audio file upload" },
  { href: "/articles/youtube-transcript-not-available", label: "Transcript not available?" },
  { href: "/contact", label: "Contact" },
];

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--fg)] mb-4">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <FooterColumn title="Export Formats" links={exportFormats} />
          <FooterColumn title="Learn" links={learn} />
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--border)] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--fg-muted)]">
          <span>© 2026 INDXR.AI</span>
          <Link href="/pricing" className="hover:text-[var(--fg)] transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-[var(--fg)] transition-colors">
            Docs
          </Link>
          <Link href="/about" className="hover:text-[var(--fg)] transition-colors">
            About
          </Link>
          <Link href="/privacy" className="hover:text-[var(--fg)] transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--fg)] transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-[var(--fg)] transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
