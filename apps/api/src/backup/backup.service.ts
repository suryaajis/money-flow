import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  IsNull,
  In,
} from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { Budget } from '../budgets/budget.entity';
import { RecurringTransaction } from '../recurring/recurring-transaction.entity';
import { Debt } from '../debts/debt.entity';
import { WalletMember } from '../shared-wallet/wallet-member.entity';
import { User } from '../users/user.entity';
import { WaPhoneLink } from '../whatsapp/wa-phone-link.entity';
import { Account } from '../accounts/account.entity';
import { AccountShare } from '../accounts/account-share.entity';
import { Transfer } from '../transfers/transfer.entity';
import { SmartRule } from '../smart-rules/smart-rule.entity';

export interface BackupData {
  version: 2 | 3 | 4;
  exportedAt: string;
  transactions: Partial<Transaction>[];
  categories: Partial<Category>[];
  budgets: Partial<Budget>[];
  recurrings: Partial<RecurringTransaction>[];
  debts: Partial<Debt>[];
  sharedWalletMembers: Partial<WalletMember>[];
  accounts?: Partial<Account>[];
  accountShares?: Partial<AccountShare>[];
  transfers?: Partial<Transfer>[];
  smartRules?: Partial<SmartRule>[];
  whatsappNumbers?: Array<{
    phoneMasked: string;
    label: string;
    isPrimary: boolean;
    notificationsEnabled: boolean;
    linkedAt: string;
    lastInboundAt: string | null;
  }>;
  preferences: {
    notifyMonthlyRecap: boolean;
    notifyOverBudget: boolean;
    notifyDebtDue: boolean;
    notifyDailyInput: boolean;
    dailyInputTime: string;
    healthScoreEnabled?: boolean;
  };
}

@Injectable()
export class BackupService {
  constructor(private readonly dataSource: DataSource) {}

