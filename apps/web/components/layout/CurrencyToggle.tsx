"use client";

import { useCurrency } from "@/hooks/useCurrency";
import { useExchangeRateStore } from "@/store/exchangeRateStore";
import { CURRENCIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { CurrencyCode } from "@/lib/types";
import { useEffect } from "react";

const CURRENCY_ORDER: CurrencyCode[] = ["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "GBP"];

export const CurrencyToggle: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const fetchRates = useExchangeRateStore((s) => s.fetchRates);

  // Trigger exchange rate fetch when toggle mounts
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const currentIdx = CURRENCY_ORDER.indexOf(currency);
  const nextIdx = (currentIdx + 1) % CURRENCY_ORDER.length;
  const next = CURRENCY_ORDER[nextIdx];
  const config = CURRENCIES[currency];

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrency(next)}
      aria-label={`Currency: ${currency}. Click to switch to ${next}.`}
      className="min-w-[64px] font-medium text-xs"
    >
      {config.symbol} {currency}
    </Button>
  );
};
