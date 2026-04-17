"use client"

import Image from "next/image"
import { useState } from "react"

export function HeroImage() {
  const [lightError, setLightError] = useState(false)
  const [darkError, setDarkError] = useState(false)

  if (lightError && darkError) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* HERO IMAGE — background, blends into bg-base at edges */}
      {!lightError && (
        <Image
          src="/hero-light.jpg"
          alt=""
          fill
          className="object-cover object-[center_30%] dark:hidden"
          priority
          onError={() => setLightError(true)}
        />
      )}
      {!darkError && (
        <Image
          src="/hero-dark.jpg"
          alt=""
          fill
          className="object-cover object-[center_30%] hidden dark:block"
          priority
          onError={() => setDarkError(true)}
        />
      )}
      {/* Top fade: strong blend into bg-base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)] via-transparent to-transparent" />
      {/* Bottom fade: covers lower half completely */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[var(--bg-base)]" />
      {/* Soft side fades */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-base)]/70 via-transparent to-[var(--bg-base)]/70" />
    </div>
  )
}
