import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { WalletMember } from './wallet-member.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { WaProactiveNotificationService } from '../whatsapp/wa-proactive-notification.service';
import { WA_TEMPLATE_DEFAULT_NAMES } from '../whatsapp/wa-template-definitions';

@Injectable()
export class SharedWalletService {
  constructor(
    @InjectRepository(WalletMember)
    private memberRepo: Repository<WalletMember>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
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

  async inviteByEmail(
    ownerUserId: string,
    email: string,
  ): Promise<WalletMember> {
    const existing = await this.memberRepo.findOne({
      where: { ownerUserId, memberEmail: email },
    });
    if (existing) throw new ConflictException('Already invited this email');

    const invitee = await this.userRepo.findOne({ where: { email } });
    const token = randomBytes(32).toString('hex');

    const member = this.memberRepo.create({
      ownerUserId,
      memberEmail: email,
      memberUserId: invitee?.id ?? null,
      memberWaPhone: null,
      inviteToken: token,
      acceptedAt: invitee ? null : null,
    });
    return this.memberRepo.save(member);
  }

  async acceptInvite(token: string, userId: string): Promise<WalletMember> {
    const invite = await this.memberRepo.findOne({
      where: { inviteToken: token },
    });
    if (!invite) throw new NotFoundException('Invalid or expired invite token');

    invite.memberUserId = userId;
    invite.acceptedAt = new Date();
    invite.inviteToken = null;
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

    const tx = this.txRepo.create({
      ...dto,
      userId: ownerUserId,
      source: 'shared',
      recordedBy: memberUserId,
    });
    const saved = await this.txRepo.save(tx);

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
      this.catRepo.findOne({ where: { id: tx.categoryId } }),
    ]);
    if (!owner?.waPhone) return;
    const sign = tx.type === 'income' ? '+' : '-';
    const amount = new Intl.NumberFormat('id-ID').format(Number(tx.amount));
    await this.proactive.sendOncePerDay({
      userId: owner.id,
      to: owner.waPhone,
      kind: 'shared_wallet_activity',
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
