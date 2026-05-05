import { marketingHref } from "../lib/cross-host-links";

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
  { href: "/docs/help/faq", label: "FAQ" },
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
            <a
              href={marketingHref(link.href)}
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              {link.label}
            </a>
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
          <a href={marketingHref('/pricing')} className="hover:text-[var(--fg)] transition-colors">
            Pricing
          </a>
          <a href={marketingHref('/docs')} className="hover:text-[var(--fg)] transition-colors">
            Docs
          </a>
          <a href={marketingHref('/about')} className="hover:text-[var(--fg)] transition-colors">
            About
          </a>
          <a href={marketingHref('/privacy')} className="hover:text-[var(--fg)] transition-colors">
            Privacy
          </a>
          <a href={marketingHref('/terms')} className="hover:text-[var(--fg)] transition-colors">
            Terms
          </a>
          <a href={marketingHref('/contact')} className="hover:text-[var(--fg)] transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
