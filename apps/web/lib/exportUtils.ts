import * as XLSX from "xlsx";
import type { Category, Transaction } from "@/lib/types";
import { todayISO } from "@/lib/utils";

interface ExportRow {
  Date: string;
  Type: string;
  Category: string;
  Amount: number;
  Notes: string;
}

function buildRows(transactions: Transaction[], categoriesById: Map<string, Category>): ExportRow[] {
  return transactions.map((tx) => ({
    Date: tx.date,
    Type: tx.type === "income" ? "Income" : "Expense",
    Category: tx.categoryId
      ? (categoriesById.get(tx.categoryId)?.name ?? "Unknown")
      : "Unknown",
    Amount: tx.type === "expense" ? -tx.amount : tx.amount,
    Notes: tx.notes ?? "",
  }));
}

function summary(transactions: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  return { income, expense, balance: income - expense, count: transactions.length };
}

/** Trigger an .xlsx download of the supplied transactions. */
export function exportTransactionsToXLSX(
  transactions: Transaction[],
  categoriesById: Map<string, Category>,
): void {
  const rows = buildRows(transactions, categoriesById);
  const totals = summary(transactions);

  const aoa: (string | number)[][] = [
    ["Date", "Type", "Category", "Amount", "Notes"],
    ...rows.map((r) => [r.Date, r.Type, r.Category, r.Amount, r.Notes]),
    [],
    ["", "", "Total Income", totals.income, ""],
    ["", "", "Total Expense", totals.expense, ""],
    ["", "", "Net Balance", totals.balance, ""],
    ["", "", "Transactions", totals.count, ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  XLSX.writeFile(wb, `money-flow-transactions-${todayISO()}.xlsx`);
}

/** Trigger a CSV download of the supplied transactions. */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  categoriesById: Map<string, Category>,
): void {
  const rows = buildRows(transactions, categoriesById);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `money-flow-transactions-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
