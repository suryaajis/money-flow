"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-ring",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-accent focus-visible:ring-ring",
  ghost: "bg-transparent text-foreground hover:bg-accent focus-visible:ring-ring",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-ring",
};

// Mobile-first heights hit the ~44px touch guideline; `sm:` trims them back to
// the tighter desktop sizes where a cursor is precise.
const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-xs gap-1.5 sm:h-8",
  md: "h-11 px-4 text-sm gap-2 sm:h-10",
  lg: "h-11 px-6 text-base gap-2",
  icon: "h-10 w-10 p-0 sm:h-9 sm:w-9",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
