import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { WalletMember } from './wallet-member.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { WaProactiveNotificationService } from '../whatsapp/wa-proactive-notification.service';
import { WA_TEMPLATE_DEFAULT_NAMES } from '../whatsapp/wa-template-definitions';

@Injectable()
export class SharedWalletService {
  constructor(
    @InjectRepository(WalletMember)
    private memberRepo: Repository<WalletMember>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    private transactions: TransactionsService,
    private proactive: WaProactiveNotificationService,
    private config: ConfigService,
  ) {}

  // Returns all members of wallets I own
  getMyMembers(ownerUserId: string) {
    return this.memberRepo.find({
      where: { ownerUserId },
      relations: { member: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Returns wallets I've been invited into
  getSharedWithMe(memberUserId: string) {
    return this.memberRepo.find({
      where: { memberUserId },
      relations: { owner: true },
      order: { createdAt: 'ASC' },
    });
  }

  async inviteByPhone(
    ownerUserId: string,
    phone: string,
  ): Promise<WalletMember> {
    const normalizedPhone = this.normalizePhone(phone);
    if (!/^62\d{8,13}$/.test(normalizedPhone)) {
      throw new ConflictException('Nomor WhatsApp tidak valid');
    }
    const existing = await this.memberRepo.findOne({
      where: { ownerUserId, memberWaPhone: normalizedPhone },
    });
    if (existing) throw new ConflictException('Nomor ini sudah diundang');

    const [invitee, owner] = await Promise.all([
      this.userRepo.findOne({ where: { waPhone: normalizedPhone } }),
      this.userRepo.findOne({ where: { id: ownerUserId } }),
    ]);
    if (!invitee)
      throw new NotFoundException(
        'Nomor WhatsApp belum terdaftar di MoneyFlow',
      );
    if (invitee.id === ownerUserId)
      throw new ConflictException('Tidak dapat mengundang diri sendiri');
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);

    const member = this.memberRepo.create({
      ownerUserId,
      memberEmail: invitee.email,
      memberUserId: invitee.id,
      memberWaPhone: normalizedPhone,
      inviteToken: null,
      inviteTokenHash: tokenHash,
      inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: null,
    });
    const saved = await this.memberRepo.save(member);
    const webUrl = this.config
      .get<string>('PUBLIC_WEB_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
    await this.proactive.sendOncePerDay({
      userId: invitee.id,
      to: normalizedPhone,
      kind: `shared_invite:${saved.id}`,
      templateName: this.config.get<string>(
        'WA_TEMPLATE_SHARED_INVITE',
        WA_TEMPLATE_DEFAULT_NAMES.sharedInvite,
      ),
      bodyParameters: [
        owner?.name ?? 'Seseorang',
        `${webUrl}/settings/shared-wallet?token=${encodeURIComponent(token)}`,
      ],
    });
    saved.inviteTokenHash = null;
    return saved;
  }

  async acceptInvite(token: string, userId: string): Promise<WalletMember> {
    const invite = await this.memberRepo.findOne({
      where: { inviteTokenHash: this.hashToken(token) },
    });
    if (
      !invite ||
      !invite.inviteExpiresAt ||
      invite.inviteExpiresAt.getTime() <= Date.now()
    ) {
      throw new NotFoundException('Invalid or expired invite token');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (
      !user?.waPhone ||
      user.waPhone !== invite.memberWaPhone ||
      invite.memberUserId !== userId
    ) {
      throw new ForbiddenException(
        'Undangan ini ditujukan untuk nomor WhatsApp lain',
      );
    }

    invite.memberUserId = userId;
    invite.acceptedAt = new Date();
    invite.inviteToken = null;
    invite.inviteTokenHash = null;
    invite.inviteExpiresAt = null;
    return this.memberRepo.save(invite);
  }

  async removeMember(ownerUserId: string, memberId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException();
    if (member.ownerUserId !== ownerUserId) throw new ForbiddenException();
    await this.memberRepo.delete(memberId);
  }

  async leaveWallet(ownerUserId: string, memberId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException();
    if (member.memberUserId !== ownerUserId) throw new ForbiddenException();
    await this.memberRepo.delete(memberId);
  }

  // ── SHARE-03/04/06: members writing into an owner's wallet ──────────────────

  /** Throws unless `memberUserId` is an accepted member of `ownerUserId`'s wallet. */
  private async assertAcceptedMember(
    memberUserId: string,
    ownerUserId: string,
  ): Promise<void> {
    if (memberUserId === ownerUserId) return; // owner can always write to their own wallet
    const membership = await this.memberRepo.findOne({
      where: { ownerUserId, memberUserId },
    });
    if (!membership || !membership.acceptedAt) {
      throw new ForbiddenException('Kamu bukan anggota dompet ini.');
    }
  }

  /** Owner's categories, for a member composing a transaction into the shared wallet. */
  async getOwnerCategories(
    memberUserId: string,
    ownerUserId: string,
  ): Promise<Category[]> {
    await this.assertAcceptedMember(memberUserId, ownerUserId);
    return this.catRepo.find({ where: { userId: ownerUserId } });
  }

  /** SHARE-03: record a transaction into the owner's wallet, attributed to the member. */
  async recordForOwner(
    memberUserId: string,
    ownerUserId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    await this.assertAcceptedMember(memberUserId, ownerUserId);

    const saved = await this.transactions.createForSharedWallet(
      ownerUserId,
      memberUserId,
      dto,
    );

    // SHARE-06: notify the owner that a member recorded something (fire-and-forget).
    void this.notifyOwnerOfActivity(ownerUserId, memberUserId, saved).catch(
      () => undefined,
    );
    return saved;
  }

  private async notifyOwnerOfActivity(
    ownerUserId: string,
    memberUserId: string,
    tx: Transaction,
  ): Promise<void> {
    if (memberUserId === ownerUserId) return;
    const [owner, member, category] = await Promise.all([
      this.userRepo.findOne({ where: { id: ownerUserId } }),
      this.userRepo.findOne({ where: { id: memberUserId } }),
      tx.categoryId
        ? this.catRepo.findOne({ where: { id: tx.categoryId } })
        : Promise.resolve(null),
    ]);
    if (!owner?.waPhone) return;
    const sign = tx.type === 'income' ? '+' : '-';
    const amount = new Intl.NumberFormat('id-ID').format(Number(tx.amount));
    await this.proactive.sendOncePerDay({
      userId: owner.id,
      to: owner.waPhone,
      kind: `shared_wallet_activity:${tx.id}`,
      templateName: this.config.get<string>(
        'WA_TEMPLATE_SHARED_WALLET',
        WA_TEMPLATE_DEFAULT_NAMES.sharedWallet,
      ),
      bodyParameters: [
        member?.name ?? 'Anggota',
        `${sign}Rp${amount}`,
        category?.name ?? 'Tanpa kategori',
        tx.notes || '-',
      ],
    });
  }

  private normalizePhone(phone: string): string {
    let value = phone.replace(/\D/g, '');
    if (value.startsWith('0')) value = `62${value.slice(1)}`;
    if (!value.startsWith('62')) value = `62${value}`;
    return value;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * SHARE-04: people who may appear as `recordedBy` on the current user's own
   * wallet — themselves plus everyone they've accepted as a member. Lets the
   * dashboard resolve `recordedBy` ids to names.
   */
  async getRecorders(userId: string): Promise<{ id: string; name: string }[]> {
    const me = await this.userRepo.findOne({ where: { id: userId } });
    const members = await this.memberRepo.find({
      where: { ownerUserId: userId },
      relations: { member: true },
    });
    const recorders: { id: string; name: string }[] = [];
    if (me) recorders.push({ id: me.id, name: me.name });
    for (const m of members) {
      if (m.memberUserId && m.member) {
        recorders.push({ id: m.memberUserId, name: m.member.name });
      }
    }
    return recorders;
  }
}
