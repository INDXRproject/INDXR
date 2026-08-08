"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@indxr/shared/lib/utils";

// Veilige markdown-render voor AI-samenvatting-inhoud (ADR-090-kwaliteitsronde). De tekst komt van een
// taalmodel, dus GEEN dangerouslySetInnerHTML met ruwe invoer: react-markdown parseert naar React-
// elementen en rendert nooit raw HTML (geen rehype-raw). We beperken tot wat de uitvoer echt gebruikt
// (koppen, lijsten, vet, cursief, alinea's, blockquote, code) en staan GEEN img of a uit modeltekst toe
// (`unwrapDisallowed` houdt de tekst, verwijdert de tag).
const ALLOWED = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
  "strong", "em", "blockquote", "code", "pre", "hr", "br",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
const heading = (cls: string) => ({ node, ...props }: any) => <div className={cls} {...props} />;

export function SummaryMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-fg/90 leading-relaxed", className)}>
      <ReactMarkdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          h1: heading("text-base font-semibold text-fg mt-4 mb-1"),
          h2: heading("text-base font-semibold text-fg mt-4 mb-1"),
          h3: heading("text-sm font-semibold text-fg mt-3 mb-1"),
          h4: heading("text-sm font-semibold text-fg mt-3 mb-1"),
          h5: heading("text-sm font-semibold text-fg-muted mt-2 mb-1"),
          h6: heading("text-sm font-semibold text-fg-muted mt-2 mb-1"),
          p: ({ node, ...props }: any) => <p className="mb-3" {...props} />,
          ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-3 space-y-1 marker:text-amber-500" {...props} />,
          ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 marker:text-amber-500" {...props} />,
          li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
          strong: ({ node, ...props }: any) => <strong className="font-semibold text-fg" {...props} />,
          em: ({ node, ...props }: any) => <em className="italic" {...props} />,
          blockquote: ({ node, ...props }: any) => (
            <blockquote className="border-l-2 border-border pl-3 italic text-fg-muted my-3" {...props} />
          ),
          code: ({ node, ...props }: any) => (
            <code className="rounded bg-surface-elevated px-1 py-0.5 font-mono text-xs" {...props} />
          ),
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
