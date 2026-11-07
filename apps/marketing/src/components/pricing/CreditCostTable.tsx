// Client island: tier-selector toggles cost column.

"use client"

import { useState } from "react"
import { PACKAGES, PricingPackage, costInTier, formatEurExact, summaryCreditCost, CREDIT_COSTS } from "@indxr/shared/lib/pricing"
import { STORAGE_BLOCK_MB, STORAGE_BLOCK_COST_CREDITS } from "@indxr/shared/lib/storage"

const TASKS = [
  { name: "Single video, YouTube captions", credits: 0 },
  { name: "AI Transcription, 30 min", credits: 30 },
  { name: "AI Transcription, 1 hour", credits: 60 },
  { name: "Playlist, 20 videos (YouTube captions)", credits: 17 }, // 20 - 3 free
  { name: "AI Summary, 1-hour video", credits: summaryCreditCost(60 * 60) },
  { name: "RAG JSON export, 1-hour video", credits: 6 }, // 60 min / 10
  { name: "1-hour AI Transcription + RAG JSON", credits: 66 }, // 60 + 6
  // Storage is also a credit spend (ADR-078): a permanent library-space block. Derived from storage.ts.
  { name: `Extra library storage, +${STORAGE_BLOCK_MB} MB (permanent)`, credits: STORAGE_BLOCK_COST_CREDITS },
]

// Exact euro-format so the worked example never hides rounding: 17 credits at Plus reads €0.425,
// not €0.43 — a rekenvoorbeeld, geen factuur (see formatEurExact).
function formatCost(credits: number, pkg: PricingPackage): string {
  if (credits === 0) return "Free"
  return formatEurExact(costInTier(credits, pkg))
}

export function CreditCostTable() {
  const defaultPkg = PACKAGES.find((p) => p.mostPopular) ?? PACKAGES[2]
  const [selectedId, setSelectedId] = useState<PricingPackage["id"]>(defaultPkg.id)

  const selectedPkg = PACKAGES.find((p) => p.id === selectedId) ?? defaultPkg

  return (
    <div>

      {/* Tier selector */}
      <div className="flex flex-wrap mb-6">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => setSelectedId(pkg.id)}
            className={`-ml-[2px] first:ml-0 px-4 py-2 text-sm font-bold border-2 border-[var(--fg-strong)] transition-colors ${
              selectedId === pkg.id
                ? "bg-[var(--accent)] text-[var(--fg-on-accent)]"
                : "bg-[var(--bg)] text-[var(--fg-strong)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            {pkg.name}
          </button>
        ))}
      </div>

      {/* Cost table */}
      <div className="overflow-x-auto border-2 border-[var(--fg-strong)]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-[var(--fg-strong)] bg-[var(--fg-strong)] text-[var(--bg)]">
              <th className="text-left py-3 px-4 font-mono text-xs uppercase font-medium">Task</th>
              <th className="text-right py-3 px-4 font-mono text-xs uppercase font-medium">Credits</th>
              <th className="text-right py-3 px-4 font-mono text-xs uppercase font-medium">
                Cost ({selectedPkg.name})
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--fg-subtle)]">
            {TASKS.map(({ name, credits }) => (
              <tr key={name} className="border-b-2 border-[var(--fg-strong)] last:border-0">
                <td className="py-3 px-4">{name}</td>
                <td className="text-right py-3 px-4 tabular-nums">{credits}</td>
                <td className="text-right py-3 px-4 tabular-nums font-bold text-[var(--fg-strong)]">
                  {formatCost(credits, selectedPkg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--fg-muted)] mt-3">
        Playlist: first 3 caption videos free, then 1 credit/video. AI transcription is {CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN} credit/min (no free videos). AI summary is {CREDIT_COSTS.AI_SUMMARY_PER_10MIN} credit per 10 min of video (rounded up, minimum 1). Every account starts with 100 MB of library storage free; the row above is for buying more. All prices VAT included.
      </p>
    </div>
  )
}
