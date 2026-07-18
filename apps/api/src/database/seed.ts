import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';

const DEMO_EMAIL = process.env.SEED_EMAIL ?? 'demo@moneyflow.test';
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'demo1234';

// Mirrors DEFAULT_CATEGORIES in categories.service.ts, which seeds these
// per-user on first login. Kept in sync manually.
const DEFAULT_CATEGORIES = [
  { name: 'Gaji', color: '#22c55e', icon: 'Banknote', type: 'income' as const },
  { name: 'Investasi', color: '#3b82f6', icon: 'TrendingUp', type: 'both' as const },
  { name: 'Makanan', color: '#f97316', icon: 'UtensilsCrossed', type: 'expense' as const },
  { name: 'Transportasi', color: '#8b5cf6', icon: 'Car', type: 'expense' as const },
  { name: 'Hiburan', color: '#ec4899', icon: 'Gamepad2', type: 'expense' as const },
  { name: 'Kesehatan', color: '#ef4444', icon: 'Heart', type: 'expense' as const },
  { name: 'Belanja', color: '#f59e0b', icon: 'ShoppingBag', type: 'expense' as const },
  { name: 'Tagihan', color: '#6b7280', icon: 'Receipt', type: 'expense' as const },
  { name: 'Lainnya', color: '#14b8a6', icon: 'MoreHorizontal', type: 'both' as const },
];

const SAMPLE_TRANSACTIONS: Array<{
  category: string;
  type: 'income' | 'expense';
  amount: number;
  notes: string;
  daysAgo: number;
}> = [
  { category: 'Gaji', type: 'income', amount: 12000000, notes: 'Gaji bulanan', daysAgo: 28 },
  { category: 'Investasi', type: 'income', amount: 750000, notes: 'Dividen reksa dana', daysAgo: 21 },
  { category: 'Tagihan', type: 'expense', amount: 850000, notes: 'Listrik & air', daysAgo: 20 },
  { category: 'Makanan', type: 'expense', amount: 145000, notes: 'Belanja mingguan', daysAgo: 14 },
  { category: 'Transportasi', type: 'expense', amount: 60000, notes: 'Bensin', daysAgo: 10 },
  { category: 'Hiburan', type: 'expense', amount: 220000, notes: 'Bioskop', daysAgo: 7 },
  { category: 'Belanja', type: 'expense', amount: 480000, notes: 'Pakaian', daysAgo: 4 },
  { category: 'Makanan', type: 'expense', amount: 95000, notes: 'Makan siang', daysAgo: 1 },
];

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    await AppDataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const categoryRepo = manager.getRepository(Category);
      const transactionRepo = manager.getRepository(Transaction);

      // Idempotent: re-running the seed must not duplicate the demo data.
      const existing = await userRepo.findOne({ where: { email: DEMO_EMAIL } });
      if (existing) {
        console.log(`Seed skipped: ${DEMO_EMAIL} already exists.`);
        return;
      }

      const user = await userRepo.save(
        userRepo.create({
          email: DEMO_EMAIL,
          name: 'Demo User',
          password: await bcrypt.hash(DEMO_PASSWORD, 12),
        }),
      );

      const categories = await categoryRepo.save(
        DEFAULT_CATEGORIES.map((cat) =>
          categoryRepo.create({ ...cat, userId: user.id, isDefault: true }),
        ),
      );
      const byName = new Map(categories.map((c) => [c.name, c]));

      await transactionRepo.save(
        SAMPLE_TRANSACTIONS.map((t) =>
          transactionRepo.create({
            userId: user.id,
            categoryId: byName.get(t.category)!.id,
            type: t.type,
            amount: t.amount,
            notes: t.notes,
            date: isoDateDaysAgo(t.daysAgo),
            currency: 'IDR',
          }),
        ),
      );

      console.log(
        `Seeded ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}) with ` +
          `${categories.length} categories and ${SAMPLE_TRANSACTIONS.length} transactions.`,
      );
    });
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
