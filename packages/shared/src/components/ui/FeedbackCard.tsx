import { Notice } from "./notice"

interface FeedbackCardProps {
  variant: "error" | "success" | "warning" | "info"
  message: React.ReactNode
  onDismiss?: () => void
  className?: string
}

/** Compact one-line feedback. Stijl B (2026-11-07): rendered by the shared <Notice>. */
export function FeedbackCard({ variant, message, onDismiss, className }: FeedbackCardProps) {
  return (
    <Notice tone={variant} onDismiss={onDismiss} className={className}>
      {message}
    </Notice>
  )
}
