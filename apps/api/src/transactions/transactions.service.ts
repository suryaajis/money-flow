import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Category } from '../categories/category.entity';
import { AccountsService } from '../accounts/accounts.service';
import { SmartRulesService } from '../smart-rules/smart-rules.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly accountsService: AccountsService,
    private readonly smartRules: SmartRulesService,
  ) {}

  async findAll(
    userId: string,
    filters?: {
      type?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      accountId?: string;
    },
  ): Promise<Transaction[]> {
    const accountIds =
      await this.accountsService.getAccessibleAccountIds(userId);
    if (!accountIds.length) return [];
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.account', 'account')
      .leftJoinAndSelect('t.recordedByUser', 'recordedByUser')
      .where('t.accountId IN (:...accountIds)', { accountIds })
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC');

    if (filters?.type) qb.andWhere('t.type = :type', { type: filters.type });
    if (filters?.categoryId)
      qb.andWhere('t.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    if (filters?.startDate)
      qb.andWhere('t.date >= :startDate', { startDate: filters.startDate });
    if (filters?.endDate)
      qb.andWhere('t.date <= :endDate', { endDate: filters.endDate });
    if (filters?.accountId) {
      if (!accountIds.includes(filters.accountId)) return [];
      qb.andWhere('t.accountId = :accountId', { accountId: filters.accountId });
    }

    return qb.getMany();
  }

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const initialAccount = dto.accountId
      ? (await this.accountsService.assertCanContribute(userId, dto.accountId))
          .account
      : await this.accountsService.getActiveWritableAccount(userId);
    const ruled = await this.smartRules.applyToInput(
      initialAccount.ownerUserId,
      {
        ...dto,
        accountId: initialAccount.id,
      },
    );
    const account =
      ruled.accountId === initialAccount.id
        ? initialAccount
        : (
            await this.accountsService.assertCanContribute(
              userId,
              ruled.accountId!,
            )
          ).account;
    if (account.ownerUserId !== initialAccount.ownerUserId)
      throw new BadRequestException(
        'Smart rule tidak boleh memindahkan transaksi lintas owner',
      );
    return this.createValidated(
      account.ownerUserId,
      { ...ruled, accountId: account.id },
      {
        source: account.ownerUserId === userId ? 'web' : 'shared',
        recordedBy: userId,
        recordedByUserId: userId,
      },
    );
  }

  async createForSharedWallet(
    ownerUserId: string,
    memberUserId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const initialAccount = dto.accountId
      ? (
          await this.accountsService.assertCanContribute(
            memberUserId,
            dto.accountId,
          )
        ).account
      : await this.accountsService.ensureDefaultAccount(ownerUserId);
    if (initialAccount.ownerUserId !== ownerUserId)
      throw new BadRequestException('Account bukan milik owner tujuan');
    const ruled = await this.smartRules.applyToInput(ownerUserId, {
      ...dto,
      accountId: initialAccount.id,
    });
    const account =
      ruled.accountId === initialAccount.id
        ? initialAccount
        : (
            await this.accountsService.assertCanContribute(
              memberUserId,
              ruled.accountId!,
            )
          ).account;
    if (account.ownerUserId !== ownerUserId)
      throw new BadRequestException(
        'Smart rule tidak boleh memindahkan transaksi lintas owner',
      );
    return this.createValidated(
      ownerUserId,
      { ...ruled, accountId: account.id },
      {
        source: 'shared',
        recordedBy: memberUserId,
        recordedByUserId: memberUserId,
      },
    );
  }

  private async createValidated(
    userId: string,
    dto: CreateTransactionDto,
    attribution: Pick<
      Transaction,
      'source' | 'recordedBy' | 'recordedByUserId'
    > | null = null,
  ): Promise<Transaction> {
    if (dto.clientMutationId) {
      const existing = await this.transactionRepository.findOne({
        where: { userId, clientMutationId: dto.clientMutationId },
      });
      if (existing) return existing;
    }
    await this.validateInput(userId, dto);
    const transaction = this.transactionRepository.create({
      ...dto,
      userId,
      accountId: dto.accountId!,
      transferId: null,
      entryRole: null,
      adjustmentReason: null,
      ...(attribution ?? {}),
    });
    try {
      return await this.transactionRepository.save(transaction);
    } catch (error) {
      // Two retries can pass the lookup concurrently. The partial unique index
      // is authoritative; resolve its loser to the already-created row.
      if (
        dto.clientMutationId &&
        (error as { code?: string })?.code === '23505'
      ) {
        const existing = await this.transactionRepository.findOne({
          where: { userId, clientMutationId: dto.clientMutationId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');

    if (transaction.transferId || transaction.adjustmentReason)
      throw new BadRequestException(
        'Ledger entry ini tidak dapat diedit langsung',
      );
    const previousCategoryId = transaction.categoryId;
    const nextAccountId = dto.accountId ?? transaction.accountId;
    const account = await this.accountsService.getAccess(userId, nextAccountId);
    if (account.ownership !== 'owned')
      throw new BadRequestException(
        'Transaksi shared hanya dapat diedit owner',
      );
    await this.validateInput(account.account.ownerUserId, {
      ...transaction,
      ...dto,
    });
    Object.assign(transaction, dto);
    const saved = await this.transactionRepository.save(transaction);
    if (dto.categoryId && dto.categoryId !== previousCategoryId) {
      await this.smartRules.recordCategoryCorrection(
        transaction.userId,
        transaction.notes,
        dto.categoryId,
        transaction.source,
      );
    }
    return saved;
  }

  async remove(userId: string, id: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');
    if (transaction.transferId || transaction.adjustmentReason)
      throw new BadRequestException(
        'Ledger entry ini tidak dapat dihapus langsung',
      );
    await this.transactionRepository.remove(transaction);
  }

  async bulkRemove(userId: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.transactionRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...ids) AND userId = :userId', { ids, userId })
      .execute();
  }

  private async validateInput(
    userId: string,
    dto: {
      amount: number;
      type: 'income' | 'expense';
      categoryId: string | null;
      date: string;
      accountId?: string;
    },
  ): Promise<void> {
    if (!Number.isFinite(Number(dto.amount)) || Number(dto.amount) <= 0) {
      throw new BadRequestException('Nominal harus lebih besar dari 0');
    }

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (dto.date > today) {
      throw new BadRequestException(
        'Tanggal transaksi tidak boleh di masa depan',
      );
    }

    if (!dto.categoryId) return;
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId, userId },
    });
    if (!category) throw new BadRequestException('Kategori tidak valid');
    if (category.type !== 'both' && category.type !== dto.type) {
      throw new BadRequestException('Kategori tidak sesuai tipe transaksi');
    }
  }
}
