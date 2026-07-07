import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecurringTransaction,
  RecurringFrequency,
} from './recurring-transaction.entity';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';

function addFrequency(dateStr: string, frequency: RecurringFrequency): string {
  const date = new Date(dateStr);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

@Injectable()
export class RecurringService {
  constructor(
    @InjectRepository(RecurringTransaction)
    private readonly recurringRepo: Repository<RecurringTransaction>,
  ) {}

  findAll(userId: string): Promise<RecurringTransaction[]> {
    return this.recurringRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    userId: string,
    dto: CreateRecurringDto,
  ): Promise<RecurringTransaction> {
    const entity = this.recurringRepo.create({
      ...dto,
      userId,
      nextRunDate: dto.startDate,
      isActive: true,
    });
    return this.recurringRepo.save(entity);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringDto,
  ): Promise<RecurringTransaction> {
    const entity = await this.recurringRepo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Recurring transaction not found');
    Object.assign(entity, dto);
    if (dto.startDate) {
      entity.nextRunDate = dto.startDate;
    }
    return this.recurringRepo.save(entity);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entity = await this.recurringRepo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Recurring transaction not found');
    await this.recurringRepo.remove(entity);
  }

  async advanceNextRunDate(id: string): Promise<void> {
    const entity = await this.recurringRepo.findOne({ where: { id } });
    if (!entity) return;
    const next = addFrequency(entity.nextRunDate, entity.frequency);
    if (entity.endDate && next > entity.endDate) {
      entity.isActive = false;
    } else {
      entity.nextRunDate = next;
    }
    await this.recurringRepo.save(entity);
  }
}
