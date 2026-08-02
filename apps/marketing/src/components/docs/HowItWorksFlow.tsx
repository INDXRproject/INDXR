// The system in one figure: source → method (captions = sky / AI = indigo) → transcript →
// library → export. Inline SVG on design tokens + the two method colours; no bitmap, no lib.
export function HowItWorksFlow() {
  const nodeFill = "fill-[var(--surface)]"
  const nodeStroke = "stroke-[var(--border)]"
  const label = "fill-[var(--fg)] text-[13px] font-medium"
  const sub = "fill-[var(--fg-muted)] text-[11px]"

  return (
    <figure className="my-6">
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] p-4 overflow-x-auto">
        <svg viewBox="0 0 760 210" className="w-full min-w-[640px]" role="img"
          aria-label="Flow: a YouTube video, playlist, or uploaded file becomes a transcript by one of two methods — free YouTube captions (sky) or AI transcription (indigo) — which is saved to your library and then exported.">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="fill-[var(--fg-muted)]" />
            </marker>
          </defs>

          {/* Source */}
          <rect x="8" y="70" width="130" height="70" rx="10" className={`${nodeFill} ${nodeStroke}`} strokeWidth="1.5" />
          <text x="73" y="98" textAnchor="middle" className={label}>Video · Playlist</text>
          <text x="73" y="116" textAnchor="middle" className={sub}>or an upload</text>

          {/* Method — two coloured routes */}
          <rect x="200" y="30" width="150" height="56" rx="10" className="fill-sky-500/10 stroke-sky-500/60" strokeWidth="1.5" />
          <text x="275" y="53" textAnchor="middle" className="fill-sky-700 dark:fill-sky-300 text-[13px] font-semibold">YouTube captions</text>
          <text x="275" y="71" textAnchor="middle" className={sub}>free · instant</text>

          <rect x="200" y="124" width="150" height="56" rx="10" className="fill-indigo-500/10 stroke-indigo-500/60" strokeWidth="1.5" />
          <text x="275" y="147" textAnchor="middle" className="fill-indigo-700 dark:fill-indigo-300 text-[13px] font-semibold">AI transcription</text>
          <text x="275" y="165" textAnchor="middle" className={sub}>1 credit / min</text>

          {/* Transcript → Library → Export */}
          <rect x="412" y="70" width="110" height="70" rx="10" className={`${nodeFill} ${nodeStroke}`} strokeWidth="1.5" />
          <text x="467" y="109" textAnchor="middle" className={label}>Transcript</text>

          <rect x="560" y="70" width="90" height="70" rx="10" className={`${nodeFill} ${nodeStroke}`} strokeWidth="1.5" />
          <text x="605" y="109" textAnchor="middle" className={label}>Library</text>

          <rect x="682" y="70" width="70" height="70" rx="10" className={`${nodeFill} ${nodeStroke}`} strokeWidth="1.5" />
          <text x="717" y="109" textAnchor="middle" className={label}>Export</text>

          {/* Arrows */}
          <g className="stroke-[var(--fg-muted)]" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)">
            <path d="M138,95 C168,95 172,58 198,58" />
            <path d="M138,115 C168,115 172,152 198,152" />
            <path d="M350,58 C378,58 384,95 410,95" />
            <path d="M350,152 C378,152 384,95 410,95" />
            <path d="M522,105 L558,105" />
            <path d="M650,105 L680,105" />
          </g>
        </svg>
      </div>
      <figcaption className="mt-2 text-sm text-[var(--fg-muted)]">
        One path, one fork: the method you pick — free YouTube captions or AI transcription — is the
        only choice that shapes the transcript and everything you export from it.
      </figcaption>
    </figure>
  )
}
