import React from "react";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "size-8" }: LogoProps) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="12" width="3" height="8" rx="1.5" fill="currentColor"/>
      <rect x="9" y="8" width="3" height="16" rx="1.5" fill="currentColor"/>
      <rect x="14" y="4" width="3" height="24" rx="1.5" fill="currentColor"/>
      <rect x="19" y="10" width="3" height="12" rx="1.5" fill="currentColor"/>
      <rect x="24" y="14" width="3" height="4" rx="1.5" fill="currentColor"/>
    </svg>
  );
}
