"use client";

import { useMemo } from "react";
import { useUIStore } from "@/store/uiStore";
import { CURRENCIES } from "@/lib/constants";
import { formatCurrency, formatSignedAmount } from "@/lib/utils";
import type { CurrencyCode } from "@/lib/types";

export function useCurrency() {
  const currency = useUIStore((s) => s.currency);
  const setCurrency = useUIStore((s) => s.setCurrency);
  const config = CURRENCIES[currency];

  const fmt = useMemo(
    () =>
      (value: number, opts?: { compact?: boolean }) =>
        formatCurrency(value, { ...opts, currency: config }),
    [config],
  );

  const fmtSigned = useMemo(
    () =>
      (amount: number, type: "income" | "expense") =>
        formatSignedAmount(amount, type, config),
    [config],
  );

  const switchTo = (code: CurrencyCode) => setCurrency(code);

  return { currency, config, setCurrency: switchTo, fmt, fmtSigned };
}
