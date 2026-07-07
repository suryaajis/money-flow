import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './budget.entity';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import { format } from 'date-fns';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
  ) {}

  findByMonth(userId: string, month?: string): Promise<Budget[]> {
    const m = month ?? format(new Date(), 'yyyy-MM');
    return this.budgetRepo.find({ where: { userId, month: m } });
  }

  async upsert(userId: string, dto: UpsertBudgetDto): Promise<Budget> {
    const existing = await this.budgetRepo.findOne({
      where: { userId, categoryId: dto.categoryId, month: dto.month },
    });

    if (existing) {
      existing.amount = dto.amount;
      return this.budgetRepo.save(existing);
    }

    const budget = this.budgetRepo.create({ ...dto, userId });
    return this.budgetRepo.save(budget);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.budgetRepo.delete({ id, userId });
  }

  async copyFromPreviousMonth(userId: string, targetMonth: string): Promise<Budget[]> {
    const [year, month] = targetMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonth = format(prevDate, 'yyyy-MM');

    const prevBudgets = await this.budgetRepo.find({ where: { userId, month: prevMonth } });
    const copied: Budget[] = [];

    for (const prev of prevBudgets) {
      const existing = await this.budgetRepo.findOne({
        where: { userId, categoryId: prev.categoryId, month: targetMonth },
      });
      if (!existing) {
        const b = this.budgetRepo.create({ userId, categoryId: prev.categoryId, amount: prev.amount, month: targetMonth });
        copied.push(await this.budgetRepo.save(b));
      }
    }

    return this.findByMonth(userId, targetMonth);
  }
}
