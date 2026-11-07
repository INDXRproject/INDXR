import * as React from "react"

import { cn } from "../../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-fg placeholder:text-fg-muted selection:bg-accent selection:text-fg-on-accent border-border-strong h-10 w-full min-w-0 rounded-md border-2 bg-bg px-3 py-1 text-base shadow-xs transition-all duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-accent",
        "aria-invalid:ring-0 aria-invalid:border-error aria-invalid:border-l-[6px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
