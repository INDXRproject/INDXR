"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/utils"
import { VideoModeIcon, PlaylistModeIcon, AudioModeIcon } from "../icons/TranscribeModeIcons"

/**
 * Mode strip — the segmented control at the head of the TranscribeWorkbench.
 * Built on Radix Tabs.List/Trigger so it gets role="tablist", roving tabindex and
 * arrow-key navigation for free; styled as a segmented control per ADR-079.
 *
 * The active cell is NEVER solid amber — there is exactly one amber element per
 * card and that is the action button. Stijl B (2026-11-07): three joined cells with
 * 2px ink rules; active = ink fill with paper text, inactive = paper with ink text.
 *
 * Must be rendered inside a <Tabs> (TabsPrimitive.Root) — it only supplies the List.
 */

// Order Upload → YouTube → Playlist with Upload first (Taak 6, 2026-09-11): the product is used
// ~16:1 for file uploads and the ad spend bids on file keywords, so Upload leads. The middle tab is
// relabelled "Video" → "YouTube" because Upload now also handles video files — "YouTube" names the
// SOURCE (a link) unambiguously against the file-upload tab.
const MODES = [
  { value: "audio", label: "Upload", Icon: AudioModeIcon },
  { value: "video", label: "YouTube", Icon: VideoModeIcon },
  { value: "playlist", label: "Playlist", Icon: PlaylistModeIcon },
] as const

export function ModeStrip({ className }: { className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "grid w-full grid-cols-3 border-b-2 border-[var(--fg-strong)]",
        className
      )}
    >
      {MODES.map(({ value, label, Icon }) => (
        <TabsPrimitive.Trigger
          key={value}
          value={value}
          className={cn(
            "group flex items-center justify-center gap-2 h-12 min-h-[44px] px-2",
            "text-sm font-bold whitespace-nowrap cursor-pointer select-none",
            "border-r-2 border-[var(--fg-strong)] last:border-r-0 text-[var(--fg-strong)] bg-[var(--bg)] transition-colors duration-150",
            "hover:bg-[var(--bg-subtle)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]",
            "data-[state=active]:bg-[var(--fg-strong)] data-[state=active]:text-[var(--bg)]"
          )}
        >
          <Icon className="size-[18px] text-current" />
          {label}
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
  )
}
