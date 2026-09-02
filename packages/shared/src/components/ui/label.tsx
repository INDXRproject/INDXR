"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "../../lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      // ph-no-capture: a <label htmlFor> fires TWO click events per tap — one on the label and a
      // browser-synthesised one on the coupled control — so PostHog autocapture double-counts every tap
      // and two taps read as four, inflating $rageclick into a meaningless signal. This class makes
      // autocapture ignore the (redundant) label click; the control's own click stays the single canonical
      // event, whether the user taps the label or the field directly. Behaviour is untouched — the label
      // still focuses/activates its control. See LESSONS 2026-09-02.
      className={cn(
        "ph-no-capture flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
