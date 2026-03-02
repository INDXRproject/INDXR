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
  ctaLabel = "Buy Now",
  onSelect 
}: PricingCardProps) {
  return (
    <Card className={cn(
      "relative p-8 transition-all duration-300 flex flex-col h-full bg-card/50 backdrop-blur-sm border-muted",
      featured 
        ? "border-primary shadow-xl shadow-primary/10 scale-105 z-10" 
        : "hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 hover:shadow-primary/5"
    )}>
      
      {/* Featured badge */}
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary px-4 py-1">
            Best Value
            </Badge>
        </div>
      )}
      
      {/* Package name */}
      <h3 className="text-2xl font-semibold mb-2 text-foreground">{name}</h3>
      
      {/* Price */}
      <div className="mb-4 flex items-baseline">
        <span className="text-5xl font-bold tracking-tight text-foreground">{price}</span>
        <span className="text-muted-foreground ml-2">EUR</span>
      </div>
      
      {/* Credits */}
      <p className="text-lg text-primary font-medium mb-2 flex items-center gap-2">
        {credits} credits
      </p>
      
      {/* Description */}
      <p className="text-sm text-muted-foreground mb-8">
        {description}
      </p>
      
      {/* CTA Button */}
      <div className="mt-auto">
        <Button 
            className={cn(
            "w-full mb-8 font-semibold",
            featured && "shadow-lg shadow-primary/20 hover:shadow-primary/30"
            )}
            size="lg"
            variant={featured ? "default" : "outline"}
            onClick={onSelect}
        >
            {ctaLabel}
        </Button>
        
        {/* Feature list */}
        <div className="space-y-4">
            {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-green-500/10 p-1">
                    <Check className="size-3.5 text-green-500 shrink-0" />
                </div>
                <span className="text-sm text-muted-foreground leading-tight">{feature}</span>
            </div>
            ))}
        </div>
      </div>
    </Card>
  );
}
