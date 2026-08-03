// A file-output sample: a filename header over a scrollable code block. Used on the homepage to
// show REAL export output (see lib/homeExportSamples.ts) instead of a hand-coded fake laptop screen —
// exports are files, not UI, so a code block is the honest presentation. Theme-aware via tokens.

interface CodeSampleProps {
  /** The output filename, e.g. "transcript.md". */
  filename: string
  /** Verbatim generator output to display. */
  code: string
}

export function CodeSample({ filename, code }: CodeSampleProps) {
  return (
    <figure className="my-0 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] overflow-hidden">
      <figcaption className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
        <span className="font-mono text-xs text-[var(--fg-muted)]">{filename}</span>
      </figcaption>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed [scrollbar-width:thin]">
        <code className="font-mono text-[var(--fg-subtle)] whitespace-pre">{code}</code>
      </pre>
    </figure>
  )
}
