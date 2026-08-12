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

/**
 * Format a numeric value (string or number) with locale-aware thousand
 * separators, suitable for live display inside an <input>. The decimal part
 * is preserved up to 2 digits (e.g. "100000" -> "100.000", "1500.5" ->
 * "1.500,5" on id-ID locale).
 *
 * Empty / NaN inputs return an empty string so the field can be cleared.
 */
export function formatCurrencyInput(
  value: string | number | null | undefined,
  locale: string = "id-ID",
): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Parse a user-typed currency string back to a plain number. Strips any
 * locale formatting characters (spaces, separators, currency symbols) and
 * normalizes the decimal separator. Returns 0 for empty / invalid input so
 * callers can safely feed the result into Number() math.
 *
 * Examples (id-ID):
 *   "100.000"     -> 100000
 *   "1.500,5"     -> 1500.5
 *   "Rp 100.000"  -> 100000
 */
export function parseCurrencyInput(value: string | null | undefined): number {
  if (!value) return 0;
  // Strip everything except digits, the first decimal separator, and a sign.
  let s = String(value).trim().replace(/[^0-9.,-]/g, "");
  // Drop a trailing separator (user mid-typing: "100.")
  if (/[.,]$/.test(s)) s = s.slice(0, -1);
  if (!s || s === "-" || s === "." || s === ",") return 0;

  // Detect decimal separator: the last occurrence of . or , that has exactly
  // 1-2 digits after it is the decimal mark; any earlier ones are grouping.
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const lastSepIdx = Math.max(lastDot, lastComma);
  if (lastSepIdx === -1) return parseInt(s, 10) || 0;

  const after = s.length - lastSepIdx - 1;
  if (after <= 2) {
    // last separator is decimal
    const intPart = s.slice(0, lastSepIdx).replace(/[.,]/g, "");
    const decPart = s.slice(lastSepIdx + 1);
    const combined = `${intPart}.${decPart}`;
    return parseFloat(combined) || 0;
  }
  // Otherwise all separators are grouping — strip them all.
  return parseInt(s.replace(/[.,]/g, ""), 10) || 0;
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
