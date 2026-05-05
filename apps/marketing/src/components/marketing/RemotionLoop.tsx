// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
// Remotion integration comes later. For now renders a static placeholder cycle.

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
      <p className="text-xs text-[var(--fg-muted)] mt-3">[Remotion animation placeholder — static for now]</p>
    </div>
  )
}
