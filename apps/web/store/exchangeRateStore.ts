"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CurrencyCode } from "@/lib/types";

interface ExchangeRateState {
  /** Rates keyed by currency code, base = IDR (i.e., 1 IDR = rates[code] units) */
  rates: Partial<Record<CurrencyCode, number>>;
  lastFetched: number | null; // unix ms timestamp
  loading: boolean;
  error: string | null;
  fetchRates: () => Promise<void>;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const useExchangeRateStore = create<ExchangeRateState>()(
  persist(
    (set, get) => ({
      rates: {},
      lastFetched: null,
      loading: false,
      error: null,
      fetchRates: async () => {
        const { lastFetched, loading } = get();
        // Skip if already loading or fetched today
        if (loading) return;
        if (lastFetched && Date.now() - lastFetched < ONE_DAY_MS) return;

        set({ loading: true, error: null });
        try {
          // Free API, no key needed, base = IDR
          const res = await fetch("https://open.er-api.com/v6/latest/IDR");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data.result !== "success") throw new Error("API error");

          const rates: Partial<Record<CurrencyCode, number>> = {
            IDR: 1,
            USD: data.rates?.USD,
            EUR: data.rates?.EUR,
            SGD: data.rates?.SGD,
            MYR: data.rates?.MYR,
            JPY: data.rates?.JPY,
            GBP: data.rates?.GBP,
          };

          set({ rates, lastFetched: Date.now(), loading: false, error: null });
        } catch (err) {
          set({ loading: false, error: (err as Error).message });
        }
      },
    }),
    {
      name: "money-flow:exchange-rates",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ rates: s.rates, lastFetched: s.lastFetched }),
    },
  ),
);
