"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * Cat-themed button: pill-shaped, springy active state. The `default`
 * variant uses the peach primary; `secondary` uses cream; `destructive`
 * uses a soft coral so it doesn't feel angry.
 */
const variantClasses: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 focus-visible:ring-primary",
  secondary:
    "bg-accent text-accent-foreground hover:bg-accent/80 focus-visible:ring-primary",
  outline:
    "border border-border bg-card text-foreground hover:bg-accent hover:border-primary/40 focus-visible:ring-primary",
  ghost:
    "bg-transparent text-foreground hover:bg-accent focus-visible:ring-primary",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:bg-destructive/90 focus-visible:ring-destructive",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3.5 text-xs gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-tight",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-95 active:transition-transform",
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
