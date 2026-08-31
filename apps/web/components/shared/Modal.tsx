"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}) => {
  // Close on Escape and lock body scroll while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "page-enter relative z-10 w-full border border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl",
          "rounded-t-[1.5rem] sm:rounded-[1.5rem]",
          "max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
          "mx-0 sm:mx-4",
        )}
      >
        <div className="flex items-start justify-between gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring -m-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* On the mobile bottom-sheet, pad past the home indicator. */}
        <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};
