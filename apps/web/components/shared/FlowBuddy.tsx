import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowBuddyProps {
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

/** A tiny MoneyFlow companion. Decorative unless a label is supplied. */
export const FlowBuddy: React.FC<FlowBuddyProps> = ({
  size = "md",
  className,
  label,
}) => (
  <span
    className={cn("cute-orb", size === "sm" && "cute-orb-sm", className)}
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? "img" : undefined}
  >
    <Sparkles
      className={cn(
        "absolute -right-1 -top-1 text-brand-navy drop-shadow-sm",
        size === "sm" ? "h-3 w-3" : "h-4 w-4",
      )}
      aria-hidden
    />
  </span>
);
