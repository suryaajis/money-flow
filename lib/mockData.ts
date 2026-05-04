import type { Transaction } from "@/lib/types";
import { uid } from "@/lib/utils";

// Seed dataset with IDR-realistic amounts demonstrating trends across 6 months.
export function generateSampleTransactions(reference: Date = new Date()): Transaction[] {
  const out: Transaction[] = [];
  const now = new Date().toISOString();

  const push = (
    daysAgo: number,
    type: Transaction["type"],
    categoryId: string,
    amount: number,
    notes?: string,
  ) => {
    const d = new Date(reference);
    d.setDate(d.getDate() - daysAgo);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      id: uid("tx"),
      amount,
      type,
      categoryId,
      date: iso,
      notes,
      createdAt: now,
      updatedAt: now,
    });
  };

  // Recurring monthly salary across the last 6 months (IDR scale)
  for (let i = 0; i < 6; i++) {
    push(i * 30 + 2, "income", "cat-salary", 6500000, i === 0 ? "Gaji bulanan" : undefined);
  }

  // Investment income
  push(45, "income", "cat-investment", 350000, "Dividen saham");
  push(12, "income", "cat-investment", 200000, "Distribusi reksa dana");

  // Food
  push(0,  "expense", "cat-food", 25000,  "Makan siang");
  push(1,  "expense", "cat-food", 150000, "Belanja bulanan");
  push(3,  "expense", "cat-food", 35000,  "Kopi + kue");
  push(5,  "expense", "cat-food", 300000, "Makan malam bersama");
  push(9,  "expense", "cat-food", 120000, "Belanja mingguan");
  push(15, "expense", "cat-food", 18000,  "Snack");
  push(22, "expense", "cat-food", 175000, "Belanja mingguan");

  // Transport
  push(2,  "expense", "cat-transport", 150000, "Bensin");
  push(8,  "expense", "cat-transport", 75000,  "Ojek online");
  push(20, "expense", "cat-transport", 400000, "Kartu MRT bulanan");
  push(40, "expense", "cat-transport", 150000, "Bensin");

  // Bills (monthly)
  for (let i = 0; i < 6; i++) {
    push(i * 30 + 5,  "expense", "cat-bills", 350000,  "Internet");
    push(i * 30 + 7,  "expense", "cat-bills", 450000,  "Listrik");
    push(i * 30 + 10, "expense", "cat-bills", 3500000, "Sewa kos");
  }

  // Entertainment
  push(4,  "expense", "cat-entertainment", 65000,  "Streaming");
  push(11, "expense", "cat-entertainment", 500000, "Tiket konser");
  push(35, "expense", "cat-entertainment", 150000, "Bioskop");

  // Shopping
  push(6,  "expense", "cat-shopping", 800000,  "Baju");
  push(28, "expense", "cat-shopping", 450000,  "Perlengkapan rumah");
  push(55, "expense", "cat-shopping", 2500000, "Elektronik");

  // Health
  push(14, "expense", "cat-health", 200000, "Apotek");
  push(70, "expense", "cat-health", 750000, "Periksa gigi");

  return out;
}
