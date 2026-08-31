"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
        onChange={(e) => setFilters({ type: e.target.value as TransactionType | "all" })}
      >
        <option value="all">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </Select>
      <Select
        className="lg:col-span-2"
        aria-label="Category"
        value={filters.categoryId ?? ""}
        onChange={(e) => setFilters({ categoryId: e.target.value || undefined })}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-2 lg:col-span-4">
        <Input
          aria-label="From date"
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
        />
        <Input
          aria-label="To date"
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
        />
      </div>
      <Input
        aria-label="Filter by tag"
        placeholder="Filter by tag..."
        value={filters.tag ?? ""}
        onChange={(e) => setFilters({ tag: e.target.value || undefined })}
        className="lg:col-span-12"
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
