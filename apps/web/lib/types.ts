// Core domain types for Money Flow.
// All persisted data and store shapes derive from these definitions.

export type TransactionType = "income" | "expense";

export type CategoryScope = TransactionType | "both";

export interface Category {
  id: string;
  name: string;
  color: string; // Hex color used by charts and badges
  icon?: string; // Lucide icon name (optional)
  type: CategoryScope;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  amount: number; // Always positive; sign is implied by `type`
  type: TransactionType;
  categoryId: string;
  date: string; // ISO 8601 (YYYY-MM-DD or full ISO datetime)
  notes?: string;
  currency?: CurrencyCode | null; // optional per-transaction currency; null means use global setting
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  type?: TransactionType | "all";
  searchQuery?: string;
  tag?: string;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export interface MonthlyAggregate {
  month: string; // e.g., "2026-04" or display label "Apr 2026"
  income: number;
  expense: number;
  net: number;
}

export interface CategoryAggregate {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  percentage: number;
}

export type Theme = "light" | "dark" | "system";

export type CurrencyCode = "IDR" | "USD" | "EUR" | "SGD" | "MYR" | "JPY" | "GBP";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  decimals: number;
}
