import { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="
      group p-6 rounded-xl border
      bg-[var(--bg-surface)] border-[var(--border)]
      shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-none
      hover:border-[var(--text-muted)] hover:-translate-y-0.5
      transition-all duration-150 ease-out
      cursor-pointer
    ">
      <div className="
        w-10 h-10 rounded-lg mb-4
        bg-[var(--bg-elevated)]
        flex items-center justify-center
      ">
        <Icon className="w-5 h-5 text-[var(--accent)]" />
      </div>
      <h3 className="
        text-[15px] font-semibold tracking-tight mb-2
        text-[var(--text-primary)]
      ">
        {title}
      </h3>
      <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  )
}
