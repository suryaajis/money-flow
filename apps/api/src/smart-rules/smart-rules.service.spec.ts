import type { DataSource, Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { RuleCorrectionEvent } from './rule-correction-event.entity';
import { RuleExecutionBatch } from './rule-execution-batch.entity';
import { SmartRule } from './smart-rule.entity';
import { SmartRulesService } from './smart-rules.service';

describe('SmartRulesService', () => {
  const ruleRepo = { find: jest.fn() };
  const batchRepo = {};
  const transactionRepo = {};
  const correctionRepo = { find: jest.fn() };
  let service: SmartRulesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SmartRulesService(
      ruleRepo as unknown as Repository<SmartRule>,
      batchRepo as Repository<RuleExecutionBatch>,
      transactionRepo as Repository<Transaction>,
      correctionRepo as unknown as Repository<RuleCorrectionEvent>,
      {} as DataSource,
    );
  });

  it('normalizes merchant text only when an approved active rule matches', async () => {
    ruleRepo.find.mockResolvedValue([
      {
        conditions: { descriptionContains: 'kopi kenangan' },
        actions: {
          categoryId: 'category-1',
          normalizedDescription: 'Kopi Kenangan',
        },
        stopOnMatch: true,
      },
    ]);

    await expect(
      service.applyToInput('user-1', {
        amount: 25_000,
        type: 'expense',
        categoryId: null,
        date: '2026-09-02',
        notes: 'KOPI KENANGAN outlet 1',
      }),
    ).resolves.toMatchObject({
      categoryId: 'category-1',
      notes: 'Kopi Kenangan',
    });
  });

  it('suggests a rule after the same correction repeats without activating it', async () => {
    correctionRepo.find.mockResolvedValue([
      {
        merchantKey: 'kopi kenangan',
        sampleDescription: 'Kopi Kenangan',
        categoryId: 'category-1',
        source: 'web',
      },
      {
        merchantKey: 'kopi kenangan',
        sampleDescription: 'Kopi Kenangan',
        categoryId: 'category-1',
        source: 'web',
      },
    ]);
    ruleRepo.find.mockResolvedValue([]);

    await expect(service.suggestions('user-1')).resolves.toEqual([
      expect.objectContaining({
        merchant: 'Kopi Kenangan',
        occurrences: 2,
        actions: { categoryId: 'category-1' },
      }),
    ]);
  });
});
