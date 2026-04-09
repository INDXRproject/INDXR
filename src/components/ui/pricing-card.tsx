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
  // Calculate minutes (1 credit = 10 min)
  const minutes = credits * 10;

  // Parse price for calculations (remove € and convert to number)
  const priceNum = parseFloat(price.replace('€', ''));
  const perMinute = (priceNum / minutes).toFixed(3);

  // Calculate cost for a 1-hour video (6 credits)
  const hourCredits = 6;
  const hourCost = ((priceNum / credits) * hourCredits).toFixed(2);

  return (
    <Card className={cn(
      "relative p-6 transition-all duration-300 flex flex-col h-full bg-card border",
      featured
        ? "border-primary shadow-sm scale-[1.02] z-10"
        : "hover:border-primary/50 hover:shadow-sm hover:-translate-y-1"
    )}>

      {/* Label badge */}
      {label && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className={cn(
            "font-semibold px-3 py-0.5 text-xs",
            featured
              ? "bg-primary text-primary-foreground hover:bg-primary"
              : "bg-muted text-muted-foreground hover:bg-muted"
          )}>
            {label}
          </Badge>
        </div>
      )}

      {/* Package name */}
      <h3 className="text-xl font-semibold mb-2">{name}</h3>

      {/* Price */}
      <div className="mb-3 flex items-baseline">
        <span className="text-4xl font-bold tracking-tight">{price}</span>
        <span className="text-muted-foreground ml-2 text-sm">EUR</span>
      </div>

      {/* Credits and minutes */}
      <div className="mb-1">
        <p className="text-base text-primary font-medium">
          {credits} credits
        </p>
        <p className="text-sm text-muted-foreground">
          {minutes} minutes of video
        </p>
      </div>

      {/* Per-minute cost */}
      <p className="text-xs text-muted-foreground mb-3">
        €{perMinute}/min
      </p>

      {/* Example cost */}
      <p className="text-xs text-muted-foreground/80 mb-4 italic">
        A 1-hour video costs {hourCredits} credits (€{hourCost})
      </p>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-6">
        {description}
      </p>

      {/* CTA Button */}
      <div className="mt-auto">
        <Button
          className="w-full mb-6 font-semibold"
          size="lg"
          variant={featured ? "default" : "outline"}
          onClick={onSelect}
        >
          {ctaLabel}
        </Button>

        {/* Feature list */}
        <div className="space-y-3">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="mt-0.5 rounded-full bg-success/10 p-1">
                <Check className="size-3 text-success shrink-0" />
              </div>
              <span className="text-xs text-muted-foreground leading-tight">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
