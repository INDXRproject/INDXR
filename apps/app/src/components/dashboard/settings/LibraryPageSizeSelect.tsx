"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { saveLibraryPageSizeAction } from "@/app/actions/profile"
import { cn } from "@indxr/shared/lib/utils"

const OPTIONS = [25, 50, 100] as const
type PageSize = (typeof OPTIONS)[number]

export function LibraryPageSizeSelect({ initialValue }: { initialValue: PageSize }) {
  const [value, setValue]   = useState<PageSize>(initialValue)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const handleChange = async (size: PageSize) => {
    if (size === value) return
    setValue(size)
    setSaving(true)
    setSaved(false)
    await saveLibraryPageSizeAction(size)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      {saved && <Check className="size-3.5 text-success" />}
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5 bg-surface">
        {OPTIONS.map((size) => (
          <button
            key={size}
            onClick={() => handleChange(size)}
            disabled={saving}
            className={cn(
              "h-7 min-w-9 px-2.5 rounded-md text-xs font-medium tabular-nums transition-colors cursor-pointer disabled:opacity-60",
              value === size
                ? "bg-accent text-fg-on-accent"
                : "text-fg-muted hover:text-fg",
            )}
            aria-pressed={value === size}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  )
}
