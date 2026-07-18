import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { Budget } from '../budgets/budget.entity';
import { Debt } from '../debts/debt.entity';
import { WaNotifierService } from './wa-notifier.service';

/**
 * Proactive WhatsApp notifications (NOT-WA-01/02/04). All are opt-in per-user
 * (default off). Cron times are server-local; keep them spread out so a user
 * never receives more than one proactive message per day.
 */
@Injectable()
export class WaNotificationsService {
  private readonly logger = new Logger(WaNotificationsService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    private notifier: WaNotifierService,
  ) {}

  private fmt(n: number): string {
    return new Intl.NumberFormat('id-ID').format(n);
  }

  // ── NOT-WA-01: recap of last month, sent 08:00 on the 1st ───────────────────
  @Cron('0 8 1 * *')
  async sendMonthlyRecaps(now = new Date()): Promise<void> {
    const users = await this.userRepo.find({
      where: { notifyMonthlyRecap: true },
    });
    const recipients = users.filter(u => !!u.waPhone);
    if (!recipients.length) return;

    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const label = start.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    for (const user of recipients) {
      try {
        const txs = await this.txRepo.find({
          where: { userId: user.id, date: Between(startStr, endStr) },
          relations: { category: true },
        });
        if (!txs.length) continue;

        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

        const catTotals = new Map<string, number>();
        for (const t of txs.filter(t => t.type === 'expense')) {
          const name = t.category?.name ?? 'Lain-lain';
          catTotals.set(name, (catTotals.get(name) ?? 0) + Number(t.amount));
        }
        const top3 = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

        let msg = `📊 *Rekap Keuangan ${label}*\n\n`;
        msg += `📈 Pemasukan:  Rp${this.fmt(income)}\n`;
        msg += `📉 Pengeluaran: Rp${this.fmt(expense)}\n`;
        msg += `💵 Saldo bersih: Rp${this.fmt(income - expense)}\n`;
        if (top3.length) {
          msg += `\n🏆 Top pengeluaran:\n`;
          top3.forEach(([name, total], i) => {
            const pct = expense > 0 ? Math.round((total / expense) * 100) : 0;
            msg += `${i + 1}. ${name}: Rp${this.fmt(total)} (${pct}%)\n`;
          });
        }
        await this.notifier.sendText(user.waPhone!, msg);
      } catch (err) {
        this.logger.error(`Monthly recap failed for user ${user.id}`, err as Error);
      }
    }
  }

  // ── NOT-WA-02: over-budget digest, sent 20:00 daily ─────────────────────────
  @Cron('0 20 * * *')
  async sendOverBudgetAlerts(now = new Date()): Promise<void> {
    const users = (await this.userRepo.find({ where: { notifyOverBudget: true } })).filter(
      u => !!u.waPhone,
    );
    if (!users.length) return;

    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    for (const user of users) {
      try {
        const budgets = await this.budgetRepo.find({ where: { userId: user.id, month } });
        if (!budgets.length) continue;

        const txs = await this.txRepo.find({
          where: { userId: user.id, type: 'expense', date: Between(startStr, endStr) },
        });
        const cats = await this.catRepo.find({ where: { userId: user.id } });
        const catName = (id: string) => cats.find(c => c.id === id)?.name ?? 'Lainnya';

        const spentByCat = new Map<string, number>();
        for (const t of txs) {
          spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + Number(t.amount));
        }

        const over = budgets
          .map(b => ({ name: catName(b.categoryId), spent: spentByCat.get(b.categoryId) ?? 0, limit: Number(b.amount) }))
          .filter(b => b.limit > 0 && b.spent > b.limit);

        if (!over.length) continue;

        let msg = '🚨 *Peringatan Budget Terlampaui*\n\n';
        for (const b of over) {
          const pct = Math.round((b.spent / b.limit) * 100);
          msg += `🔴 ${b.name}: Rp${this.fmt(b.spent)} / Rp${this.fmt(b.limit)} (${pct}%)\n`;
        }
        msg += '\nCek dashboard untuk detail.';
        await this.notifier.sendText(user.waPhone!, msg);
      } catch (err) {
        this.logger.error(`Over-budget alert failed for user ${user.id}`, err as Error);
      }
    }
  }

  // ── NOT-WA-04: debt due reminder (H-1 and H), sent 09:00 daily ──────────────
  @Cron('0 9 * * *')
  async sendDebtDueReminders(now = new Date()): Promise<void> {
    const users = (await this.userRepo.find({ where: { notifyDebtDue: true } })).filter(
      u => !!u.waPhone,
    );
    if (!users.length) return;

    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const user of users) {
      try {
        const debts = (
          await this.debtRepo.find({ where: { userId: user.id } })
        ).filter(d => !d.settledAt && (d.dueDate === today || d.dueDate === tomorrow));
        if (!debts.length) continue;

        let msg = '⏰ *Pengingat Utang Piutang*\n\n';
        for (const d of debts) {
          const when = d.dueDate === today ? 'jatuh tempo *hari ini*' : 'jatuh tempo *besok*';
          if (d.direction === 'owed_to_me') {
            msg += `💰 ${d.counterpartyName} harus bayar Rp${this.fmt(Number(d.amount))} — ${when}\n`;
          } else {
            msg += `💸 Kamu harus bayar Rp${this.fmt(Number(d.amount))} ke ${d.counterpartyName} — ${when}\n`;
          }
        }
        await this.notifier.sendText(user.waPhone!, msg);
      } catch (err) {
        this.logger.error(`Debt reminder failed for user ${user.id}`, err as Error);
      }
    }
  }
}
