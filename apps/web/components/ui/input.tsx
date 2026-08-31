import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full rounded-xl border border-input bg-card/80 px-3.5 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] sm:h-10 sm:text-sm",
      "placeholder:text-muted-foreground",
      "focus-visible:border-primary/60 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
