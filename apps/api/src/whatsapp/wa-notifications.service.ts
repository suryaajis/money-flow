import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { Budget } from '../budgets/budget.entity';
import { Debt } from '../debts/debt.entity';
import { WaProactiveNotificationService } from './wa-proactive-notification.service';
import { WA_TEMPLATE_DEFAULT_NAMES } from './wa-template-definitions';

@Injectable()
export class WaNotificationsService {
  private readonly logger = new Logger(WaNotificationsService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    private proactive: WaProactiveNotificationService,
    private config: ConfigService,
  ) {}

  private fmt(n: number): string {
    return new Intl.NumberFormat('id-ID').format(n);
  }

  @Cron('* * * * *', { timeZone: 'Asia/Jakarta' })
  async sendDailyInputReminders(now = new Date()): Promise<void> {
    const time = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const users = (
      await this.userRepo.find({ where: { notifyDailyInput: true } })
    ).filter((user) => !!user.waPhone && user.dailyInputTime === time);
    for (const user of users) {
      try {
        const count = await this.txRepo.count({
          where: { userId: user.id, date: today },
        });
        if (count > 0) continue;
        await this.proactive.sendOncePerDay(
          {
            userId: user.id,
            to: user.waPhone!,
            kind: 'daily_input',
            templateName: this.config.get<string>(
              'WA_TEMPLATE_DAILY_INPUT',
              WA_TEMPLATE_DEFAULT_NAMES.dailyInput,
            ),
            bodyParameters: [],
          },
          now,
        );
      } catch (error) {
        this.logger.error(
          `Daily input reminder failed for user ${user.id}`,
          error as Error,
        );
      }
    }
  }

  @Cron('0 8 1 * *', { timeZone: 'Asia/Jakarta' })
  async sendMonthlyRecaps(now = new Date()): Promise<void> {
    const users = (
      await this.userRepo.find({ where: { notifyMonthlyRecap: true } })
    ).filter((user) => !!user.waPhone);
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const label = start.toLocaleString('id-ID', {
      month: 'long',
      year: 'numeric',
    });

    for (const user of users) {
      try {
        const txs = await this.txRepo.find({
          where: { userId: user.id, date: Between(startStr, endStr) },
          relations: { category: true },
        });
        if (!txs.length) continue;

        const income = txs
          .filter((tx) => tx.type === 'income')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const expense = txs
          .filter((tx) => tx.type === 'expense')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const categoryTotals = new Map<string, number>();
        for (const tx of txs.filter((item) => item.type === 'expense')) {
          const name = tx.category?.name ?? 'Lain-lain';
          categoryTotals.set(
            name,
            (categoryTotals.get(name) ?? 0) + Number(tx.amount),
          );
        }
        const topSummary =
          [...categoryTotals.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, total], index) => {
              const percentage =
                expense > 0 ? Math.round((total / expense) * 100) : 0;
              return `${index + 1}. ${name}: Rp${this.fmt(total)} (${percentage}%)`;
            })
            .join('\n') || '-';

        await this.proactive.sendOncePerDay(
          {
            userId: user.id,
            to: user.waPhone!,
            kind: 'monthly_recap',
            templateName: this.config.get<string>(
              'WA_TEMPLATE_MONTHLY_RECAP',
              WA_TEMPLATE_DEFAULT_NAMES.monthlyRecap,
            ),
            bodyParameters: [
              label,
              this.fmt(income),
              this.fmt(expense),
              this.fmt(income - expense),
              topSummary,
            ],
          },
          now,
        );
      } catch (error) {
        this.logger.error(
          `Monthly recap failed for user ${user.id}`,
          error as Error,
        );
      }
    }
  }

  @Cron('0 20 * * *', { timeZone: 'Asia/Jakarta' })
  async sendOverBudgetAlerts(now = new Date()): Promise<void> {
    const users = (
      await this.userRepo.find({ where: { notifyOverBudget: true } })
    ).filter((user) => !!user.waPhone);
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startStr = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    for (const user of users) {
      try {
        const budgets = await this.budgetRepo.find({
          where: { userId: user.id, month },
        });
        if (!budgets.length) continue;
        const [transactions, categories] = await Promise.all([
          this.txRepo.find({
            where: {
              userId: user.id,
              type: 'expense',
              date: Between(startStr, endStr),
            },
          }),
          this.catRepo.find({ where: { userId: user.id } }),
        ]);
        const spentByCategory = new Map<string, number>();
        for (const tx of transactions) {
          if (!tx.categoryId) continue;
          spentByCategory.set(
            tx.categoryId,
            (spentByCategory.get(tx.categoryId) ?? 0) + Number(tx.amount),
          );
        }
        const categoryName = (id: string) =>
          categories.find((category) => category.id === id)?.name ?? 'Lainnya';
        const overBudget = budgets
          .map((budget) => ({
            name: categoryName(budget.categoryId),
            spent: spentByCategory.get(budget.categoryId) ?? 0,
            limit: Number(budget.amount),
          }))
          .filter((item) => item.limit > 0 && item.spent > item.limit);
        if (!overBudget.length) continue;

        const details = overBudget
          .map((item) => {
            const percentage = Math.round((item.spent / item.limit) * 100);
            return `${item.name}: Rp${this.fmt(item.spent)} / Rp${this.fmt(item.limit)} (${percentage}%)`;
          })
          .join('\n');

        await this.proactive.sendOncePerDay(
          {
            userId: user.id,
            to: user.waPhone!,
            kind: 'over_budget',
            templateName: this.config.get<string>(
              'WA_TEMPLATE_OVER_BUDGET',
              WA_TEMPLATE_DEFAULT_NAMES.overBudget,
            ),
            bodyParameters: [details],
          },
          now,
        );
      } catch (error) {
        this.logger.error(
          `Over-budget alert failed for user ${user.id}`,
          error as Error,
        );
      }
    }
  }

  @Cron('0 9 * * *', { timeZone: 'Asia/Jakarta' })
  async sendDebtDueReminders(now = new Date()): Promise<void> {
    const users = (
      await this.userRepo.find({ where: { notifyDebtDue: true } })
    ).filter((user) => !!user.waPhone);
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86_400_000)
      .toISOString()
      .split('T')[0];

    for (const user of users) {
      try {
        const debts = (
          await this.debtRepo.find({ where: { userId: user.id } })
        ).filter(
          (debt) =>
            !debt.settledAt &&
            (debt.dueDate === today || debt.dueDate === tomorrow),
        );
        if (!debts.length) continue;
        const details = debts
          .map((debt) => {
            const when =
              debt.dueDate === today
                ? 'jatuh tempo hari ini'
                : 'jatuh tempo besok';
            return debt.direction === 'owed_to_me'
              ? `${debt.counterpartyName} harus bayar Rp${this.fmt(Number(debt.amount))} — ${when}`
              : `Kamu harus bayar Rp${this.fmt(Number(debt.amount))} ke ${debt.counterpartyName} — ${when}`;
          })
          .join('\n');

        await this.proactive.sendOncePerDay(
          {
            userId: user.id,
            to: user.waPhone!,
            kind: 'debt_due',
            templateName: this.config.get<string>(
              'WA_TEMPLATE_DEBT_DUE',
              WA_TEMPLATE_DEFAULT_NAMES.debtDue,
            ),
            bodyParameters: [details],
          },
          now,
        );
      } catch (error) {
        this.logger.error(
          `Debt reminder failed for user ${user.id}`,
          error as Error,
        );
      }
    }
  }
}
