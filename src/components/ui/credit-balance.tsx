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
        "bg-info/10 border border-info/20",      // Sky blue tint
        "transition-colors hover:bg-info/15",    // Subtle hover
        "cursor-pointer",
        className
      )}
    >
      <Sparkles className="size-4 text-info" />
      <span className="text-sm font-medium text-info">
        {credits} credits
      </span>
    </Link>
  );
}
