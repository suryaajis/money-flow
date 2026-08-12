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
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  neutral: "text-foreground",
};

export const InsightCard: React.FC<InsightCardProps> = ({
  label,
  value,
  delta,
  tone = "neutral",
  icon,
}) => (
  <Card>
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("break-words text-xl font-semibold", toneClasses[tone])}>{value}</p>
          {delta ? (
            <p className={cn("text-xs", toneClasses[tone])}>{delta}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
);
