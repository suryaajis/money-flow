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
    "bg-primary text-primary-foreground shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_22%,transparent)] hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_28%,transparent)] focus-visible:ring-ring active:translate-y-0 active:scale-[0.98]",
  secondary:
    "border border-border/70 bg-muted/80 text-foreground hover:-translate-y-0.5 hover:bg-muted focus-visible:ring-ring active:translate-y-0 active:scale-[0.98]",
  outline:
    "border border-border bg-card/65 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent focus-visible:ring-ring active:translate-y-0 active:scale-[0.98]",
  ghost:
    "bg-transparent text-foreground hover:bg-accent focus-visible:ring-ring active:scale-[0.97]",
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
  (
    { className, variant = "default", size = "md", type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold",
        "transition-[transform,background-color,border-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
