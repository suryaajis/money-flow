import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, label }) => (
  <div className={cn("flex items-center justify-center gap-2 text-muted-foreground", className)}>
    <Loader2 className="h-4 w-4 animate-spin" />
    {label ? <span className="text-sm">{label}</span> : null}
  </div>
);
