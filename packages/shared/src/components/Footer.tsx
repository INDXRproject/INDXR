import { marketingHref } from "../lib/cross-host-links";
import { CookieSettingsLink } from "./consent/CookieSettingsLink";

// Stijl B footer (2026-11-06): ink rule on top, logo, three short columns. Still no link farm —
// every link here is a page people actually look for in a footer.
//
// "Compare" is the site-wide entry point into the /alternatives/ comparison namespace (ADR-105).
// It points straight at the single comparison page today; when a second one is added, this becomes
// an /alternatives/ index and only the href changes (the label already scales).
const columns: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/transcribe", label: "Transcribe one file" },
      { href: "/alternatives/otter-ai", label: "Compare" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/articles", label: "Articles" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

const LINK = "text-sm text-fg-subtle hover:text-fg-strong hover:underline underline-offset-4";

export function Footer() {
  return (
    <footer className="border-t-2 border-border-strong bg-bg">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <a href={marketingHref("/")} aria-label="INDXR.AI home" className="inline-block">
            <img src="/logo/indxr-horizontal-black-transparent.png" alt="INDXR.AI" className="h-12 w-auto dark:hidden" />
            <img src="/logo/indxr-horizontal-white-transparent.png" alt="INDXR.AI" className="hidden h-12 w-auto dark:block" />
          </a>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.08em] text-fg">Transcripts, done properly.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-fg">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <a href={marketingHref(link.href)} className={LINK}>
                    {link.label}
                  </a>
                </li>
              ))}
              {col.title === "Company" && (
                <li>
                  <CookieSettingsLink className={`${LINK} cursor-pointer`} />
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t-2 border-border-strong">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 font-mono text-xs text-fg-muted sm:px-6">© 2026 INDXR.AI · Processed in the EU</div>
      </div>
    </footer>
  );
}
