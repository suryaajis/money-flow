import * as React from "react";
import { cn } from "@/lib/utils";
import { FlowBuddy } from "@/components/shared/FlowBuddy";

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
      "relative flex flex-col items-center justify-center overflow-hidden px-6 py-12 text-center",
      "rounded-2xl border border-dashed border-primary/20 bg-gradient-to-b from-primary/[0.055] to-muted/20",
      className,
    )}
  >
    {icon ? (
      <div className="mf-card mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary">
        {icon}
      </div>
    ) : (
      <FlowBuddy className="mb-4" />
    )}
    <h3 className="text-base font-semibold">{title}</h3>
    {description ? (
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
