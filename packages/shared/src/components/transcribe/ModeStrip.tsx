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
 * card and that is the action button. Active = raised --surface cell with a
 * hairline + --fg-strong label + --accent icon; inactive = transparent + --fg-muted.
 * A transparent border on the inactive state keeps the box size identical so the
 * active hairline causes no layout shift.
 *
 * Must be rendered inside a <Tabs> (TabsPrimitive.Root) — it only supplies the List.
 */

const MODES = [
  { value: "video", label: "Video", Icon: VideoModeIcon },
  { value: "playlist", label: "Playlist", Icon: PlaylistModeIcon },
  { value: "audio", label: "Audio", Icon: AudioModeIcon },
] as const

export function ModeStrip({ className }: { className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex w-full items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1",
        className
      )}
    >
      {MODES.map(({ value, label, Icon }) => (
        <TabsPrimitive.Trigger
          key={value}
          value={value}
          className={cn(
            "group flex flex-1 items-center justify-center gap-2 rounded-md h-11 min-h-[44px] px-2",
            "text-sm font-medium whitespace-nowrap cursor-pointer select-none",
            "border border-transparent text-[var(--fg-muted)] transition-colors duration-150",
            "hover:text-[var(--fg)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
            "data-[state=active]:bg-[var(--surface)] data-[state=active]:border-[var(--border)]",
            "data-[state=active]:text-[var(--fg-strong)] data-[state=active]:shadow-xs"
          )}
        >
          <Icon className="size-[18px] text-[var(--fg-muted)] group-hover:text-[var(--fg)] group-data-[state=active]:text-[var(--accent)] transition-colors duration-150" />
          {label}
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
  )
}
