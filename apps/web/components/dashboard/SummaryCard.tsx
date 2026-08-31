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
}

const toneAccent: Record<Tone, string> = {
  neutral: "bg-primary/10 text-primary",
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  amount,
  tone = "neutral",
  icon,
  hint,
}) => {
  const { fmt } = useCurrency();
  return (
    <Card
      className={cn(
        "interactive-lift metric-sheen h-full overflow-hidden",
        tone === "income"
          ? "text-income"
          : tone === "expense"
            ? "text-expense"
            : "text-primary",
      )}
    >
      <CardContent className="flex h-full items-center p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
            <p
              data-numeric
              className="break-words text-2xl font-bold tracking-[-0.035em] text-foreground sm:text-[1.7rem]"
            >
              {fmt(amount)}
            </p>
            {hint ? (
              <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </div>
          {icon ? (
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
                toneAccent[tone],
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
