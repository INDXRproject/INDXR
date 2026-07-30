// Static presentation of the three input types. A future iteration may animate the cycle;
// until then this renders the list as-is, with no visitor-facing note about that.

interface RemotionLoopProps {
  items?: string[]
  className?: string
}

export function RemotionLoop({ items, className }: RemotionLoopProps) {
  const defaultItems = ["Single video URL", "Playlist URL", "Audio file upload"]
  const displayItems = items ?? defaultItems

  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 ${className ?? ""}`}>
      <div className="space-y-2">
        {displayItems.map((item) => (
          <div
            key={item}
            className="text-sm text-[var(--fg-subtle)] px-3 py-2 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)]"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
