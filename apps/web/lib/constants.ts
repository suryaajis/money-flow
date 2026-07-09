import type { Category, CurrencyCode, CurrencyConfig } from "@/lib/types";

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  IDR: { code: "IDR", symbol: "Rp", locale: "id-ID", decimals: 0 },
  USD: { code: "USD", symbol: "$", locale: "en-US", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", locale: "de-DE", decimals: 2 },
  SGD: { code: "SGD", symbol: "S$", locale: "en-SG", decimals: 2 },
  MYR: { code: "MYR", symbol: "RM", locale: "ms-MY", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", locale: "ja-JP", decimals: 0 },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", decimals: 2 },
};

export const DEFAULT_CURRENCY: CurrencyCode = "IDR";

// Storage keys for the localStorage persistence layer.
export const STORAGE_KEYS = {
  transactions: "money-flow:transactions",
  categories: "money-flow:categories",
  ui: "money-flow:ui",
  seeded: "money-flow:seeded",
} as const;

// Color palette used for default categories. Picked for good contrast in
// both light and dark mode.
export const CATEGORY_COLORS = [
  "#10b981", // emerald
  "#ef4444", // red
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#a855f7", // purple
] as const;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-salary", name: "Salary", color: "#10b981", icon: "Briefcase", type: "income", isDefault: true },
  { id: "cat-investment", name: "Investment", color: "#06b6d4", icon: "TrendingUp", type: "both", isDefault: true },
  { id: "cat-food", name: "Food", color: "#f97316", icon: "Utensils", type: "expense", isDefault: true },
  { id: "cat-transport", name: "Transport", color: "#3b82f6", icon: "Car", type: "expense", isDefault: true },
  { id: "cat-entertainment", name: "Entertainment", color: "#8b5cf6", icon: "Film", type: "expense", isDefault: true },
  { id: "cat-health", name: "Health", color: "#ec4899", icon: "HeartPulse", type: "expense", isDefault: true },
  { id: "cat-shopping", name: "Shopping", color: "#a855f7", icon: "ShoppingBag", type: "expense", isDefault: true },
  { id: "cat-bills", name: "Bills", color: "#ef4444", icon: "Receipt", type: "expense", isDefault: true },
  { id: "cat-other", name: "Other", color: "#64748b", icon: "Tag", type: "both", isDefault: true },
];

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/transactions", label: "Transactions", icon: "ArrowLeftRight" },
  { href: "/budget", label: "Budget", icon: "PiggyBank" },
  { href: "/recurring", label: "Recurring", icon: "Repeat" },
  { href: "/debts", label: "Hutang", icon: "HandCoins" },
  { href: "/import", label: "Import", icon: "ScanLine" },
  { href: "/categories", label: "Categories", icon: "Tags" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/settings/profile", label: "Profile", icon: "UserCircle" },
] as const;
