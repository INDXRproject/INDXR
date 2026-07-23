import Link from "next/link"

interface TrustPoint {
  label: string
  detail: string
}

const trustPoints: TrustPoint[] = [
  { label: "EU-hosted", detail: "Supabase, eu-west-1" },
  { label: "Audio deleted after transcription", detail: "Uploads aren't kept once your transcript is made" },
  { label: "Stripe-secured payments", detail: "No card data touches our servers" },
]

// Hero stat = a measured speed figure sourced from the database, not from a wiki page.
// Verified 2026-07-23 with a direct query on transcription_jobs (status='complete',
// cache_hit=false): n=216 completed runs (2026-04-13 → 2026-07-20), median
// processing_time_seconds / duration_seconds = 0.0536 (~5%), p90 = 0.124. The old
// unmeasured accuracy/volume marketing line had NO recorded measurement and was removed;
// accuracy is now told honestly, per language, on the accuracy page. Note: the sample
// is largely internal test traffic, but processing latency is model-driven and does not
// depend on who submitted the job — hence "transcription runs", not "customer runs".
export function StatsFromTesting() {
  return (
    <div className="w-full py-16 border-b border-[var(--border)]">
      <div className="container mx-auto px-4">
        {/* Hero stat */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--fg-muted)] mb-4">
            From our own runs
          </p>
          <p className="text-4xl sm:text-5xl font-bold text-[var(--fg)] mb-3">
            An hour of audio in minutes
          </p>
          <p className="text-[var(--fg-subtle)] max-w-xl mx-auto">
            Across 200+ transcription runs, AI transcription took a median of about 5% of the
            audio&apos;s length — most hour-long videos finish in a few minutes. Accuracy depends on the language:{" "}
            <Link href="/docs/reference/accuracy" className="text-[var(--accent)] hover:underline">
              see the accuracy page
            </Link>.
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
