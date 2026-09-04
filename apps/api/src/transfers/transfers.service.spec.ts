import { BadRequestException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Transfer } from './transfer.entity';
import { TransfersService } from './transfers.service';

describe('TransfersService ledger invariants', () => {
  const transferRepo = { findOne: jest.fn() };
  const accountRepo = { findOne: jest.fn() };
  const manager = {
    create: jest.fn((_entity: unknown, value: object) => value),
    save: jest.fn(async (value: unknown) => value),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (value: typeof manager) => unknown) =>
      callback(manager),
    ),
  };
  const dto = {
    sourceAccountId: '11111111-1111-4111-8111-111111111111',
    destinationAccountId: '22222222-2222-4222-8222-222222222222',
    sourceAmount: 100_000,
    destinationAmount: 100_000,
    exchangeRate: 1,
    date: '2026-09-02',
  };
  let service: TransfersService;

  beforeEach(() => {
    jest.clearAllMocks();
    transferRepo.findOne.mockResolvedValue(null);
    accountRepo.findOne
      .mockResolvedValueOnce({
        id: dto.sourceAccountId,
        ownerUserId: 'user-1',
        name: 'BCA',
        currency: 'IDR',
        archivedAt: null,
      })
      .mockResolvedValueOnce({
        id: dto.destinationAccountId,
        ownerUserId: 'user-1',
        name: 'DANA',
        currency: 'IDR',
        archivedAt: null,
      });
    service = new TransfersService(
      transferRepo as unknown as Repository<Transfer>,
      accountRepo as unknown as Repository<Account>,
      dataSource as unknown as DataSource,
    );
  });

  it('creates the transfer and both ledger entries in one DB transaction', async () => {
    await service.create('user-1', dto);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    const entries = manager.save.mock.calls[1][1] as Array<{
      type: string;
      entryRole: string;
      accountId: string;
    }>;
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'expense',
          entryRole: 'source',
          accountId: dto.sourceAccountId,
        }),
        expect.objectContaining({
          type: 'income',
          entryRole: 'destination',
          accountId: dto.destinationAccountId,
        }),
      ]),
    );
  });

  it('rejects transfer to the same account before writing', async () => {
    await expect(
      service.create('user-1', {
        ...dto,
        destinationAccountId: dto.sourceAccountId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('requires a cross-currency rate consistent with both amounts', async () => {
    accountRepo.findOne
      .mockReset()
      .mockResolvedValueOnce({
        id: dto.sourceAccountId,
        ownerUserId: 'user-1',
        name: 'USD Cash',
        currency: 'USD',
        archivedAt: null,
      })
      .mockResolvedValueOnce({
        id: dto.destinationAccountId,
        ownerUserId: 'user-1',
        name: 'Rupiah',
        currency: 'IDR',
        archivedAt: null,
      });

    await expect(
      service.create('user-1', {
        ...dto,
        sourceAmount: 10,
        destinationAmount: 160_000,
        exchangeRate: 15_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
