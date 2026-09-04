import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { CreateSmartRuleDto } from './dto/create-smart-rule.dto';
import { UpdateSmartRuleDto } from './dto/update-smart-rule.dto';
import {
  RuleExecutionBatch,
  RuleBeforeSnapshot,
} from './rule-execution-batch.entity';
import { SmartRule } from './smart-rule.entity';
import { RuleCorrectionEvent } from './rule-correction-event.entity';

@Injectable()
export class SmartRulesService {
  constructor(
    @InjectRepository(SmartRule)
    private readonly ruleRepo: Repository<SmartRule>,
    @InjectRepository(RuleExecutionBatch)
    private readonly batchRepo: Repository<RuleExecutionBatch>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(RuleCorrectionEvent)
    private readonly correctionRepo: Repository<RuleCorrectionEvent>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(userId: string) {
    return this.ruleRepo.find({
      where: { userId },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
  }

  create(userId: string, dto: CreateSmartRuleDto) {
    return this.ruleRepo.save(
      this.ruleRepo.create({
        ...dto,
        userId,
        priority: dto.priority ?? 100,
        active: dto.active ?? true,
        stopOnMatch: dto.stopOnMatch ?? true,
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateSmartRuleDto) {
    const rule = await this.requireRule(userId, id);
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule);
  }

  async remove(userId: string, id: string): Promise<void> {
    const rule = await this.requireRule(userId, id);
    await this.ruleRepo.remove(rule);
  }

  async applyToInput(
    ownerUserId: string,
    input: CreateTransactionDto,
  ): Promise<CreateTransactionDto> {
    const rules = await this.ruleRepo.find({
      where: { userId: ownerUserId, active: true },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
    let result = { ...input };
    for (const rule of rules) {
      if (!this.matches(rule, result)) continue;
      result = {
        ...result,
        ...(rule.actions.categoryId
          ? { categoryId: rule.actions.categoryId }
          : {}),
        ...(rule.actions.tags
          ? {
              tags: [
                ...new Set([...(result.tags ?? []), ...rule.actions.tags]),
              ],
            }
          : {}),
        ...(rule.actions.normalizedDescription
          ? { notes: rule.actions.normalizedDescription }
          : {}),
      };
      if (rule.stopOnMatch) break;
    }
    return result;
  }

  async preview(userId: string, ruleId: string) {
    const rule = await this.requireRule(userId, ruleId);
    const rows = await this.transactionRepo.find({
      where: { userId },
      order: { date: 'DESC' },
      take: 1000,
    });
    const matches = rows.filter(
      (row) => !row.transferId && this.matches(rule, row),
    );
    return { count: matches.length, sample: matches.slice(0, 20) };
  }

  async applyHistorical(userId: string, ruleId: string) {
    const rule = await this.requireRule(userId, ruleId);
    const rows = await this.transactionRepo.find({ where: { userId } });
    const matches = rows.filter(
      (row) => !row.transferId && this.matches(rule, row),
    );
    const snapshot: RuleBeforeSnapshot[] = matches.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      accountId: row.accountId,
      tags: row.tags ?? [],
      notes: row.notes,
    }));
    const batch = await this.dataSource.transaction(async (manager) => {
      for (const row of matches) {
        if (rule.actions.categoryId) row.categoryId = rule.actions.categoryId;
        if (rule.actions.tags)
          row.tags = [...new Set([...(row.tags ?? []), ...rule.actions.tags])];
        if (rule.actions.normalizedDescription)
          row.notes = rule.actions.normalizedDescription;
      }
      if (matches.length) await manager.save(matches);
      return manager.save(
        manager.create(RuleExecutionBatch, {
          userId,
          ruleId,
          beforeSnapshot: snapshot,
          reversibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          undoneAt: null,
        }),
      );
    });
    return {
      batchId: batch.id,
      affected: matches.length,
      reversibleUntil: batch.reversibleUntil,
    };
  }

  async undo(userId: string, batchId: string) {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, userId },
    });
    if (!batch || batch.undoneAt)
      throw new NotFoundException('Batch tidak ditemukan');
    if (batch.reversibleUntil.getTime() < Date.now())
      throw new BadRequestException('Masa undo sudah berakhir');
    await this.dataSource.transaction(async (manager) => {
      for (const before of batch.beforeSnapshot) {
        await manager.update(
          Transaction,
          { id: before.id, userId },
          {
            categoryId: before.categoryId,
            accountId: before.accountId,
            tags: before.tags ?? [],
            notes: before.notes,
          },
        );
      }
      batch.undoneAt = new Date();
      await manager.save(batch);
    });
    return { restored: batch.beforeSnapshot.length };
  }

  async recordCategoryCorrection(
    userId: string,
    description: string | null,
    categoryId: string,
    source: string | null,
  ) {
    const sampleDescription = description?.trim().replace(/\s+/g, ' ');
    if (!sampleDescription) return;
    const merchantKey = sampleDescription.toLowerCase().slice(0, 160);
    await this.correctionRepo.save(
      this.correctionRepo.create({
        userId,
        merchantKey,
        sampleDescription: sampleDescription.slice(0, 160),
        categoryId,
        source,
      }),
    );
  }

  async suggestions(userId: string) {
    const [events, rules] = await Promise.all([
      this.correctionRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 500,
      }),
      this.findAll(userId),
    ]);
    const grouped = new Map<
      string,
      {
        merchant: string;
        categoryId: string;
        source: string | null;
        count: number;
      }
    >();
    for (const event of events) {
      const key = `${event.merchantKey}:${event.categoryId}`;
      const current = grouped.get(key);
      if (current) current.count += 1;
      else
        grouped.set(key, {
          merchant: event.sampleDescription,
          categoryId: event.categoryId,
          source: event.source,
          count: 1,
        });
    }
    return [...grouped.values()]
      .filter(
        (candidate) =>
          candidate.count >= 2 &&
          !rules.some(
            (rule) =>
              rule.conditions.descriptionContains?.toLowerCase() ===
                candidate.merchant.toLowerCase() &&
              rule.actions.categoryId === candidate.categoryId,
          ),
      )
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)
      .map((candidate) => ({
        merchant: candidate.merchant,
        occurrences: candidate.count,
        conditions: {
          descriptionContains: candidate.merchant,
          ...(candidate.source ? { source: candidate.source } : {}),
        },
        actions: { categoryId: candidate.categoryId },
      }));
  }

  private matches(
    rule: SmartRule,
    row: {
      amount: number;
      type: 'income' | 'expense';
      notes?: string | null;
      source?: string;
      accountId?: string;
    },
  ) {
    const c = rule.conditions;
    const notes = row.notes ?? '';
    if (
      c.descriptionContains &&
      !notes.toLowerCase().includes(c.descriptionContains.toLowerCase())
    )
      return false;
    if (c.source && row.source !== c.source) return false;
    if (c.accountId && row.accountId !== c.accountId) return false;
    if (c.type && row.type !== c.type) return false;
    if (c.minAmount !== undefined && Number(row.amount) < c.minAmount)
      return false;
    if (c.maxAmount !== undefined && Number(row.amount) > c.maxAmount)
      return false;
    return true;
  }

  private async requireRule(userId: string, id: string) {
    const rule = await this.ruleRepo.findOne({ where: { id, userId } });
    if (!rule) throw new NotFoundException('Smart rule tidak ditemukan');
    return rule;
  }
}
