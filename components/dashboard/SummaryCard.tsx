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
  neutral: "from-blue-500/15 to-blue-500/0 text-blue-600 dark:text-blue-400",
  income: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
  expense: "from-rose-500/15 to-rose-500/0 text-rose-600 dark:text-rose-400",
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
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-semibold tracking-tight", toneAccent[tone].split(" ").slice(2).join(" "))}>
              {fmt(amount)}
            </p>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          {icon ? (
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br",
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
