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
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
      
      {/* Icon */}
      <div className="mb-6 p-6 rounded-full bg-zinc-900 border border-zinc-800">
        <Icon className="size-12 text-zinc-500" />
      </div>
      
      {/* Title */}
      <h3 className="text-2xl font-semibold mb-2 text-white">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-zinc-400 max-w-md mb-6">
        {description}
      </p>
      
      {/* Action button (optional) */}
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </div>
  );
}
