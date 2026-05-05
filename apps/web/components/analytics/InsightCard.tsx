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

const toneTextClass: Record<Tone, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-500 dark:text-rose-400",
  neutral: "text-foreground",
};

const toneIconClass: Record<Tone, string> = {
  positive: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  negative: "bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300",
  neutral: "bg-primary-soft text-primary",
};

export const InsightCard: React.FC<InsightCardProps> = ({
  label,
  value,
  delta,
  tone = "neutral",
  icon,
}) => (
  <Card className="cat-card-hover">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-xl font-extrabold tabular-nums", toneTextClass[tone])}>{value}</p>
          {delta ? (
            <p className={cn("text-xs font-semibold", toneTextClass[tone])}>{delta}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl flex-shrink-0",
              toneIconClass[tone],
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
);
