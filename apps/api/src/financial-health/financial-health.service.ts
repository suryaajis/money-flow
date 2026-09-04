import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Budget } from '../budgets/budget.entity';
import { Debt } from '../debts/debt.entity';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import {
  FinancialHealthSnapshot,
  HealthComponent,
} from './financial-health-snapshot.entity';

const FORMULA_VERSION = 'v1.0';
const clamp = (value: number) => Math.max(0, Math.min(100, value));

@Injectable()
export class FinancialHealthService {
  constructor(
    @InjectRepository(FinancialHealthSnapshot)
    private readonly snapshotRepo: Repository<FinancialHealthSnapshot>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Budget) private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Debt) private readonly debtRepo: Repository<Debt>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async calculate(userId: string, period?: string) {
    const month = period ?? new Date().toISOString().slice(0, 7);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.healthScoreEnabled) return { enabled: false, period: month };
    const snapshot = await this.calculatePeriod(userId, month);
    const previousDate = new Date(`${month}-01T00:00:00Z`);
    previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);
    const previousPeriod = previousDate.toISOString().slice(0, 7);
    const previous = await this.calculatePeriod(userId, previousPeriod);

    return {
      enabled: true,
      ...snapshot,
      comparison: {
        period: previousPeriod,
        score: previous.score,
        change:
          snapshot.score !== null && previous.score !== null
            ? snapshot.score - previous.score
            : null,
      },
      recommendations: this.buildRecommendations(snapshot.components),
    };
  }

  private async calculatePeriod(userId: string, month: string) {
    const start = `${month}-01`;
    const endDate = new Date(`${start}T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);
    const [transactions, budgets, debts] = await Promise.all([
      this.txRepo
        .createQueryBuilder('tx')
        .where('tx.userId = :userId', { userId })
        .andWhere('tx.date >= :start AND tx.date < :end', { start, end })
        .andWhere('tx.transferId IS NULL')
        .getMany(),
      this.budgetRepo.find({ where: { userId, month } }),
      this.debtRepo.find({
        where: { userId, direction: 'i_owe', settledAt: IsNull() },
      }),
    ]);
    const income = transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const expense = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const savingsRate = income > 0 ? (income - expense) / income : 0;
    const budgetTotal = budgets.reduce(
      (sum, budget) => sum + Number(budget.amount),
      0,
    );
    const debtTotal = debts.reduce((sum, debt) => sum + Number(debt.amount), 0);
    const categorized = transactions.filter((tx) => tx.categoryId).length;

    const components: Record<string, HealthComponent> = {
      savingsRate: {
        score: income > 0 ? Math.round(clamp((savingsRate / 0.2) * 100)) : null,
        weight: 30,
        value: savingsRate,
        reason:
          income > 0
            ? `Savings rate ${(savingsRate * 100).toFixed(1)}%; target formula 20%.`
            : 'Belum ada data pemasukan pada periode ini.',
      },
      budgetAdherence: {
        score:
          budgetTotal > 0
            ? Math.round(
                clamp(
                  (1 - Math.max(0, expense - budgetTotal) / budgetTotal) * 100,
                ),
              )
            : null,
        weight: 25,
        value: budgetTotal > 0 ? expense / budgetTotal : undefined,
        reason:
          budgetTotal > 0
            ? `Pengeluaran ${((expense / budgetTotal) * 100).toFixed(1)}% dari total budget.`
            : 'Budget belum dibuat untuk periode ini.',
      },
      cashflowStability: {
        score:
          transactions.length >= 5
            ? Math.round(clamp(50 + savingsRate * 100))
            : null,
        weight: 20,
        reason:
          transactions.length >= 5
            ? `Net cashflow periode ini ${income - expense >= 0 ? 'positif' : 'negatif'}.`
            : 'Minimal lima transaksi diperlukan untuk sinyal cashflow awal.',
      },
      debtPressure: {
        score:
          income > 0
            ? Math.round(clamp((1 - debtTotal / Math.max(income * 3, 1)) * 100))
            : debtTotal === 0
              ? 100
              : null,
        weight: 15,
        value: debtTotal,
        reason: `Total hutang aktif ${debtTotal.toLocaleString('id-ID')}.`,
      },
      dataCompleteness: {
        score: transactions.length
          ? Math.round((categorized / transactions.length) * 100)
          : null,
        weight: 10,
        value: transactions.length
          ? categorized / transactions.length
          : undefined,
        reason: transactions.length
          ? `${categorized} dari ${transactions.length} transaksi memiliki kategori.`
          : 'Belum ada transaksi pada periode ini.',
      },
    };
    const available = Object.values(components).filter(
      (component) => component.score !== null,
    );
    const weight = available.reduce(
      (sum, component) => sum + component.weight,
      0,
    );
    const reasons: string[] = [];
    if (transactions.length < 5)
      reasons.push('Transaksi belum mencapai minimum lima.');
    if (income <= 0) reasons.push('Belum ada pemasukan yang dapat dianalisis.');
    const sufficient = transactions.length >= 5 && income > 0 && weight >= 60;
    const score = sufficient
      ? Math.round(
          available.reduce(
            (sum, component) => sum + component.score! * component.weight,
            0,
          ) / weight,
        )
      : null;
    const dataQuality = {
      sufficient,
      transactionCount: transactions.length,
      reasons,
    };
    const existing = await this.snapshotRepo.findOne({
      where: { userId, period: month, formulaVersion: FORMULA_VERSION },
    });
    const snapshot = await this.snapshotRepo.save(
      this.snapshotRepo.create({
        ...(existing ? { id: existing.id } : {}),
        userId,
        period: month,
        score,
        components,
        formulaVersion: FORMULA_VERSION,
        dataQuality,
      }),
    );
    return snapshot;
  }

  private buildRecommendations(
    components: Record<string, HealthComponent>,
  ): string[] {
    const copy: Record<string, string> = {
      savingsRate:
        'Tinjau pengeluaran terbesar dan tentukan nominal tabungan yang realistis untuk periode berikutnya.',
      budgetAdherence:
        'Buat atau sesuaikan budget agar batas pengeluaran mencerminkan kebutuhan aktualmu.',
      cashflowStability:
        'Catat pemasukan dan pengeluaran secara rutin agar pola arus kas lebih mudah terlihat.',
      debtPressure:
        'Susun target pembayaran hutang aktif berdasarkan jatuh tempo dan kemampuan cashflow.',
      dataCompleteness:
        'Lengkapi kategori transaksi agar analisis dan rekomendasi menjadi lebih akurat.',
    };

    return Object.entries(components)
      .map(([key, component]) => ({
        key,
        score: component.score ?? -1,
        recommendation: copy[key],
      }))
      .filter((item) => item.recommendation)
      .sort((left, right) => left.score - right.score)
      .slice(0, 3)
      .map((item) => item.recommendation);
  }

  async setEnabled(userId: string, enabled: boolean) {
    await this.userRepo.update({ id: userId }, { healthScoreEnabled: enabled });
    return { enabled };
  }
}
