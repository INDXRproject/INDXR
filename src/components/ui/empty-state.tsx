import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-border bg-surface-sunken">

      <div className="mb-6 p-6 rounded-full bg-surface border border-border">
        <Icon className="size-12 text-fg-muted" />
      </div>

      <h3 className="text-2xl font-semibold mb-2 text-fg">
        {title}
      </h3>

      <p className="text-fg-muted max-w-md mb-6">
        {description}
      </p>

      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </div>
  );
}
