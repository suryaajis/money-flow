import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { Budget } from '../budgets/budget.entity';
import { RecurringTransaction } from '../recurring/recurring-transaction.entity';
import { Debt } from '../debts/debt.entity';
import { WalletMember } from '../shared-wallet/wallet-member.entity';
import { User } from '../users/user.entity';

export interface BackupV2 {
  version: 2;
  exportedAt: string;
  transactions: Partial<Transaction>[];
  categories: Partial<Category>[];
  budgets: Partial<Budget>[];
  recurrings: Partial<RecurringTransaction>[];
  debts: Partial<Debt>[];
  sharedWalletMembers: Partial<WalletMember>[];
  preferences: {
    notifyMonthlyRecap: boolean;
    notifyOverBudget: boolean;
    notifyDebtDue: boolean;
    notifyDailyInput: boolean;
    dailyInputTime: string;
  };
}

@Injectable()
export class BackupService {
  constructor(private readonly dataSource: DataSource) {}

  async export(userId: string): Promise<BackupV2> {
    const manager = this.dataSource.manager;
    const [
      transactions,
      categories,
      budgets,
      recurrings,
      debts,
      members,
      user,
    ] = await Promise.all([
      manager.find(Transaction, { where: { userId } }),
      manager.find(Category, { where: { userId } }),
      manager.find(Budget, { where: { userId } }),
      manager.find(RecurringTransaction, { where: { userId } }),
      manager.find(Debt, { where: { userId } }),
      manager.find(WalletMember, { where: { ownerUserId: userId } }),
      manager.findOne(User, { where: { id: userId } }),
    ]);

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      budgets,
      recurrings,
      debts,
      sharedWalletMembers: members.map((member) => ({
        ...member,
        inviteToken: null,
        inviteTokenHash: null,
      })),
      preferences: {
        notifyMonthlyRecap: user?.notifyMonthlyRecap ?? false,
        notifyOverBudget: user?.notifyOverBudget ?? false,
        notifyDebtDue: user?.notifyDebtDue ?? false,
        notifyDailyInput: user?.notifyDailyInput ?? false,
        dailyInputTime: user?.dailyInputTime ?? '20:00',
      },
    };
  }

  async import(
    userId: string,
    raw: unknown,
    mode: 'merge' | 'replace',
  ): Promise<{ imported: number }> {
    if (mode !== 'merge' && mode !== 'replace') {
      throw new BadRequestException('Mode import harus merge atau replace');
    }
    const data = this.validate(raw);
    return this.dataSource.transaction((manager) =>
      this.restore(manager, userId, data, mode),
    );
  }

  private validate(raw: unknown): BackupV2 {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('Backup harus berupa object JSON');
    }
    const value = raw as Record<string, unknown>;
    const arrays = [
      'transactions',
      'categories',
      'budgets',
      'recurrings',
      'debts',
      'sharedWalletMembers',
    ];
    if (
      value.version !== 2 ||
      arrays.some((key) => !Array.isArray(value[key]))
    ) {
      throw new BadRequestException('Format backup v2 tidak valid');
    }
    if (!value.preferences || typeof value.preferences !== 'object') {
      throw new BadRequestException('Preferences backup tidak valid');
    }
    for (const tx of value.transactions as Array<Record<string, unknown>>) {
      if (
        !tx ||
        !['income', 'expense'].includes(String(tx.type)) ||
        !Number.isFinite(Number(tx.amount)) ||
        Number(tx.amount) <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(tx.date))
      ) {
        throw new BadRequestException('Data transaksi backup tidak valid');
      }
    }
    return value as unknown as BackupV2;
  }

  private async restore(
    manager: EntityManager,
    userId: string,
    data: BackupV2,
    mode: 'merge' | 'replace',
  ): Promise<{ imported: number }> {
    if (mode === 'replace') {
      await manager.delete(Transaction, { userId });
      await manager.delete(Budget, { userId });
      await manager.delete(RecurringTransaction, { userId });
      await manager.delete(Debt, { userId });
      await manager.delete(WalletMember, { ownerUserId: userId });
      await manager
        .createQueryBuilder()
        .delete()
        .from(Category)
        .where('"userId" = :userId AND "isDefault" = false', { userId })
        .execute();
    }

    let imported = 0;
    const currentCategories = await manager.find(Category, {
      where: { userId },
    });
    const categoryMap = new Map<string, string>();
    for (const source of data.categories) {
      if (!source.id) continue;
      if (source.isDefault) {
        const match = currentCategories.find(
          (item) =>
            item.isDefault &&
            item.name === source.name &&
            item.type === source.type,
        );
        if (match) categoryMap.set(source.id, match.id);
        continue;
      }
      const exists = currentCategories.find((item) => item.id === source.id);
      if (exists) {
        categoryMap.set(source.id, exists.id);
        continue;
      }
      const row = this.withoutRelations(source);
      const saved = await manager.save(
        Category,
        manager.create(Category, {
          ...row,
          userId,
          isDefault: false,
        }),
      );
      categoryMap.set(source.id, saved.id);
      imported++;
    }

    imported += await this.insertMissing(
      manager,
      Transaction,
      data.transactions,
      userId,
      (row) => ({
        ...row,
        categoryId: row.categoryId
          ? (categoryMap.get(String(row.categoryId)) ?? null)
          : null,
      }),
    );
    imported += await this.insertMissing(
      manager,
      Budget,
      data.budgets,
      userId,
      (row) => ({
        ...row,
        categoryId: categoryMap.get(String(row.categoryId)),
      }),
    );
    imported += await this.insertMissing(
      manager,
      RecurringTransaction,
      data.recurrings,
      userId,
      (row) => ({
        ...row,
        categoryId: row.categoryId
          ? categoryMap.get(String(row.categoryId))
          : undefined,
      }),
    );
    imported += await this.insertMissing(manager, Debt, data.debts, userId);

    for (const source of data.sharedWalletMembers) {
      if (!source.memberWaPhone && !source.memberEmail) continue;
      const member = source.memberWaPhone
        ? await manager.findOne(User, {
            where: { waPhone: source.memberWaPhone },
          })
        : await manager.findOne(User, {
            where: { email: source.memberEmail! },
          });
      const duplicate = source.memberWaPhone
        ? await manager.findOne(WalletMember, {
            where: { ownerUserId: userId, memberWaPhone: source.memberWaPhone },
          })
        : await manager.findOne(WalletMember, {
            where: { ownerUserId: userId, memberEmail: source.memberEmail! },
          });
      if (duplicate) continue;
      await manager.save(
        WalletMember,
        manager.create(WalletMember, {
          ownerUserId: userId,
          memberUserId: member?.id ?? null,
          memberEmail: source.memberEmail ?? member?.email ?? null,
          memberWaPhone: source.memberWaPhone ?? member?.waPhone ?? null,
          inviteToken: null,
          inviteTokenHash: null,
          inviteExpiresAt: null,
          acceptedAt:
            member && source.acceptedAt ? new Date(source.acceptedAt) : null,
        }),
      );
      imported++;
    }

    await manager.update(User, userId, {
      notifyMonthlyRecap: !!data.preferences.notifyMonthlyRecap,
      notifyOverBudget: !!data.preferences.notifyOverBudget,
      notifyDebtDue: !!data.preferences.notifyDebtDue,
      notifyDailyInput: !!data.preferences.notifyDailyInput,
      dailyInputTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(
        data.preferences.dailyInputTime,
      )
        ? data.preferences.dailyInputTime
        : '20:00',
    });
    return { imported };
  }

  private async insertMissing<T extends ObjectLiteral & { id: string }>(
    manager: EntityManager,
    entity: EntityTarget<T>,
    rows: Partial<T>[],
    userId: string,
    map: (row: Partial<T>) => Partial<T> = (row) => row,
  ): Promise<number> {
    let count = 0;
    for (const source of rows) {
      if (
        source.id &&
        (await manager.findOne(entity, { where: { id: source.id } as never }))
      ) {
        continue;
      }
      const row = this.withoutRelations(map(source));
      await manager.save(
        entity,
        manager.create(entity, { ...row, userId } as never),
      );
      count++;
    }
    return count;
  }

  private withoutRelations(
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const row = { ...source };
    for (const key of ['user', 'category', 'owner', 'member', 'transactions'])
      delete row[key];
    return row;
  }
}
