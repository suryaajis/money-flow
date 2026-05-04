"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import type { Theme } from "@/lib/types";

const order: Theme[] = ["light", "dark", "system"];
const labelFor: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

export const ThemeToggle: React.FC = () => {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Theme: ${labelFor[theme]}. Click to switch to ${labelFor[next]}.`}
      title={`Theme: ${labelFor[theme]}`}
      onClick={() => setTheme(next)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
};
