// Stijl B feedback language (2026-11-07) — one source for every error, warning, success, info and
// empty/loading surface in the app and the free tool. Ink frame (2px --border-strong), white paper,
// a thick coloured bar on the left that says WHAT kind of message it is, ink title, plain body,
// error codes as a small mono chip. No tinted fills, no thin coloured hairlines, radius 0.
//
// Use the classes directly in bespoke markup, or the <Notice> component (ui/notice.tsx).

export type NoticeTone = "error" | "warning" | "success" | "info"

/** Frame shared by every notice. */
export const NOTICE_BASE = "border-2 border-border-strong bg-bg text-left text-fg"

/** The tone bar: 8px on the left edge, overriding the left side of the 2px frame. */
export const NOTICE_BAR: Record<NoticeTone, string> = {
  error: "border-l-[8px] border-l-error",
  warning: "border-l-[8px] border-l-warning",
  success: "border-l-[8px] border-l-success",
  info: "border-l-[8px] border-l-fg-strong",
}

/** Icon colour per tone (the icon sits before the title). */
export const NOTICE_ICON: Record<NoticeTone, string> = {
  error: "text-error",
  warning: "text-warning-fg",
  success: "text-success-fg",
  info: "text-fg-strong",
}

/** Full container classes for a tone, padding included. */
export const notice = (tone: NoticeTone) => `${NOTICE_BASE} ${NOTICE_BAR[tone]} px-4 py-3.5`

/** Compact one-line variant (inline form messages). */
export const noticeCompact = (tone: NoticeTone) => `${NOTICE_BASE} ${NOTICE_BAR[tone]} px-3 py-2 text-sm`

export const NOTICE_TITLE = "font-bold text-fg-strong"
export const NOTICE_BODY = "text-sm leading-relaxed text-fg"
/** Error codes: a small ink-bordered mono chip, readable but clearly secondary. */
export const NOTICE_CODE = "inline-block border border-border-strong px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.04em] text-fg"

/** Empty state: ink frame, no dashed grey box. */
export const EMPTY_FRAME = "border-2 border-border-strong bg-bg px-6 py-12 text-center"
/** Icon tile used inside empty states. */
export const EMPTY_ICON = "mx-auto mb-5 flex h-14 w-14 items-center justify-center border-2 border-border-strong bg-bg"

/** Skeleton block (loading). Square, light grey, pulsing. */
export const SKELETON = "animate-pulse bg-border-subtle"
