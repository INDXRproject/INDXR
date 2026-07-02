import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "../../lib/utils"

interface FeedbackCardProps {
  variant: "error" | "success" | "warning" | "info"
  message: React.ReactNode
  onDismiss?: () => void
  className?: string
}

const config = {
  error:   { icon: AlertCircle,   styles: "bg-error/10 border-error/20 text-error"       },
  success: { icon: CheckCircle,   styles: "bg-success/10 border-success/20 text-success" },
  warning: { icon: AlertTriangle, styles: "bg-warning/10 border-warning/20 text-warning" },
  info:    { icon: Info,          styles: "bg-surface-elevated border-border text-fg-muted" },
}

export function FeedbackCard({ variant, message, onDismiss, className }: FeedbackCardProps) {
  const { icon: Icon, styles } = config[variant]
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", styles, className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
