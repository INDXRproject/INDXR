"use client"

import Image from "next/image"
import { useState } from "react"

export function HeroImage() {
  const [lightError, setLightError] = useState(false)
  const [darkError, setDarkError] = useState(false)

  if (lightError && darkError) return null

  return (
    <div className="relative w-full mt-10">
      {/* HERO IMAGE — swap via Image-to-Image after redesign */}
      {!lightError && (
        <Image
          src="/hero-light.jpg"
          alt="INDXR.AI — YouTube transcript extraction interface"
          width={1200}
          height={630}
          className="w-full h-auto dark:hidden"
          priority
          onError={() => setLightError(true)}
        />
      )}
      {!darkError && (
        <Image
          src="/hero-dark.jpg"
          alt="INDXR.AI — YouTube transcript extraction interface"
          width={1200}
          height={630}
          className="w-full h-auto hidden dark:block"
          priority
          onError={() => setDarkError(true)}
        />
      )}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
    </div>
  )
}
