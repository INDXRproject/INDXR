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
      <path d="M4 20.5a8 7.5 0 0 1 16 0" />
      {/* ground */}
      <path d="M2.5 20.5h19" />
      {/* two bands — spaced so they stay legible at 17px */}
      <path d="M6 15h12" />
      <path d="M8.5 10h7" />
      {/* entrance — taller and clearly separated from the lowest band */}
      <path d="M10.5 20.5v-2.5a1.5 1.5 0 0 1 3 0v2.5" />
    </svg>
  );
}
