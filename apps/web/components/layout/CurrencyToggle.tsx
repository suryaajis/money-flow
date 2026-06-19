"use client";

import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";

export const CurrencyToggle: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const next = currency === "IDR" ? "USD" : "IDR";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrency(next)}
      aria-label={`Mata uang: ${currency}. Klik untuk ganti ke ${next}.`}
      className="min-w-[56px] font-medium text-xs"
    >
      {currency === "IDR" ? "Rp IDR" : "$ USD"}
    </Button>
  );
};
