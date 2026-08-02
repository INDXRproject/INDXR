import { marketingHref } from "../lib/cross-host-links";
import { CookieSettingsLink } from "./consent/CookieSettingsLink";

// Slim footer: just the essentials. Docs/Articles/Formats live in the header nav and the
// sitemap, so a long link farm here added clutter without SEO value. Kept: About, Privacy,
// Terms, Contact.
const links = [
  { href: "/about", label: "About" },
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
    </footer>
  );
}
