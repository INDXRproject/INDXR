// Skeleton — visual polish in Claude Design rondje na alle Batch 1 pages

interface Column {
  key: string
  label: string
}

interface ReferenceTableProps {
  columns: Column[]
  rows: Record<string, string>[]
  caption?: string
}

export function ReferenceTable({ columns, rows, caption }: ReferenceTableProps) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm border-collapse">
        {caption && (
          <caption className="text-xs text-[var(--fg-muted)] mb-2 text-left">{caption}</caption>
        )}
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-2 pr-4 font-semibold text-[var(--fg)]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-0">
              {columns.map((col) => (
                <td key={col.key} className="py-2 pr-4 text-[var(--fg-muted)]">
                  {row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
