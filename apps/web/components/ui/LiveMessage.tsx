import { cn } from "@/lib/utils";

export function LiveMessage({
  children,
  error = false,
  className,
}: {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      className={cn("text-sm", error ? "text-destructive" : "text-success", className)}
    >
      {children}
    </div>
  );
}
