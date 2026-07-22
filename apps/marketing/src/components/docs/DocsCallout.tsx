import type { ReactNode } from "react"
import { Coins, AlertTriangle, Lock } from "lucide-react"

type CalloutVariant = "costs-credits" | "careful" | "requires-account"

// Exactly three variants — a callout exists ONLY when missing it costs the reader money,
// data or time. Anything else is a paragraph. Max one callout per section.
const CONFIG: Record<CalloutVariant, { icon: typeof Coins; label: string; box: string; accent: string }> = {
  "costs-credits": {
    icon: Coins,
    label: "Costs credits",
    box: "bg-[var(--accent-subtle)] border-[var(--accent)]",
    accent: "text-[var(--accent)]",
  },
  careful: {
    icon: AlertTriangle,
    label: "Careful",
    box: "bg-[var(--warning-subtle)] border-[var(--warning-border)]",
    accent: "text-[var(--warning-fg)]",
  },
  "requires-account": {
    icon: Lock,
    label: "Requires an account",
    box: "bg-[var(--surface-elevated)] border-[var(--border-strong)]",
    accent: "text-[var(--fg)]",
  },
}

interface DocsCalloutProps {
  variant: CalloutVariant
  /** Overrides the default label for this variant. */
  title?: string
  children: ReactNode
}

export function DocsCallout({ variant, title, children }: DocsCalloutProps) {
  const c = CONFIG[variant]
  const Icon = c.icon
  return (
    <div className={`my-6 flex gap-3 rounded-[var(--radius)] border p-4 ${c.box}`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${c.accent}`} aria-hidden />
      <div className="min-w-0 text-sm leading-relaxed text-[var(--fg-subtle)]">
        <p className={`font-semibold mb-1 ${c.accent}`}>{title ?? c.label}</p>
        {children}
      </div>
    </div>
  )
}
