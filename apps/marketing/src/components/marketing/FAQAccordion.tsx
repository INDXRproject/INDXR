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
    <div className={`border-t-2 border-[var(--fg-strong)] divide-y-2 divide-[var(--fg-strong)] border-b-2 ${className ?? ""}`}>
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between text-left py-5 gap-4 group cursor-pointer"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            aria-expanded={openIndex === i}
          >
            <span className="flex items-baseline gap-4">
              <span className="font-mono text-xs text-[var(--fg-muted)] tabular-nums">Q{String(i + 1).padStart(2, "0")}</span>
              <span className="text-base font-bold text-[var(--fg-strong)] sm:text-lg">{item.question}</span>
            </span>
            <ChevronDown
              className={`shrink-0 h-5 w-5 text-[var(--fg-strong)] transition-transform duration-200 ${
                openIndex === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === i && (
            <div className="pb-6 pl-10 text-base text-[var(--fg-subtle)] leading-relaxed max-w-3xl">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
