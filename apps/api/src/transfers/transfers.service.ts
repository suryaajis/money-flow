import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Transfer } from './transfer.entity';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer)
    private readonly transferRepo: Repository<Transfer>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(userId: string) {
    return this.transferRepo.find({
      where: { userId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateTransferDto): Promise<Transfer> {
    if (dto.sourceAccountId === dto.destinationAccountId)
      throw new BadRequestException('Account asal dan tujuan harus berbeda');
    if (dto.idempotencyKey) {
      const existing = await this.transferRepo.findOne({
        where: { userId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }
    const [source, destination] = await Promise.all([
      this.accountRepo.findOne({
        where: { id: dto.sourceAccountId, ownerUserId: userId },
      }),
      this.accountRepo.findOne({
        where: { id: dto.destinationAccountId, ownerUserId: userId },
      }),
    ]);
    if (!source || !destination)
      throw new BadRequestException(
        'Transfer hanya dapat dilakukan antar-account milik sendiri',
      );
    if (source.archivedAt || destination.archivedAt)
      throw new BadRequestException(
        'Account yang diarsipkan tidak dapat digunakan',
      );
    this.validateAmounts(source, destination, dto);

    return this.dataSource.transaction(async (manager) => {
      const transfer = await manager.save(
        manager.create(Transfer, {
          ...dto,
          userId,
          notes: dto.notes ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
        }),
      );
      await manager.save(Transaction, [
        manager.create(Transaction, {
          amount: dto.sourceAmount,
          type: 'expense',
          categoryId: null,
          date: dto.date,
          notes: dto.notes ?? `Transfer ke ${destination.name}`,
          currency: source.currency,
          tags: [],
          source: 'transfer',
          recordedBy: userId,
          recordedByUserId: userId,
          recordedByWaPhoneId: null,
          clientMutationId: null,
          userId,
          accountId: source.id,
          transferId: transfer.id,
          entryRole: 'source',
          adjustmentReason: null,
        }),
        manager.create(Transaction, {
          amount: dto.destinationAmount,
          type: 'income',
          categoryId: null,
          date: dto.date,
          notes: dto.notes ?? `Transfer dari ${source.name}`,
          currency: destination.currency,
          tags: [],
          source: 'transfer',
          recordedBy: userId,
          recordedByUserId: userId,
          recordedByWaPhoneId: null,
          clientMutationId: null,
          userId,
          accountId: destination.id,
          transferId: transfer.id,
          entryRole: 'destination',
          adjustmentReason: null,
        }),
      ]);
      return transfer;
    });
  }

  async update(userId: string, id: string, dto: CreateTransferDto) {
    const transfer = await this.transferRepo.findOne({ where: { id, userId } });
    if (!transfer) throw new NotFoundException('Transfer tidak ditemukan');
    if (
      transfer.sourceAccountId !== dto.sourceAccountId ||
      transfer.destinationAccountId !== dto.destinationAccountId
    )
      throw new BadRequestException(
        'Account transfer tidak dapat diubah; hapus dan buat ulang',
      );
    this.validateAmounts(
      transfer.sourceAccount,
      transfer.destinationAccount,
      dto,
    );
    return this.dataSource.transaction(async (manager) => {
      Object.assign(transfer, dto, { notes: dto.notes ?? null });
      await manager.update(
        Transaction,
        { transferId: id, entryRole: 'source' },
        {
          amount: dto.sourceAmount,
          date: dto.date,
          notes: dto.notes ?? transfer.notes ?? undefined,
        },
      );
      await manager.update(
        Transaction,
        { transferId: id, entryRole: 'destination' },
        {
          amount: dto.destinationAmount,
          date: dto.date,
          notes: dto.notes ?? transfer.notes ?? undefined,
        },
      );
      return manager.save(transfer);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const transfer = await this.transferRepo.findOne({ where: { id, userId } });
    if (!transfer) throw new NotFoundException('Transfer tidak ditemukan');
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Transaction, { transferId: id });
      await manager.delete(Transfer, { id, userId });
    });
  }

  private validateAmounts(
    source: Account,
    destination: Account,
    dto: CreateTransferDto,
  ) {
    if (
      source.currency === destination.currency &&
      dto.sourceAmount !== dto.destinationAmount
    )
      throw new BadRequestException(
        'Nominal transfer dengan currency sama harus sama',
      );
    if (source.currency === destination.currency && dto.exchangeRate !== 1)
      throw new BadRequestException(
        'Kurs transfer dengan currency sama harus 1',
      );
    const calculatedRate = dto.destinationAmount / dto.sourceAmount;
    if (
      source.currency !== destination.currency &&
      Math.abs(calculatedRate - dto.exchangeRate) >
        Math.max(0.00000001, calculatedRate * 0.000001)
    )
      throw new BadRequestException(
        'Kurs harus sesuai dengan nominal asal dan tujuan yang dikonfirmasi',
      );
  }
}
