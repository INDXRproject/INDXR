// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Copy and real numbers to be written by Khidr.

interface TrustPoint {
  label: string
  detail: string
}

const trustPoints: TrustPoint[] = [
  { label: "EU-hosted", detail: "Supabase eu-west-1" },
  { label: "Audio deleted after transcription", detail: "R2 storage purged on job complete" },
  { label: "Stripe-secured payments", detail: "No card data touches our servers" },
]

export function StatsFromTesting() {
  return (
    <div className="w-full py-16 border-b border-[var(--border)]">
      <div className="container mx-auto px-4">
        {/* Hero stat */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--fg-muted)] mb-4">
            From our testing
          </p>
          <p className="text-4xl sm:text-5xl font-bold text-[var(--fg)] mb-3">
            99.4% accuracy
          </p>
          <p className="text-[var(--fg-subtle)] max-w-xl mx-auto">
            Tested on 800+ minutes of academic and conversational audio. AI transcription on benchmark data.
          </p>
        </div>

        {/* Trust points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {trustPoints.map((p) => (
            <div key={p.label} className="text-center p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <p className="font-semibold text-[var(--fg)] text-sm">{p.label}</p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
