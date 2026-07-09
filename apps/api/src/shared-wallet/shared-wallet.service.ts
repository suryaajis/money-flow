import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { WalletMember } from './wallet-member.entity';
import { User } from '../users/user.entity';

@Injectable()
export class SharedWalletService {
  constructor(
    @InjectRepository(WalletMember) private memberRepo: Repository<WalletMember>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // Returns all members of wallets I own
  getMyMembers(ownerUserId: string) {
    return this.memberRepo.find({
      where: { ownerUserId },
      relations: ['member'],
      order: { createdAt: 'ASC' },
    });
  }

  // Returns wallets I've been invited into
  getSharedWithMe(memberUserId: string) {
    return this.memberRepo.find({
      where: { memberUserId },
      relations: ['owner'],
      order: { createdAt: 'ASC' },
    });
  }

  async inviteByEmail(ownerUserId: string, email: string): Promise<WalletMember> {
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
    const invite = await this.memberRepo.findOne({ where: { inviteToken: token } });
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
}
