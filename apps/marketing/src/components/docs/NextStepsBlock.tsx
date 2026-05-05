// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface NextStep {
  label: string
  href: string
  description?: string
}

interface NextStepsBlockProps {
  steps: NextStep[]
}

export function NextStepsBlock({ steps }: NextStepsBlockProps) {
  return (
    <div className="mt-10 pt-6 border-t border-[var(--border)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-4">Next steps</p>
      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-start gap-3 group text-sm"
            >
              <ArrowRight className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
              <span>
                <span className="font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                  {step.label}
                </span>
                {step.description && (
                  <span className="block text-[var(--fg-muted)] text-xs mt-0.5">{step.description}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
