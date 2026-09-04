import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { EmailService } from '../email/email.service';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import { AccountShare } from './account-share.entity';
import { Account } from './account.entity';
import { AccountsService } from './accounts.service';

describe('AccountsService sharing authorization', () => {
  const accountRepo = { findOne: jest.fn() };
  const shareRepo = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
  const userRepo = { findOne: jest.fn(), update: jest.fn() };
  const transactionRepo = {};
  const email = {};
  let service: AccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccountsService(
      accountRepo as unknown as Repository<Account>,
      shareRepo as unknown as Repository<AccountShare>,
      userRepo as Repository<User>,
      transactionRepo as Repository<Transaction>,
      email as EmailService,
    );
  });

  it('allows an accepted contributor and rejects an accepted viewer', async () => {
    accountRepo.findOne.mockResolvedValue({
      id: 'account-1',
      ownerUserId: 'owner-1',
      archivedAt: null,
    });
    shareRepo.findOne
      .mockResolvedValueOnce({ role: 'contributor', status: 'accepted' })
      .mockResolvedValueOnce({ role: 'viewer', status: 'accepted' });

    await expect(
      service.assertCanContribute('member-1', 'account-1'),
    ).resolves.toMatchObject({ role: 'contributor' });
    await expect(
      service.assertCanContribute('member-2', 'account-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invitation token when the logged-in user is not its target', async () => {
    const builder = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        status: 'pending',
        memberUserId: 'target-user',
        inviteExpiresAt: new Date(Date.now() + 60_000),
      }),
    };
    shareRepo.createQueryBuilder.mockReturnValue(builder);

    await expect(
      service.acceptInvitation('different-user', 'raw-token'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('persists an accessible shared account as the active pocket', async () => {
    accountRepo.findOne.mockResolvedValue({
      id: 'account-1',
      ownerUserId: 'owner-1',
      archivedAt: null,
    });
    shareRepo.findOne.mockResolvedValue({
      role: 'viewer',
      status: 'accepted',
    });

    await expect(
      service.setActiveAccount('member-1', 'account-1'),
    ).resolves.toEqual({ accountId: 'account-1' });
    expect(userRepo.update).toHaveBeenCalledWith(
      { id: 'member-1' },
      { activeAccountId: 'account-1' },
    );
  });
});
