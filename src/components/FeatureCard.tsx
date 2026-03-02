import { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group p-6 rounded-2xl bg-card border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="mb-4 inline-flex p-3 rounded-full bg-muted text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="size-6" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
