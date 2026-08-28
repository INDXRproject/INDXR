"use client"

import { useRef, useState } from "react"
import { Play } from "lucide-react"
import posthog from "posthog-js"

// The product walkthrough (rendered by apps/video → /public/video). Click-to-play, NOT autoplay:
// muted-autoplay background loops show no measurable conversion lift and can hurt on action pages, so
// this is a deliberate section with its own heading and an explicit play affordance.
//
// Theme handling mirrors DocsFigure: instead of detecting the theme in JS (next-themes isn't a direct
// marketing dependency), the light and dark players are BOTH in the DOM and swapped by [data-theme]
// via CSS. Only the visible one can be clicked, so only its <video> ever loads and only its events
// fire — no double download of the MP4, no hydration flash.
function ClipPlayer({ theme }: { theme: "light" | "dark" }) {
  const [started, setStarted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fired = useRef<Set<string>>(new Set())

  const src = `/video/home-clip-${theme}.mp4`
  const poster = `/video/home-clip-${theme}-poster.png`

  const start = () => {
    setStarted(true)
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}))
  }

  const onPlay = () => {
    if (fired.current.has("play")) return
    fired.current.add("play")
    posthog.capture("home_video_play", { theme })
  }

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const pct = (v.currentTime / v.duration) * 100
    for (const m of [25, 50, 75]) {
      const key = `p${m}`
      if (pct >= m && !fired.current.has(key)) {
        fired.current.add(key)
        posthog.capture("home_video_progress", { percent: m, theme })
      }
    }
  }

  const onEnded = () => {
    if (fired.current.has("complete")) return
    fired.current.add("complete")
    posthog.capture("home_video_complete", { theme })
  }

  return (
    <div className="relative aspect-video w-full">
      {!started ? (
        <button
          type="button"
          onClick={start}
          aria-label="Play the product walkthrough"
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="A short walkthrough of INDXR: pasting a link, the library, a transcript, a chapter summary, and the export menu." className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--fg-on-accent)] shadow-lg transition-transform group-hover:scale-105">
              <Play className="ml-0.5 h-7 w-7 fill-current" />
            </span>
          </span>
        </button>
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          playsInline
          preload="auto"
          onPlay={onPlay}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          className="absolute inset-0 h-full w-full bg-[var(--bg)]"
        />
      )}
    </div>
  )
}

export function HomeClipVideo() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="block dark:hidden">
        <ClipPlayer theme="light" />
      </div>
      <div className="hidden dark:block">
        <ClipPlayer theme="dark" />
      </div>
    </div>
  )
}
