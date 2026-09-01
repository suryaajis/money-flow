"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import type { Theme } from "@/lib/types";
import { v14EnhancementsEnabled } from "@/lib/featureFlags";

const order: Theme[] = ["light", "dark", "system"];
const labelFor: Record<Theme, string> = {
  light: "Terang",
  dark: "Gelap",
  system: "Sistem",
};

export const ThemeToggle: React.FC = () => {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  const changeTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const apply = () => setTheme(next);
    if (
      !v14EnhancementsEnabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("startViewTransition" in document)
    ) {
      apply();
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty("--theme-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-y", `${y}px`);
    (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(apply);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Theme: ${labelFor[theme]}. Click to switch to ${labelFor[next]}.`}
      title={`Theme: ${labelFor[theme]}`}
      onClick={changeTheme}
      className="group relative overflow-hidden"
    >
      <Icon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
    </Button>
  );
};
