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

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(
    userId: string,
    filters?: {
      type?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<Transaction[]> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.userId = :userId', { userId })
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

    return qb.getMany();
  }

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.createValidated(userId, dto);
  }

  async createForSharedWallet(
    ownerUserId: string,
    memberUserId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.createValidated(ownerUserId, dto, {
      source: 'shared',
      recordedBy: memberUserId,
    });
  }

  private async createValidated(
    userId: string,
    dto: CreateTransactionDto,
    attribution: Pick<Transaction, 'source' | 'recordedBy'> | null = null,
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

    await this.validateInput(userId, { ...transaction, ...dto });
    Object.assign(transaction, dto);
    return this.transactionRepository.save(transaction);
  }

  async remove(userId: string, id: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');
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
