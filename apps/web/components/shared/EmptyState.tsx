import * as React from "react";
import { cn } from "@/lib/utils";
import { SleepingCat } from "@/components/shared/CatIcons";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** When true, render the cute sleeping cat illustration instead of `icon`. */
  cat?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  cat = true,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center px-6 py-12",
      "border-2 border-dashed border-border rounded-2xl bg-muted/40",
      className,
    )}
  >
    {cat && !icon ? (
      <div className="mb-4 text-primary/70">
        <SleepingCat className="h-20 w-auto" />
      </div>
    ) : icon ? (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        {icon}
      </div>
    ) : null}
    <h3 className="text-base font-bold tracking-tight">{title}</h3>
    {description ? (
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
