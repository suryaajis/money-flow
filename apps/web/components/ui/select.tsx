import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native <select> styled to match other form controls. Avoiding Radix here
 * keeps the bundle small and the CLI-free setup simple while still being
 * fully accessible.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full appearance-none rounded-xl border border-input bg-card/80 px-3.5 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] sm:h-10 sm:text-sm",
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-[right_0.75rem_center] pr-9",
      "focus-visible:border-primary/60 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
