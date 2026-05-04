"use client";

import { useState } from "react";
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
          placeholder="e.g. Groceries"
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
                "h-8 w-8 rounded-full border-2 transition-transform",
                color === c
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground mb-1.5">Preview</p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${color}1F`, color }}
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
