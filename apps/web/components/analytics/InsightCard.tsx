import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "positive" | "negative" | "neutral";

interface InsightCardProps {
  label: string;
  value: string;
  delta?: string;
  tone?: Tone;
  icon?: React.ReactNode;
}

const toneClasses: Record<Tone, string> = {
  positive: "text-income",
  negative: "text-expense",
  neutral: "text-foreground",
};

export const InsightCard: React.FC<InsightCardProps> = ({
  label,
  value,
  delta,
  tone = "neutral",
  icon,
}) => (
  <Card className="interactive-lift metric-sheen overflow-hidden">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p
            data-numeric
            className={cn(
              "break-words text-xl font-bold tracking-[-0.025em]",
              toneClasses[tone],
            )}
          >
            {value}
          </p>
          {delta ? (
            <p className={cn("text-xs", toneClasses[tone])}>{delta}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone === "positive"
                ? "bg-income-soft text-income"
                : tone === "negative"
                  ? "bg-expense-soft text-expense"
                  : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
);
