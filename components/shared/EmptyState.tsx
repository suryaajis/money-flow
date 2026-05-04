import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center px-6 py-12",
      "border border-dashed border-border rounded-xl bg-muted/30",
      className,
    )}
  >
    {icon ? (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card text-muted-foreground border border-border">
        {icon}
      </div>
    ) : null}
    <h3 className="text-base font-semibold">{title}</h3>
    {description ? (
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
