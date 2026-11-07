import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react"

import { cn } from "../../lib/utils"
import { NOTICE_BODY, NOTICE_ICON, NOTICE_TITLE, notice, noticeCompact, type NoticeTone } from "../../lib/notice"

const ICONS = { error: XCircle, warning: AlertTriangle, success: CheckCircle2, info: Info } as const

/**
 * The one message surface (Stijl B, 2026-11-07): error, warning, success or info. Title optional —
 * without one it renders as a compact single message (form feedback). See lib/notice.ts.
 */
export function Notice({
  tone,
  title,
  children,
  action,
  onDismiss,
  className,
  role,
}: {
  tone: NoticeTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  onDismiss?: () => void
  className?: string
  role?: "alert" | "status"
}) {
  const Icon = ICONS[tone]
  return (
    <div
      role={role ?? (tone === "error" ? "alert" : "status")}
      className={cn(title ? notice(tone) : noticeCompact(tone), "flex items-start gap-2.5", className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", NOTICE_ICON[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className={NOTICE_TITLE}>{title}</p>}
        {children && <div className={cn(title ? "mt-1" : "", NOTICE_BODY)}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 p-1 text-fg-strong hover:bg-bg-subtle cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
