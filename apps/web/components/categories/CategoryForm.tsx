"use client";

import { useState } from "react";
import {
  Briefcase,
  TrendingUp,
  Utensils,
  Car,
  Film,
  HeartPulse,
  ShoppingBag,
  Receipt,
  Tag,
  Coffee,
  Shirt,
  GraduationCap,
  Plane,
  Home,
  Phone,
  Wifi,
  Gift,
  Dumbbell,
  Book,
  Music,
  Gamepad2,
  Fuel,
  PiggyBank,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { Category, CategoryScope } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: "Briefcase", icon: Briefcase },
  { name: "TrendingUp", icon: TrendingUp },
  { name: "Utensils", icon: Utensils },
  { name: "Car", icon: Car },
  { name: "Film", icon: Film },
  { name: "HeartPulse", icon: HeartPulse },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Receipt", icon: Receipt },
  { name: "Tag", icon: Tag },
  { name: "Coffee", icon: Coffee },
  { name: "Shirt", icon: Shirt },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Plane", icon: Plane },
  { name: "Home", icon: Home },
  { name: "Phone", icon: Phone },
  { name: "Wifi", icon: Wifi },
  { name: "Gift", icon: Gift },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Book", icon: Book },
  { name: "Music", icon: Music },
  { name: "Gamepad2", icon: Gamepad2 },
  { name: "Fuel", icon: Fuel },
  { name: "PiggyBank", icon: PiggyBank },
  { name: "CreditCard", icon: CreditCard },
];

interface CategoryFormProps {
  initial?: Category;
  onSubmit: (values: { name: string; color: string; type: CategoryScope; icon: string }) => void;
  onCancel: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ initial, onSubmit, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [type, setType] = useState<CategoryScope>(initial?.type ?? "expense");
  const [icon, setIcon] = useState(initial?.icon ?? "Tag");
  const [error, setError] = useState<string | null>(null);

  const SelectedIcon = ICON_OPTIONS.find((o) => o.name === icon)?.icon ?? Tag;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    onSubmit({ name: trimmed, color, type, icon });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Cat treats"
          autoFocus
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-type">Applies to</Label>
        <Select
          id="cat-type"
          value={type}
          onChange={(e) => setType(e.target.value as CategoryScope)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="both">Both</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="grid grid-cols-8 gap-1.5">
          {ICON_OPTIONS.map(({ name: iconName, icon: IconComp }) => (
            <button
              key={iconName}
              type="button"
              onClick={() => setIcon(iconName)}
              aria-label={iconName}
              title={iconName}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                icon === iconName
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <IconComp className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Pick color ${c}`}
              className={cn(
                "h-10 w-10 rounded-full transition-all duration-200 flex items-center justify-center",
                "active:scale-90",
                color === c
                  ? "ring-2 ring-offset-2 ring-offset-card scale-110 shadow-md"
                  : "hover:scale-110",
              )}
              style={{
                backgroundColor: c,
                ...(color === c ? ({ "--tw-ring-color": c } as React.CSSProperties) : {}),
              }}
            >
              {color === c ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Preview
        </p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${color}24`, color }}
        >
          <SelectedIcon className="h-3 w-3" />
          {name || "Category name"}
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add category"}</Button>
      </div>
    </form>
  );
};
