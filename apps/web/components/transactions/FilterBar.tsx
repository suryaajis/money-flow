"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import type { TransactionType } from "@/lib/types";

export const FilterBar: React.FC = () => {
  const { filters, setFilters, resetFilters } = useTransactions();
  const { categories } = useCategories();

  const hasActiveFilters =
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.categoryId ||
    (filters.type && filters.type !== "all") ||
    !!filters.searchQuery ||
    !!filters.tag;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
      <div className="relative lg:col-span-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search notes"
          placeholder="Search notes..."
          className="pl-9"
          value={filters.searchQuery ?? ""}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
        />
      </div>
      <Select
        className="lg:col-span-2"
        aria-label="Type"
        value={filters.type ?? "all"}
        onValueChange={(type) =>
          setFilters({ type: type as TransactionType | "all" })
        }
        options={[
          { value: "all", label: "All types" },
          { value: "income", label: "Income" },
          { value: "expense", label: "Expense" },
        ]}
      />
      <Select
        className="lg:col-span-2"
        aria-label="Category"
        value={filters.categoryId ?? ""}
        onValueChange={(categoryId) =>
          setFilters({ categoryId: categoryId || undefined })
        }
        options={[
          { value: "", label: "All categories" },
          ...categories.map((category) => ({
            value: category.id,
            label: category.name,
          })),
        ]}
      />
      <div className="grid grid-cols-2 gap-2 lg:col-span-4">
        <DatePicker
          aria-label="From date"
          value={filters.dateFrom ?? ""}
          onValueChange={(dateFrom) =>
            setFilters({ dateFrom: dateFrom || undefined })
          }
          max={filters.dateTo}
        />
        <DatePicker
          aria-label="To date"
          value={filters.dateTo ?? ""}
          onValueChange={(dateTo) =>
            setFilters({ dateTo: dateTo || undefined })
          }
          min={filters.dateFrom}
        />
      </div>
      <Input
        aria-label="Filter by tag"
        placeholder="Filter by tag..."
        value={filters.tag ?? ""}
        onChange={(e) => setFilters({ tag: e.target.value || undefined })}
        className="lg:col-span-10"
      />

      {hasActiveFilters ? (
        <div className="flex justify-end sm:col-span-2 lg:col-span-12">
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
};
