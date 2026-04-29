import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-border focus-visible:ring-accent-ring/50 focus-visible:ring-[3px] aria-invalid:ring-error/20 dark:aria-invalid:ring-error/40 aria-invalid:border-error transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-fg-on-accent [a&]:hover:bg-accent-hover",
        secondary:
          "border-transparent bg-surface-elevated text-fg-subtle [a&]:hover:bg-surface-elevated",
        destructive:
          "border-transparent bg-error text-fg-on-accent [a&]:hover:bg-error focus-visible:ring-error/20 dark:focus-visible:ring-error/40",
        outline:
          "border border-border text-fg-subtle [a&]:hover:bg-accent [a&]:hover:text-fg-on-accent [a&]:hover:border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
