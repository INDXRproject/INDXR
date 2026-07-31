import type { SVGProps } from "react";

/**
 * Beehive (skep) — the brand mark for the Home nav item. Drawn to lucide's conventions
 * (24 viewBox, stroke currentColor, 2px round strokes) so it sits flush next to the other
 * lucide nav icons and reads clearly at 17–19px. The honeycomb motif itself lives in the
 * logo + dashboard backdrop; Home carries the literal hive.
 */
export function Beehive({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* dome */}
      <path d="M4 21a8 8 0 0 1 16 0" />
      {/* ground */}
      <path d="M3.5 21h17" />
      {/* coils */}
      <path d="M6 16.5h12" />
      <path d="M8 12h8" />
      <path d="M10 8h4" />
      {/* entrance */}
      <path d="M10.5 21v-1.2a1.5 1.5 0 0 1 3 0V21" />
    </svg>
  );
}
