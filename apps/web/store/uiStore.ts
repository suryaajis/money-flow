import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Theme, CurrencyCode } from "@/lib/types";
import { STORAGE_KEYS, DEFAULT_CURRENCY } from "@/lib/constants";

interface UIState {
  theme: Theme;
  currency: CurrencyCode;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: CurrencyCode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      currency: DEFAULT_CURRENCY,
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: STORAGE_KEYS.ui,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
