import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCIES } from "@/lib/constants";
import type { CurrencyConfig } from "@/lib/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a number as a currency string. Defaults to IDR if no config supplied. */
export function formatCurrency(
  value: number,
  opts?: { compact?: boolean; currency?: CurrencyConfig },
): string {
  const currency = opts?.currency ?? CURRENCIES.IDR;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : currency.decimals,
  }).format(value);
}

/** Signed currency string: prefixed with `+` for income, `-` for expense. */
export function formatSignedAmount(
  amount: number,
  type: "income" | "expense",
  currency?: CurrencyConfig,
): string {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${formatCurrency(amount, { currency })}`;
}

/** Format an ISO date as a short, locale-aware date string. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Today as YYYY-MM-DD (good default for date inputs). */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Stable id generator that does not require `crypto.randomUUID` polyfills. */
export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Bucket an ISO date string into "YYYY-MM" for monthly aggregations. */
export function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Human label for a YYYY-MM month key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

/** Generate the last `count` month keys including the current month, oldest first. */
export function lastNMonthKeys(count: number, ref: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

/** Clamp a number to a [min, max] range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
