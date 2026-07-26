"use client"

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

import { cn } from "../../lib/utils"
import { Tabs, TabsContent } from "../ui/tabs"
import { ModeStrip } from "./ModeStrip"

export type TranscribeMode = "video" | "playlist" | "audio"
const MODES: TranscribeMode[] = ["video", "playlist", "audio"]

function normalizeMode(raw: string | null): TranscribeMode {
  return raw && (MODES as string[]).includes(raw) ? (raw as TranscribeMode) : "video"
}

/**
 * The shared transcribe card (ADR-079). One fixed anatomy every mode fills:
 *   header — the mode strip (segmented control)
 *   body   — the active mode's input + primary action (the tab slot)
 *   footer — the mode's source/cost line (rendered inside its tab body)
 *
 * Both apps render this; behaviour differs only through the slots each supplies
 * (auth-aware friction on marketing, always-authed in the app), never through a
 * fork. max-w-[640px] so it drops 1:1 into a vertical Remotion frame; a solid
 * --surface keeps the working area free of the honeycomb texture (system.md §5).
 *
 * ?mode= is the source of truth for which tab shows. It is written with the
 * History API (window.history.replaceState), NOT router.replace: router.replace
 * re-renders the route segment even with scroll:false, and that segment holds the
 * tabs' live job state — a mode switch mid-job could throw it away, plus the
 * 200–500ms hitch would show on the Remotion capture. replaceState is the App
 * Router's shallow route and useSearchParams picks the change up
 * (vercel/next.js discussions #49540, #60080).
 */
export type WorkbenchSlot = (helpers: {
  mode: TranscribeMode
  /** Switch the active mode (updates ?mode=). Lets a tab hand off, e.g. video → playlist. */
  switchMode: (mode: TranscribeMode) => void
}) => ReactNode

function TranscribeWorkbenchInner({
  renderVideo,
  renderPlaylist,
  renderAudio,
  className,
}: {
  renderVideo: WorkbenchSlot
  renderPlaylist: WorkbenchSlot
  renderAudio: WorkbenchSlot
  className?: string
}) {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<TranscribeMode>(() => normalizeMode(searchParams.get("mode")))

  // Keep local state in sync with the URL for back/forward navigation. useSearchParams
  // updates on replaceState in the App Router, and popstate covers the browser buttons.
  useEffect(() => {
    setMode(normalizeMode(searchParams.get("mode")))
  }, [searchParams])

  useEffect(() => {
    const onPop = () => setMode(normalizeMode(new URLSearchParams(window.location.search).get("mode")))
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const handleChange = useCallback((next: string) => {
    const value = normalizeMode(next)
    setMode(value)
    const params = new URLSearchParams(window.location.search)
    // video is the default — keep the URL bare so the marketing canonical (ADR-077)
    // and the common case carry no query.
    if (value === "video") params.delete("mode")
    else params.set("mode", value)
    const query = params.toString()
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    window.history.replaceState(window.history.state, "", url)
  }, [])

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[640px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-sm",
        className
      )}
    >
      <Tabs value={mode} onValueChange={handleChange} className="gap-0">
        <ModeStrip className="mb-6" />
        <TabsContent value="video" className="mt-0">{renderVideo({ mode, switchMode: handleChange })}</TabsContent>
        <TabsContent value="playlist" className="mt-0">{renderPlaylist({ mode, switchMode: handleChange })}</TabsContent>
        <TabsContent value="audio" className="mt-0">{renderAudio({ mode, switchMode: handleChange })}</TabsContent>
      </Tabs>
    </div>
  )
}

export function TranscribeWorkbench(props: {
  renderVideo: WorkbenchSlot
  renderPlaylist: WorkbenchSlot
  renderAudio: WorkbenchSlot
  className?: string
}) {
  // useSearchParams needs a Suspense boundary so the client page doesn't bail out of
  // static rendering at build time.
  return (
    <Suspense fallback={null}>
      <TranscribeWorkbenchInner {...props} />
    </Suspense>
  )
}
