// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Custom accordion — no shadcn Accordion exists in this codebase.

"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

export interface FAQItem {
  question: string
  answer: string
}

interface FAQAccordionProps {
  items: FAQItem[]
  className?: string
}

export function FAQAccordion({ items, className }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className={`divide-y divide-[var(--border)] ${className ?? ""}`}>
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between text-left py-4 gap-4 group"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            aria-expanded={openIndex === i}
          >
            <span className="font-medium text-[var(--fg)] text-sm">{item.question}</span>
            <ChevronDown
              className={`shrink-0 h-4 w-4 text-[var(--fg-muted)] transition-transform duration-200 ${
                openIndex === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === i && (
            <div className="pb-4 text-sm text-[var(--fg-subtle)] leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
