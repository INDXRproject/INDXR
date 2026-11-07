import { Button } from "./button"
import { FileText } from "lucide-react"
import { EMPTY_FRAME, EMPTY_ICON } from "../../lib/notice"

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
    <div className={`flex flex-col items-center justify-center ${EMPTY_FRAME}`}>

      <div className={EMPTY_ICON}>
        <Icon className="size-6 text-fg-strong" />
      </div>

      <h3 className="text-2xl font-bold tracking-[-0.02em] mb-2 text-fg-strong">
        {title}
      </h3>

      <p className="text-fg max-w-md mb-6">
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
