import { cn } from "@/lib/utils";
import { PawLoader } from "@/components/shared/CatIcons";

interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

/**
 * Cat-themed paw-print bounce loader. Shows three paws bouncing in sequence.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, label }) => (
  <div className={cn("flex items-center justify-center", className)}>
    <PawLoader label={label} />
  </div>
);
