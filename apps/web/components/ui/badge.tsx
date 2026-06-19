import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium",
      "bg-muted text-muted-foreground",
      className,
    )}
    {...props}
  />
);
