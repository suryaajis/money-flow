import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { In, IsNull, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import { Account } from './account.entity';
import { AccountShare, AccountShareRole } from './account-share.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

export interface AccountAccess {
  account: Account;
  ownership: 'owned' | 'shared';
  role: 'owner' | AccountShareRole;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(AccountShare)
    private readonly shareRepo: Repository<AccountShare>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly email: EmailService,
  ) {}

  async ensureDefaultAccount(userId: string): Promise<Account> {
    const existing = await this.accountRepo.findOne({
      where: { ownerUserId: userId, isDefault: true, archivedAt: IsNull() },
    });
    if (existing) {
      await this.ensureActivePreference(userId, existing.id);
      return existing;
    }
    const account = this.accountRepo.create({
      ownerUserId: userId,
      name: 'Dompet Utama',
      type: 'cash',
      currency: 'IDR',
      openingBalance: 0,
      color: '#84cc16',
      icon: 'Wallet',
      isDefault: true,
      sortOrder: 0,
      archivedAt: null,
    });
    try {
      const saved = await this.accountRepo.save(account);
      await this.ensureActivePreference(userId, saved.id);
      return saved;
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      const saved = await this.accountRepo.findOneOrFail({
        where: { ownerUserId: userId, isDefault: true },
      });
      await this.ensureActivePreference(userId, saved.id);
      return saved;
    }
  }

  async getActiveAccount(userId: string): Promise<{ accountId: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.activeAccountId) {
      try {
        await this.getAccess(userId, user.activeAccountId);
        return { accountId: user.activeAccountId };
      } catch {
        // The account was archived or shared access was revoked. Fall back to
        // the user's own default account below.
      }
    }
    const fallback = await this.ensureDefaultAccount(userId);
    await this.userRepo.update(
      { id: userId },
      { activeAccountId: fallback.id },
    );
    return { accountId: fallback.id };
  }

  async setActiveAccount(
    userId: string,
    accountId: string,
  ): Promise<{ accountId: string }> {
    await this.getAccess(userId, accountId);
    await this.userRepo.update({ id: userId }, { activeAccountId: accountId });
    return { accountId };
  }

  async getActiveWritableAccount(userId: string): Promise<Account> {
    const { accountId } = await this.getActiveAccount(userId);
    return (await this.assertCanContribute(userId, accountId)).account;
  }

  async findAll(userId: string) {
    await this.ensureDefaultAccount(userId);
    const [owned, shares] = await Promise.all([
      this.accountRepo.find({
        where: { ownerUserId: userId },
        relations: { owner: true },
        order: { archivedAt: 'ASC', sortOrder: 'ASC', createdAt: 'ASC' },
      }),
      this.shareRepo.find({
        where: { memberUserId: userId, status: 'accepted' },
        relations: { account: { owner: true } },
        order: { createdAt: 'ASC' },
      }),
    ]);
    const rows = [
      ...owned.map((account) => ({
        account,
        ownership: 'owned' as const,
        role: 'owner' as const,
      })),
      ...shares
        .filter((share) => !share.account.archivedAt)
        .map((share) => ({
          account: share.account,
          ownership: 'shared' as const,
          role: share.role,
          shareId: share.id,
        })),
    ];
    const accounts = rows.map((row) => row.account);
    const [balances, lastActivities] = await Promise.all([
      this.getBalances(accounts),
      this.getLastActivities(accounts),
    ]);
    return rows.map((row) => ({
      ...row.account,
      ownership: row.ownership,
      role: row.role,
      shareId: 'shareId' in row ? row.shareId : null,
      balance: balances.get(row.account.id) ?? row.account.openingBalance,
      lastActivityAt: lastActivities.get(row.account.id) ?? null,
    }));
  }

  async create(userId: string, dto: CreateAccountDto): Promise<Account> {
    const count = await this.accountRepo.count({
      where: { ownerUserId: userId },
    });
    return this.accountRepo.save(
      this.accountRepo.create({
        ...dto,
        ownerUserId: userId,
        type: dto.type,
        color: dto.color ?? '#84cc16',
        icon: dto.icon ?? 'Wallet',
        isDefault: count === 0,
        sortOrder: count,
        archivedAt: null,
      }),
    );
  }

  async update(
    userId: string,
    accountId: string,
    dto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.requireOwned(userId, accountId);
    if (dto.currency && dto.currency !== account.currency) {
      const transactionCount = await this.transactionRepo.count({
        where: { accountId },
      });
      if (transactionCount > 0)
        throw new ConflictException(
          'Currency account dengan histori tidak dapat diubah',
        );
    }
    Object.assign(account, dto);
    return this.accountRepo.save(account);
  }

  async archive(userId: string, accountId: string): Promise<void> {
    const account = await this.requireOwned(userId, accountId);
    if (account.isDefault)
      throw new ConflictException('Account default tidak dapat diarsipkan');
    account.archivedAt = new Date();
    await this.accountRepo.save(account);
  }

  async adjust(
    userId: string,
    accountId: string,
    amount: number,
    reason: string,
  ): Promise<Transaction> {
    const account = await this.requireOwned(userId, accountId);
    if (!Number.isFinite(amount) || amount === 0)
      throw new BadRequestException('Nilai adjustment tidak boleh nol');
    return this.transactionRepo.save(
      this.transactionRepo.create({
        amount: Math.abs(amount),
        type: amount > 0 ? 'income' : 'expense',
        categoryId: null,
        date: new Date().toISOString().slice(0, 10),
        notes: `Adjustment: ${reason}`,
        currency: account.currency,
        tags: [],
        source: 'adjustment',
        recordedBy: userId,
        recordedByUserId: userId,
        recordedByWaPhoneId: null,
        clientMutationId: null,
        userId,
        accountId,
        transferId: null,
        entryRole: null,
        adjustmentReason: reason,
      }),
    );
  }

  async invite(
    ownerUserId: string,
    accountId: string,
    rawEmail: string,
    role: AccountShareRole,
  ): Promise<AccountShare> {
    const account = await this.requireOwned(ownerUserId, accountId);
    const invitedEmail = rawEmail.trim().toLowerCase();
    const member = await this.userRepo.findOne({
      where: { email: invitedEmail },
    });
    if (!member)
      throw new NotFoundException('User dengan email tersebut belum terdaftar');
    if (member.id === ownerUserId)
      throw new ConflictException('Tidak dapat mengundang diri sendiri');

    let share = await this.shareRepo.findOne({
      where: { accountId, memberUserId: member.id },
    });
    if (share?.status === 'accepted')
      throw new ConflictException('User sudah memiliki akses ke account ini');

    const token = randomBytes(32).toString('base64url');
    const values = {
      accountId,
      memberUserId: member.id,
      invitedEmail,
      role,
      status: 'pending' as const,
      inviteTokenHash: this.hashToken(token),
      inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: null,
      revokedAt: null,
    };
    share = share
      ? this.shareRepo.merge(share, values)
      : this.shareRepo.create(values);
    const saved = await this.shareRepo.save(share);
    await this.email.sendAccountInvitation(invitedEmail, token, account.name);
    saved.inviteTokenHash = null;
    return saved;
  }

  async listShares(ownerUserId: string, accountId: string) {
    await this.requireOwned(ownerUserId, accountId);
    return this.shareRepo.find({
      where: { accountId },
      relations: { member: true },
      order: { createdAt: 'ASC' },
    });
  }

  async updateShareRole(
    ownerUserId: string,
    accountId: string,
    shareId: string,
    role: AccountShareRole,
  ) {
    await this.requireOwned(ownerUserId, accountId);
    const share = await this.shareRepo.findOne({
      where: { id: shareId, accountId },
    });
    if (!share || share.status === 'revoked') throw new NotFoundException();
    share.role = role;
    return this.shareRepo.save(share);
  }

  async revokeShare(
    ownerUserId: string,
    accountId: string,
    shareId: string,
  ): Promise<void> {
    await this.requireOwned(ownerUserId, accountId);
    const share = await this.shareRepo.findOne({
      where: { id: shareId, accountId },
    });
    if (!share) throw new NotFoundException();
    share.status = 'revoked';
    share.revokedAt = new Date();
    share.inviteTokenHash = null;
    share.inviteExpiresAt = null;
    await this.shareRepo.save(share);
  }

  async listInvitations(userId: string) {
    return this.shareRepo.find({
      where: { memberUserId: userId, status: 'pending' },
      relations: { account: { owner: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async acceptInvitation(userId: string, token: string) {
    const share = await this.shareRepo
      .createQueryBuilder('share')
      .addSelect('share.inviteTokenHash')
      .leftJoinAndSelect('share.account', 'account')
      .where('share.inviteTokenHash = :hash', { hash: this.hashToken(token) })
      .getOne();
    if (
      !share ||
      share.status !== 'pending' ||
      share.memberUserId !== userId ||
      !share.inviteExpiresAt ||
      share.inviteExpiresAt.getTime() <= Date.now()
    )
      throw new ForbiddenException(
        'Undangan tidak valid atau sudah kedaluwarsa',
      );
    share.status = 'accepted';
    share.acceptedAt = new Date();
    share.inviteTokenHash = null;
    share.inviteExpiresAt = null;
    return this.shareRepo.save(share);
  }

  async declineInvitation(userId: string, token: string): Promise<void> {
    const share = await this.shareRepo
      .createQueryBuilder('share')
      .addSelect('share.inviteTokenHash')
      .where('share.inviteTokenHash = :hash', { hash: this.hashToken(token) })
      .getOne();
    if (!share || share.memberUserId !== userId) throw new ForbiddenException();
    share.status = 'revoked';
    share.revokedAt = new Date();
    share.inviteTokenHash = null;
    share.inviteExpiresAt = null;
    await this.shareRepo.save(share);
  }

  async leave(userId: string, shareId: string): Promise<void> {
    const share = await this.shareRepo.findOne({
      where: { id: shareId, memberUserId: userId, status: 'accepted' },
    });
    if (!share) throw new NotFoundException();
    share.status = 'revoked';
    share.revokedAt = new Date();
    await this.shareRepo.save(share);
  }

  async getAccess(userId: string, accountId: string): Promise<AccountAccess> {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
      relations: { owner: true },
    });
    if (!account || account.archivedAt)
      throw new NotFoundException('Account tidak ditemukan');
    if (account.ownerUserId === userId)
      return { account, ownership: 'owned', role: 'owner' };
    const share = await this.shareRepo.findOne({
      where: { accountId, memberUserId: userId, status: 'accepted' },
    });
    if (!share) throw new ForbiddenException('Tidak memiliki akses ke account');
    return { account, ownership: 'shared', role: share.role };
  }

  async assertCanContribute(userId: string, accountId: string) {
    const access = await this.getAccess(userId, accountId);
    if (access.role === 'viewer')
      throw new ForbiddenException(
        'Role viewer tidak dapat mencatat transaksi',
      );
    return access;
  }

  async getAccessibleAccountIds(userId: string): Promise<string[]> {
    const [owned, shares] = await Promise.all([
      this.accountRepo.find({
        select: { id: true },
        where: { ownerUserId: userId },
      }),
      this.shareRepo.find({
        select: { accountId: true },
        where: { memberUserId: userId, status: 'accepted' },
      }),
    ]);
    return [
      ...owned.map((row) => row.id),
      ...shares.map((row) => row.accountId),
    ];
  }

  private async requireOwned(userId: string, accountId: string) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId, ownerUserId: userId },
    });
    if (!account) throw new NotFoundException('Account tidak ditemukan');
    return account;
  }

  private async getBalances(accounts: Account[]): Promise<Map<string, number>> {
    if (!accounts.length) return new Map();
    const rows = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('transaction.accountId', 'accountId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN transaction.type = 'income' THEN transaction.amount ELSE -transaction.amount END), 0)`,
        'movement',
      )
      .where({ accountId: In(accounts.map((account) => account.id)) })
      .groupBy('transaction.accountId')
      .getRawMany<{ accountId: string; movement: string }>();
    const movement = new Map(
      rows.map((row) => [row.accountId, Number(row.movement)]),
    );
    return new Map(
      accounts.map((account) => [
        account.id,
        Number(account.openingBalance) + (movement.get(account.id) ?? 0),
      ]),
    );
  }

  private async getLastActivities(
    accounts: Account[],
  ): Promise<Map<string, string>> {
    if (!accounts.length) return new Map();
    const rows = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('transaction.accountId', 'accountId')
      .addSelect('MAX(transaction.date)', 'lastActivityAt')
      .where({ accountId: In(accounts.map((account) => account.id)) })
      .groupBy('transaction.accountId')
      .getRawMany<{ accountId: string; lastActivityAt: string }>();
    return new Map(rows.map((row) => [row.accountId, row.lastActivityAt]));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async ensureActivePreference(userId: string, accountId: string) {
    await this.userRepo.update(
      { id: userId, activeAccountId: IsNull() },
      { activeAccountId: accountId },
    );
  }
}
