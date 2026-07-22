import type { ReactNode } from "react"

/**
 * Docs table with the project-wide mobile degradation: **horizontal scroll with a visible
 * affordance** (chosen over stacking to definition lists, applied to every docs table).
 * A `min-w` forces the scroll on narrow screens; a mobile-only hint makes the affordance
 * visible; the thin scrollbar stays shown. Pass `<thead>/<tbody>` as children — this owns
 * the `<table>` element and its base styling.
 */
export function DocsTable({ children }: { children: ReactNode }) {
  return (
    <div className="my-6">
      <p className="md:hidden mb-1 text-xs text-[var(--fg-muted)]">Scroll the table horizontally →</p>
      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] [scrollbar-width:thin]">
        <table className="w-full min-w-[36rem] border-collapse text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:text-[var(--fg)] [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_td]:text-[var(--fg-subtle)] [&_tr]:border-b [&_tr]:border-[var(--border-subtle)]">
          {children}
        </table>
      </div>
    </div>
  )
}
