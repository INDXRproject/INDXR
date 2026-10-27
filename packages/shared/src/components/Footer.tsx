import { marketingHref } from "../lib/cross-host-links";
import { CookieSettingsLink } from "./consent/CookieSettingsLink";

// Slim footer: just the essentials. Docs/Articles/Formats live in the header nav and the
// sitemap, so a long link farm here added clutter without SEO value. Kept: About, Compare,
// Privacy, Terms, Contact.
//
// "Compare" is the site-wide entry point into the /alternatives/ comparison namespace (ADR-105).
// It points straight at the single comparison page today; when a second one is added, this becomes
// an /alternatives/ index and only the href changes (the label already scales). A one-item index
// now would just add a thin extra hop and dilute the internal-link signal to the page itself.
const links = [
  { href: "/about", label: "About" },
  { href: "/alternatives/otter-ai", label: "Compare" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container mx-auto px-4 py-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        <span>© 2026 INDXR.AI</span>
        {links.map((link) => (
          <a
            key={link.href}
            href={marketingHref(link.href)}
            className="hover:text-fg transition-colors"
          >
            {link.label}
          </a>
        ))}
        <CookieSettingsLink className="hover:text-fg transition-colors cursor-pointer" />
      </div>
      {/* AlternativeTo badge (akkoord Khidr, 2026-10-27) — officiële code (link + SVG, geen JS),
          lokaal gehost in /public/badges. Licht/donker via dezelfde dark:hidden/dark:block-toggle
          als het logo in Header.tsx. */}
      <div className="flex justify-center pb-6">
        <a
          href="https://alternativeto.net/software/indxr-ai/about/?utm_source=badge&utm_medium=referral"
          target="_blank"
          rel="noopener"
        >
          <img
            src="/badges/alternativeto-badge-light.svg"
            alt="INDXR.AI | AlternativeTo"
            width={244}
            height={79}
            style={{ width: "244px", height: "79px" }}
            className="dark:hidden"
          />
          <img
            src="/badges/alternativeto-badge-dark.svg"
            alt="INDXR.AI | AlternativeTo"
            width={244}
            height={79}
            style={{ width: "244px", height: "79px" }}
            className="hidden dark:block"
          />
        </a>
      </div>
    </footer>
  );
}
