// Small "?" affordance that reveals a definition on hover (native title — no JS, works in a server component).
// Used across the admin dashboards so every metric can say exactly how it's defined.
export function InfoHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="ml-1 inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-border text-[9px] font-semibold leading-none text-fg-subtle align-middle hover:border-border-strong hover:text-fg-muted"
    >
      ?
    </span>
  )
}
