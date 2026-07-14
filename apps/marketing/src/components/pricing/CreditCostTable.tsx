// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Client island: tier-selector toggles cost column.

"use client"

import { useState } from "react"
import { PACKAGES, CREDIT_COSTS, PricingPackage, costInTier, formatEur } from "@indxr/shared/lib/pricing"

const TASKS = [
  { name: "Single video, auto-captions", credits: 0 },
  { name: "AI Transcription, 30 min", credits: 30 },
  { name: "AI Transcription, 1 hour", credits: 60 },
  { name: "Playlist, 20 videos (auto-captions)", credits: 17 }, // 20 - 3 free
  { name: "AI Summary", credits: CREDIT_COSTS.AI_SUMMARY },
  { name: "RAG JSON export, 1-hour video", credits: 6 }, // 60 min / 10
  { name: "1-hour AI Transcription + RAG JSON", credits: 66 }, // 60 + 6
]

function formatCost(credits: number, pkg: PricingPackage): string {
  if (credits === 0) return "Free"
  return formatEur(costInTier(credits, pkg))
}

export function CreditCostTable() {
  const defaultPkg = PACKAGES.find((p) => p.mostPopular) ?? PACKAGES[2]
  const [selectedId, setSelectedId] = useState<PricingPackage["id"]>(defaultPkg.id)

  const selectedPkg = PACKAGES.find((p) => p.id === selectedId) ?? defaultPkg

  return (
    <div className="max-w-3xl mx-auto mt-16">
      <h2 className="text-2xl font-bold text-[var(--fg)] mb-4 text-center">
        What does it actually cost?
      </h2>

      {/* Tier selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => setSelectedId(pkg.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedId === pkg.id
                ? "bg-[var(--accent)] text-[var(--fg-on-accent)] border-[var(--accent)]"
                : "border-[var(--border)] text-[var(--fg-subtle)] hover:border-[var(--accent)]"
            }`}
          >
            {pkg.name}
          </button>
        ))}
      </div>

      {/* Cost table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-3 pr-4 font-semibold text-[var(--fg)]">Task</th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--fg)]">Credits</th>
              <th className="text-right py-3 pl-4 font-semibold text-[var(--fg)]">
                Cost ({selectedPkg.name})
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--fg-subtle)]">
            {TASKS.map(({ name, credits }) => (
              <tr key={name} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 pr-4">{name}</td>
                <td className="text-right py-3 px-4 tabular-nums">{credits}</td>
                <td className="text-right py-3 pl-4 tabular-nums font-medium text-[var(--fg)]">
                  {formatCost(credits, selectedPkg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--fg-muted)] mt-3 text-center">
        Playlist: first 3 videos free, then 1 credit/video. All prices VAT included.
      </p>
    </div>
  )
}
