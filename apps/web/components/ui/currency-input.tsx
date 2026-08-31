import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

/**
 * A controlled input that formats currency values on the fly.
 * It displays the value with locale‑aware thousands separators while
 * exposing a plain numeric string to the parent via `onChange`.
 */
export function CurrencyInput({
  id,
  value,
  onChange,
  locale = "id-ID",
  placeholder = "0",
  className,
  ...rest
}: {
  id?: string;
  /** Raw numeric string (e.g. "100000") */
  value: string | number;
  /** Will receive the numeric string without formatting */
  onChange: (raw: string) => void;
  locale?: string;
  placeholder?: string;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
>) {
  const [display, setDisplay] = React.useState(() =>
    formatCurrencyInput(value, locale),
  );

  // Keep display in sync when parent updates value directly (e.g. reset form).
  React.useEffect(() => {
    setDisplay(formatCurrencyInput(value, locale));
  }, [value, locale]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const formatted = formatCurrencyInput(rawInput, locale);
    setDisplay(formatted);
    const parsed = parseCurrencyInput(rawInput);
    onChange(String(parsed));
  };

  const handleBlur = () => {
    // Ensure final formatting when leaving the field.
    setDisplay(formatCurrencyInput(value, locale));
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-card/80 px-3.5 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] sm:h-10 sm:text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:border-primary/60 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
        className,
      )}
      {...rest}
    />
  );
}
