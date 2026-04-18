import Link from "next/link";

const exportFormats = [
  { href: "/youtube-transcript-markdown", label: "Markdown transcript" },
  { href: "/youtube-transcript-json", label: "JSON export" },
  { href: "/youtube-transcript-for-rag", label: "RAG-optimized JSON" },
  { href: "/youtube-transcript-csv", label: "CSV export" },
  { href: "/youtube-srt-download", label: "SRT / VTT download" },
];

const guides = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/youtube-playlist-transcript", label: "Playlist transcripts" },
  { href: "/audio-to-text", label: "Audio file upload" },
  { href: "/youtube-transcript-without-extension", label: "Without browser extension" },
  { href: "/youtube-transcript-not-available", label: "Transcript not available?" },
];

const compare = [
  { href: "/alternative/downsub", label: "INDXR.AI vs DownSub" },
  { href: "/alternative/notegpt", label: "INDXR.AI vs NoteGPT" },
  { href: "/alternative/turboscribe", label: "INDXR.AI vs TurboScribe" },
  { href: "/alternative/tactiq", label: "INDXR.AI vs Tactiq" },
  { href: "/alternative/happyscribe", label: "INDXR.AI vs HappyScribe" },
];

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)] mb-4">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
    <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <FooterColumn title="Export Formats" links={exportFormats} />
          <FooterColumn title="Guides" links={guides} />
          <FooterColumn title="Compare" links={compare} />
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--border)] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>© 2026 INDXR.AI</span>
          <Link href="/pricing" className="hover:text-[var(--text-primary)] transition-colors">
            Pricing
          </Link>
          <Link href="/how-it-works" className="hover:text-[var(--text-primary)] transition-colors">
            How It Works
          </Link>
        </div>
      </div>
    </footer>
  );
}
