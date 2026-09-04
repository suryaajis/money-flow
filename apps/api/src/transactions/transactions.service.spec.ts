import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Transaction } from './transaction.entity';
import { TransactionsService } from './transactions.service';
import type { AccountsService } from '../accounts/accounts.service';
import type { SmartRulesService } from '../smart-rules/smart-rules.service';

describe('TransactionsService reliability', () => {
  const transactionRepository = {
    findOne: jest.fn(),
    create: jest.fn((value: object) => value),
    save: jest.fn(),
  };
  const categoryRepository = {
    findOne: jest.fn(),
  };
  const accountsService = {
    ensureDefaultAccount: jest.fn(),
    getActiveWritableAccount: jest.fn(),
    assertCanContribute: jest.fn(),
  };
  const smartRules = {
    applyToInput: jest.fn(),
  };
  const dto = {
    amount: 25_000,
    type: 'expense' as const,
    categoryId: '11111111-1111-4111-8111-111111111111',
    date: '2026-09-01',
    clientMutationId: '22222222-2222-4222-8222-222222222222',
  };
  let service: TransactionsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T17:30:00.000Z'));
    jest.clearAllMocks();
    categoryRepository.findOne.mockResolvedValue({
      id: dto.categoryId,
      userId: 'user-1',
      type: 'expense',
    });
    transactionRepository.save.mockImplementation((value: Transaction) =>
      Promise.resolve(value),
    );
    accountsService.ensureDefaultAccount.mockImplementation((userId: string) =>
      Promise.resolve({ id: `account-${userId}`, ownerUserId: userId }),
    );
    accountsService.getActiveWritableAccount.mockImplementation(
      (userId: string) =>
        Promise.resolve({ id: `account-${userId}`, ownerUserId: userId }),
    );
    accountsService.assertCanContribute.mockImplementation(
      (userId: string, accountId: string) =>
        Promise.resolve({
          account: { id: accountId, ownerUserId: userId },
          ownership: 'owned',
          role: 'owner',
        }),
    );
    smartRules.applyToInput.mockImplementation(
      (_userId: string, input: object) => Promise.resolve(input),
    );
    service = new TransactionsService(
      transactionRepository as unknown as Repository<Transaction>,
      categoryRepository as unknown as Repository<Category>,
      accountsService as unknown as AccountsService,
      smartRules as unknown as SmartRulesService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('accepts the current Jakarta date even while UTC is still the previous day', async () => {
    transactionRepository.findOne.mockResolvedValue(null);

    await expect(service.create('user-1', dto)).resolves.toMatchObject({
      userId: 'user-1',
      date: '2026-09-01',
    });
  });

  it('rejects a date after the current Jakarta date', async () => {
    transactionRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create('user-1', { ...dto, date: '2026-09-02' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('returns the winning row when concurrent retries hit the unique index', async () => {
    const winner = { id: 'transaction-1', ...dto, userId: 'user-1' };
    transactionRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner);
    transactionRepository.save.mockRejectedValueOnce({ code: '23505' });

    await expect(service.create('user-1', dto)).resolves.toBe(winner);
    expect(transactionRepository.findOne).toHaveBeenCalledTimes(2);
  });

  it('records shared-wallet attribution through the validated path', async () => {
    transactionRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createForSharedWallet('owner-1', 'member-1', dto),
    ).resolves.toMatchObject({
      userId: 'owner-1',
      source: 'shared',
      recordedBy: 'member-1',
      recordedByUserId: 'member-1',
    });
    expect(categoryRepository.findOne).toHaveBeenCalledWith({
      where: { id: dto.categoryId, userId: 'owner-1' },
    });
  });
});
