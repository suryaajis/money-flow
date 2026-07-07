import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';

@Injectable()
export class BackupService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async export(userId: string) {
    const transactions = await this.transactionRepo.find({
      where: { userId },
    });
    const categories = await this.categoryRepo.find({
      where: { userId },
    });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
    };
  }

  async import(
    userId: string,
    data: { transactions: any[]; categories: any[] },
    mode: 'merge' | 'replace',
  ): Promise<{ imported: number }> {
    let importedCount = 0;

    if (mode === 'replace') {
      // Delete all user's transactions
      await this.transactionRepo.delete({ userId });

      // Delete all user's non-default categories
      await this.categoryRepo.delete({ userId, isDefault: false });

      // Save new categories (skip default ones from backup)
      const categoriesToSave = data.categories
        .filter((c) => !c.isDefault)
        .map((c) => this.categoryRepo.create({ ...c, userId, isDefault: false }));

      if (categoriesToSave.length > 0) {
        await this.categoryRepo.save(categoriesToSave);
        importedCount += categoriesToSave.length;
      }

      // Save new transactions
      const transactionsToSave = data.transactions.map((t) =>
        this.transactionRepo.create({ ...t, userId }),
      );

      if (transactionsToSave.length > 0) {
        await this.transactionRepo.save(transactionsToSave);
        importedCount += transactionsToSave.length;
      }
    } else {
      // Merge mode: skip existing IDs
      const existingTransactions = await this.transactionRepo.find({
        where: { userId },
        select: ['id'],
      });
      const existingTransactionIds = new Set(existingTransactions.map((t) => t.id));

      const existingCategories = await this.categoryRepo.find({
        where: { userId },
        select: ['id'],
      });
      const existingCategoryIds = new Set(existingCategories.map((c) => c.id));

      // Save new categories (those whose IDs don't already exist)
      const newCategories = data.categories
        .filter((c) => !existingCategoryIds.has(c.id))
        .map((c) => this.categoryRepo.create({ ...c, userId }));

      if (newCategories.length > 0) {
        await this.categoryRepo.save(newCategories);
        importedCount += newCategories.length;
      }

      // Save new transactions (those whose IDs don't already exist)
      const newTransactions = data.transactions
        .filter((t) => !existingTransactionIds.has(t.id))
        .map((t) => this.transactionRepo.create({ ...t, userId }));

      if (newTransactions.length > 0) {
        await this.transactionRepo.save(newTransactions);
        importedCount += newTransactions.length;
      }
    }

    return { imported: importedCount };
  }
}
