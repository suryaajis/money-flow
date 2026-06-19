import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findAll(
    userId: string,
    filters?: { type?: string; categoryId?: string; startDate?: string; endDate?: string },
  ): Promise<Transaction[]> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.userId = :userId', { userId })
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC');

    if (filters?.type) qb.andWhere('t.type = :type', { type: filters.type });
    if (filters?.categoryId) qb.andWhere('t.categoryId = :categoryId', { categoryId: filters.categoryId });
    if (filters?.startDate) qb.andWhere('t.date >= :startDate', { startDate: filters.startDate });
    if (filters?.endDate) qb.andWhere('t.date <= :endDate', { endDate: filters.endDate });

    return qb.getMany();
  }

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create({ ...dto, userId });
    return this.transactionRepository.save(transaction);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({ where: { id, userId } });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');

    Object.assign(transaction, dto);
    return this.transactionRepository.save(transaction);
  }

  async remove(userId: string, id: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({ where: { id, userId } });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');
    await this.transactionRepository.remove(transaction);
  }

  async bulkRemove(userId: string, ids: string[]): Promise<void> {
    await this.transactionRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...ids) AND userId = :userId', { ids, userId })
      .execute();
  }
}
