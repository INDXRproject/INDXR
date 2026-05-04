// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Per ADR-044: geen fake testimonials. This renders a holding message.

export function TestimonialPlaceholder() {
  return (
    <div className="text-center py-6">
      <p className="text-xs text-[var(--fg-muted)] italic">
        Real testimonials will appear here as users share their experience.
      </p>
    </div>
  )
}
