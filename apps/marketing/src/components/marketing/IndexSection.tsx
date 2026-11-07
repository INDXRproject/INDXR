// Stijl B section frame (2026-11-07): the page reads like a reference work — every section carries an
// index mark (§01…) and a label in a left margin column on desktop, inline above the content on
// mobile. Shared by home and pricing so both pages use one rhythm.

export const INK = "border-[var(--fg-strong)]"
export const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6"
export const MONO = "font-mono text-xs uppercase tracking-[0.08em]"
export const H2 = "text-4xl font-bold leading-[0.98] tracking-[-0.04em] text-[var(--fg-strong)] sm:text-6xl"

export function IndexSection({
  n,
  label,
  id,
  children,
  tone = "paper",
}: {
  n: string
  label: string
  id?: string
  children: React.ReactNode
  tone?: "paper" | "ink" | "amber" | "subtle"
}) {
  const toneCls =
    tone === "ink"
      ? "bg-[var(--fg-strong)] text-[var(--bg)]"
      : tone === "amber"
        ? "bg-[var(--accent)] text-[var(--fg-on-accent)]"
        : tone === "subtle"
          ? "bg-[var(--bg-subtle)]"
          : "bg-[var(--bg)]"
  const markCls = tone === "paper" || tone === "subtle" ? "text-[var(--fg-subtle)]" : ""
  return (
    <section id={id} className={`w-full scroll-mt-20 border-t-2 ${INK} ${toneCls}`}>
      <div className={`${WRAP} grid gap-6 py-16 lg:grid-cols-[140px_minmax(0,1fr)] lg:gap-10 lg:py-24`}>
        <div className={`${MONO} ${markCls} lg:pt-3`}>
          <span className="mr-3 lg:mr-0 lg:block lg:text-2xl lg:font-bold lg:normal-case lg:tracking-[-0.02em]">§{n}</span>
          <span className="lg:mt-2 lg:block">{label}</span>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}
