"use client";

import { CURRENCIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export const CurrencyToggle: React.FC = () => {
  const config = CURRENCIES.IDR;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled
      aria-label="Currency: IDR only."
      className="min-w-[64px] font-medium text-xs opacity-80 cursor-not-allowed"
    >
      {config.symbol} IDR
    </Button>
  );
};
