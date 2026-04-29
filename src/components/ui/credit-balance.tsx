import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CreditBalanceProps {
  credits: number;
  className?: string;
}

export function CreditBalance({ credits, className }: CreditBalanceProps) {
  return (
    <Link
      href="/pricing"
      className={cn(
        "flex items-center gap-2",
        "px-3 py-1.5 rounded-full",
        "bg-accent-subtle border border-accent-ring",
        "transition-colors hover:bg-accent-subtle/80",
        "cursor-pointer",
        className
      )}
    >
      <Sparkles className="size-4 text-accent" />
      <span className="text-sm font-medium text-accent">
        {credits} credits
      </span>
    </Link>
  );
}
