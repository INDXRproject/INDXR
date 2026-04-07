import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-[var(--border)] focus-visible:ring-[var(--border)]/50 focus-visible:ring-[3px] aria-invalid:ring-[var(--color-error)]/20 dark:aria-invalid:ring-[var(--color-error)]/40 aria-invalid:border-[var(--color-error)] transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent)] text-white [a&]:hover:bg-[var(--accent-hover)]",
        secondary:
          "border-transparent bg-[var(--bg-secondary)] text-[var(--text-secondary)] [a&]:hover:bg-[var(--bg-secondary-hover)]",
        destructive:
          "border-transparent bg-[var(--color-error)] text-white [a&]:hover:bg-[var(--color-error-hover)] focus-visible:ring-[var(--color-error)]/20 dark:focus-visible:ring-[var(--color-error)]/40",
        outline:
          "border border-[var(--border)] text-[var(--text-secondary)] [a&]:hover:bg-[var(--accent)] [a&]:hover:text-white [a&]:hover:border-transparent",
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
