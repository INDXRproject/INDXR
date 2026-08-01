import type { SVGProps } from "react";

/**
 * Beehive (skep) brand icon for the Home nav item. Deliberately low-detail — a tall dome
 * silhouette with just two coil bands — so it stays legible at 17px in the mobile tab bar
 * and reads clearly against the line-based peers (audio / library / message). No ground line
 * or entrance hole: at that size an extra element closes up and hurts more than it helps.
 * Matches the lucide stroke convention (24 viewBox, currentColor, width 2, round joins).
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
      className={className}
      {...props}
    >
      <path d="M6 20c0-7 2.4-13 6-13s6 6 6 13Z" />
      <path d="M7.6 15q4.4-2 8.8 0" />
      <path d="M9 11q3-1.4 6 0" />
    </svg>
  );
}
