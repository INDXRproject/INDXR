import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface PricingCardProps {
  name: string;
  price: string;
  credits: number;
  description: string;
  features: string[];
  featured?: boolean;
  label?: string;
  ctaLabel?: string;
  onSelect: () => void;
}

export function PricingCard({
  name,
  price,
  credits,
  description,
  features,
  featured = false,
  label,
  ctaLabel = "Buy Now",
  onSelect
}: PricingCardProps) {
  const minutes = credits;
  const priceNum = parseFloat(price.replace('€', ''));
  const perMinute = (priceNum / minutes).toFixed(3);
  const hourCredits = 60;
  const hourCost = ((priceNum / credits) * hourCredits).toFixed(2);

  return (
    <Card className={cn(
      "relative p-6 transition-all duration-300 flex flex-col h-full",
      featured
        ? "border-accent shadow-sm scale-[1.02] z-10"
        : "hover:border-accent/50 hover:shadow-sm hover:-translate-y-1"
    )}>

      {label && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className={cn(
            "font-semibold px-3 py-0.5 text-xs",
            featured
              ? "bg-accent text-fg-on-accent hover:bg-accent"
              : "bg-surface-elevated text-fg-muted hover:bg-surface-elevated"
          )}>
            {label}
          </Badge>
        </div>
      )}

      <h3 className="text-xl font-semibold mb-2">{name}</h3>

      <div className="mb-3 flex items-baseline">
        <span className="text-4xl font-bold tracking-tight">{price}</span>
        <span className="text-fg-muted ml-2 text-sm">EUR</span>
      </div>

      <div className="mb-1">
        <p className="text-base text-accent font-medium">
          {credits} credits
        </p>
        <p className="text-sm text-fg-muted">
          {minutes} minutes of video
        </p>
      </div>

      <p className="text-xs text-fg-muted mb-3">
        €{perMinute}/min
      </p>

      <p className="text-xs text-fg-muted/80 mb-4 italic">
        A 1-hour video costs {hourCredits} credits (€{hourCost})
      </p>

      <p className="text-sm text-fg-muted mb-6">
        {description}
      </p>

      <div className="mt-auto">
        <Button
          className="w-full mb-6 font-semibold"
          size="lg"
          variant={featured ? "default" : "outline"}
          onClick={onSelect}
        >
          {ctaLabel}
        </Button>

        <div className="space-y-3">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="mt-0.5 rounded-full bg-success-subtle p-1">
                <Check className="size-3 text-success shrink-0" />
              </div>
              <span className="text-xs text-fg-muted leading-tight">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
