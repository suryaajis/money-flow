import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Debt } from './debt.entity';
import { CreateDebtDto } from './dto/create-debt.dto';

@Injectable()
export class DebtsService {
  constructor(@InjectRepository(Debt) private repo: Repository<Debt>) {}

  findAll(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  findActive(userId: string) {
    return this.repo.find({ where: { userId, settledAt: IsNull() }, order: { dueDate: 'ASC' } });
  }

  findSettled(userId: string) {
    return this.repo.find({ where: { userId, settledAt: Not(IsNull()) }, order: { settledAt: 'DESC' } });
  }

  async create(userId: string, dto: CreateDebtDto): Promise<Debt> {
    const debt = this.repo.create({ ...dto, userId, settledAt: null });
    return this.repo.save(debt);
  }

  async settle(userId: string, id: string): Promise<Debt> {
    const debt = await this.findOne(userId, id);
    if (debt.settledAt) return debt;
    debt.settledAt = new Date();
    return this.repo.save(debt);
  }

  async unsettle(userId: string, id: string): Promise<Debt> {
    const debt = await this.findOne(userId, id);
    debt.settledAt = null;
    return this.repo.save(debt);
  }

  async update(userId: string, id: string, dto: Partial<CreateDebtDto>): Promise<Debt> {
    const debt = await this.findOne(userId, id);
    Object.assign(debt, dto);
    return this.repo.save(debt);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.repo.delete(id);
  }

  private async findOne(userId: string, id: string): Promise<Debt> {
    const debt = await this.repo.findOne({ where: { id } });
    if (!debt) throw new NotFoundException('Debt not found');
    if (debt.userId !== userId) throw new ForbiddenException();
    return debt;
  }
}
