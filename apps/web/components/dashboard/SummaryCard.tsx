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
  neutral: "bg-muted text-foreground",
  income: "bg-brand-navy text-brand-lime",
  expense: "bg-brand-lime text-brand-navy",
};

const toneSurface: Record<Tone, string> = {
  neutral: "border-brand-navy/15 bg-card text-foreground",
  income:
    "rounded-[2rem] rounded-br-[0.85rem] border-brand-navy/25 bg-brand-lime text-brand-navy",
  expense:
    "rounded-[2rem] rounded-tl-[0.85rem] border-brand-navy bg-brand-navy text-white",
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
        "group interactive-lift metric-sheen neo-sticker h-full overflow-hidden",
        toneSurface[tone],
      )}
    >
      <CardContent className="flex h-full items-center p-5 sm:p-6">
        <div className="flex w-full items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-[0.12em]",
                tone === "expense" ? "text-white/55" : "text-brand-navy/60",
              )}
            >
              {label}
            </p>
            <p
              data-numeric
              className={cn(
                "display-number break-words text-2xl font-black sm:text-[1.7rem]",
                tone === "expense" ? "text-white" : "text-brand-navy",
              )}
            >
              {fmt(amount)}
            </p>
            {hint ? (
              <p
                className={cn(
                  "text-xs",
                  tone === "expense" ? "text-white/50" : "text-brand-navy/65",
                )}
              >
                {hint}
              </p>
            ) : null}
          </div>
          {icon ? (
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] shadow-sm transition-transform group-hover:rotate-6",
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
