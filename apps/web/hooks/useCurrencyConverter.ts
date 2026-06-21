"use client";

import { useEffect } from "react";
import { useExchangeRateStore } from "@/store/exchangeRateStore";
import { useUIStore } from "@/store/uiStore";
import { CURRENCIES } from "@/lib/constants";

/**
 * Returns a function that converts an IDR amount to the currently selected
 * currency and formats it as a string.
 *
 * Falls back to raw IDR formatting if rates haven't loaded yet.
 */
export function useCurrencyConverter() {
  const currency = useUIStore((s) => s.currency);
  const { rates, fetchRates } = useExchangeRateStore();

  // Trigger a fetch on mount (no-op if cached today)
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const config = CURRENCIES[currency];
  const rate = rates[currency] ?? null;

  function convert(amountIDR: number): number {
    if (rate === null || currency === "IDR") return amountIDR;
    return amountIDR * rate;
  }

  function format(amountIDR: number): string {
    const converted = convert(amountIDR);
    try {
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.code,
        minimumFractionDigits: config.decimals,
        maximumFractionDigits: config.decimals,
      }).format(converted);
    } catch {
      return `${config.symbol}${converted.toFixed(config.decimals)}`;
    }
  }

  return { convert, format, currency, config, rate, loading: useExchangeRateStore((s) => s.loading) };
}
