"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { Category, CategoryScope } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CategoryFormProps {
  initial?: Category;
  onSubmit: (values: { name: string; color: string; type: CategoryScope }) => void;
  onCancel: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ initial, onSubmit, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [type, setType] = useState<CategoryScope>(initial?.type ?? "expense");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    onSubmit({ name: trimmed, color, type });
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
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
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
