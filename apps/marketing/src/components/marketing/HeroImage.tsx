// Skeleton component — visual polish in Claude Design rondje na alle Batch 1 pages
"use client"

import Image from "next/image"
import { useState } from "react"

interface HeroImageProps {
  className?: string
}

export function HeroImage({ className }: HeroImageProps) {
  const [lightError, setLightError] = useState(false)
  const [darkError, setDarkError] = useState(false)

  if (lightError && darkError) return null

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`}>
      {!lightError && (
        <Image
          src="/hero-light.jpg"
          alt=""
          fill
          className="object-cover object-[center_20%] lg:object-[center_30%] dark:hidden"
          priority
          onError={() => setLightError(true)}
        />
      )}
      {!darkError && (
        <Image
          src="/hero-dark.jpg"
          alt=""
          fill
          className="object-cover object-[center_20%] lg:object-[center_30%] hidden dark:block"
          priority
          onError={() => setDarkError(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[var(--bg)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/70 via-transparent to-[var(--bg)]/70" />
    </div>
  )
}