  async export(userId: string): Promise<BackupData> {
    const manager = this.dataSource.manager;
    const [
      transactions,
      categories,
      budgets,
      recurrings,
      debts,
      members,
      phoneLinks,
      user,
      accounts,
    ] = await Promise.all([
      manager.find(Transaction, { where: { userId } }),
      manager.find(Category, { where: { userId } }),
      manager.find(Budget, { where: { userId } }),
      manager.find(RecurringTransaction, { where: { userId } }),
      manager.find(Debt, { where: { userId } }),
      manager.find(WalletMember, { where: { ownerUserId: userId } }),
      manager.find(WaPhoneLink, {
        where: { userId, revokedAt: IsNull() },
        order: { isPrimary: 'DESC', linkedAt: 'ASC' },
      }),
      manager.findOne(User, { where: { id: userId } }),
      manager.find(Account, { where: { ownerUserId: userId } }),
    ]);

    const accountIds = accounts.map((account) => account.id);
    const [accountShares, transfers, smartRules] = await Promise.all([
      accountIds.length
        ? manager.find(AccountShare, { where: { accountId: In(accountIds) } })
        : Promise.resolve([]),
      manager.find(Transfer, { where: { userId } }),
      manager.find(SmartRule, { where: { userId } }),
    ]);

    return {
      version: 4,
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
      accounts,
      accountShares: accountShares.map((share) => ({
        ...share,
        inviteTokenHash: null,
      })),
      transfers,
      smartRules,
      whatsappNumbers: phoneLinks.map((link) => ({
        phoneMasked: this.maskPhone(link.phone),
        label: link.label,
        isPrimary: link.isPrimary,
        notificationsEnabled: link.notificationsEnabled,
        linkedAt: link.linkedAt.toISOString(),
        lastInboundAt: link.lastInboundAt?.toISOString() ?? null,
      })),
      preferences: {
        notifyMonthlyRecap: user?.notifyMonthlyRecap ?? false,
        notifyOverBudget: user?.notifyOverBudget ?? false,
        notifyDebtDue: user?.notifyDebtDue ?? false,
        notifyDailyInput: user?.notifyDailyInput ?? false,
        dailyInputTime: user?.dailyInputTime ?? '20:00',
        healthScoreEnabled: user?.healthScoreEnabled ?? true,
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

  private validate(raw: unknown): BackupData {
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
      ![2, 3, 4].includes(Number(value.version)) ||
      arrays.some((key) => !Array.isArray(value[key]))
    ) {
      throw new BadRequestException('Format backup tidak valid');
    }
    if (value.version === 3 && !Array.isArray(value.whatsappNumbers)) {
      throw new BadRequestException('Metadata WhatsApp backup tidak valid');
    }
    if (
      value.version === 4 &&
      ['accounts', 'accountShares', 'transfers', 'smartRules'].some(
        (key) => !Array.isArray(value[key]),
      )
    ) {
      throw new BadRequestException('Data account backup v4 tidak valid');
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
    return value as unknown as BackupData;
  }

  private async restore(
    manager: EntityManager,
    userId: string,
    data: BackupData,
    mode: 'merge' | 'replace',
  ): Promise<{ imported: number }> {
    if (mode === 'replace') {
      await manager.delete(AccountShare, {
        accountId: In(
          (await manager.find(Account, { where: { ownerUserId: userId } })).map(
            (account) => account.id,
          ),
        ),
      });
      await manager.delete(Transfer, { userId });
      await manager.delete(SmartRule, { userId });
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

    const currentAccounts = await manager.find(Account, {
      where: { ownerUserId: userId },
    });
    let defaultAccount = currentAccounts.find((account) => account.isDefault);
    if (!defaultAccount) {
      defaultAccount = await manager.save(
        Account,
        manager.create(Account, {
          ownerUserId: userId,
          name: 'Dompet Utama',
          type: 'cash',
          currency: 'IDR',
          openingBalance: 0,
          color: '#84cc16',
          icon: 'Wallet',
          isDefault: true,
          sortOrder: 0,
          archivedAt: null,
        }),
      );
    }
    const accountMap = new Map<string, string>();
    for (const source of data.accounts ?? []) {
      if (!source.id) continue;
      if (source.isDefault) {
        accountMap.set(source.id, defaultAccount.id);
        continue;
      }
      const existing = currentAccounts.find(
        (account) => account.id === source.id || account.name === source.name,
      );
      if (existing) {
        accountMap.set(source.id, existing.id);
        continue;
      }
      const row = this.withoutRelations(source);
      const saved = await manager.save(
        Account,
        manager.create(Account, {
          ...row,
          id: undefined,
          ownerUserId: userId,
          isDefault: false,
        }),
      );
      accountMap.set(source.id, saved.id);
      imported++;
    }

    imported += await this.insertMissing(
      manager,
      Transfer,
      data.transfers ?? [],
      userId,
      (row) => ({
        ...row,
        sourceAccountId:
          accountMap.get(String(row.sourceAccountId)) ?? defaultAccount.id,
        destinationAccountId:
          accountMap.get(String(row.destinationAccountId)) ?? defaultAccount.id,
      }),
    );

    imported += await this.insertMissing(
      manager,
      Transaction,
      data.transactions,
      userId,
      (row) => ({
        ...row,
        recordedByWaPhoneId: null,
        recordedByUserId: userId,
        accountId: accountMap.get(String(row.accountId)) ?? defaultAccount.id,
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
        accountId: accountMap.get(String(row.accountId)) ?? defaultAccount.id,
      }),
    );
    imported += await this.insertMissing(manager, Debt, data.debts, userId);

    for (const source of data.accountShares ?? []) {
      const accountId = accountMap.get(String(source.accountId));
      if (!accountId || !source.invitedEmail) continue;
      const member = await manager.findOne(User, {
        where: { email: source.invitedEmail.toLowerCase() },
      });
      if (!member || member.id === userId) continue;
      const duplicate = await manager.findOne(AccountShare, {
        where: { accountId, memberUserId: member.id },
      });
      if (duplicate) continue;
      await manager.save(
        AccountShare,
        manager.create(AccountShare, {
          accountId,
          memberUserId: member.id,
          invitedEmail: member.email,
          role: source.role ?? 'viewer',
          status: source.status === 'accepted' ? 'accepted' : 'revoked',
          inviteTokenHash: null,
          inviteExpiresAt: null,
          acceptedAt: source.acceptedAt ?? null,
          revokedAt: source.status === 'accepted' ? null : new Date(),
        }),
      );
      imported++;
    }

    for (const source of data.smartRules ?? []) {
      if (
        source.id &&
        (await manager.findOne(SmartRule, { where: { id: source.id } }))
      )
        continue;
      const conditions = { ...(source.conditions ?? {}) };
      const actions = { ...(source.actions ?? {}) };
      if (conditions.accountId)
        conditions.accountId = accountMap.get(String(conditions.accountId));
      await manager.save(
        SmartRule,
        manager.create(SmartRule, {
          ...this.withoutRelations(source),
          id: undefined,
          userId,
          conditions,
          actions,
        }),
      );
      imported++;
    }

    for (const source of data.sharedWalletMembers) {
      if (!source.memberWaPhone && !source.memberEmail) continue;
      const memberLink = source.memberWaPhone
        ? await manager.findOne(WaPhoneLink, {
            where: {
              phone: source.memberWaPhone,
              revokedAt: IsNull(),
            },
            relations: { user: true },
          })
        : null;
      const member = memberLink?.user
        ? memberLink.user
        : source.memberEmail
          ? await manager.findOne(User, {
              where: { email: source.memberEmail },
            })
          : null;
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
      healthScoreEnabled: data.preferences.healthScoreEnabled !== false,
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

  private maskPhone(phone: string): string {
    if (phone.length <= 6) return `+${phone}`;
    return `+${phone.slice(0, 4)}${'*'.repeat(Math.max(4, phone.length - 8))}${phone.slice(-4)}`;
  }
}
