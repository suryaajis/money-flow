"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

type Tone = "neutral" | "income" | "expense";

interface SummaryCardProps {
  label: string;
  amount: number;
  tone?: Tone;
  icon?: React.ReactNode;
  hint?: string;
  /** Optional decoration to place in the top-right corner (e.g. a cat mascot). */
  decoration?: React.ReactNode;
}

const toneTextClass: Record<Tone, string> = {
  neutral: "text-foreground",
  income: "text-emerald-600 dark:text-emerald-400",
  expense: "text-rose-500 dark:text-rose-400",
};

const toneBgClass: Record<Tone, string> = {
  neutral: "bg-primary-soft text-primary",
  income: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  expense: "bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300",
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  amount,
  tone = "neutral",
  icon,
  hint,
  decoration,
}) => {
  const { fmt } = useCurrency();
  return (
    <Card className="overflow-hidden cat-card-hover relative">
      {decoration ? (
        <div
          aria-hidden
          className="absolute -right-3 -top-3 opacity-90 pointer-events-none"
        >
          {decoration}
        </div>
      ) : null}
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p
              className={cn(
                "text-2xl font-extrabold tracking-tight tabular-nums",
                toneTextClass[tone],
              )}
            >
              {fmt(amount)}
            </p>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          {icon ? (
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0",
                toneBgClass[tone],
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
