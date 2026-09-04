import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Account } from './account.entity';

export type AccountShareRole = 'viewer' | 'contributor';
export type AccountShareStatus = 'pending' | 'accepted' | 'revoked';

@Entity('account_shares')
@Index(['accountId', 'memberUserId'], { unique: true })
export class AccountShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, (account) => account.shares, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ type: 'uuid' })
  memberUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberUserId' })
  member: User;

  @Column({ type: 'varchar', length: 320 })
  invitedEmail: string;

  @Column({ type: 'varchar', length: 20 })
  role: AccountShareRole;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AccountShareStatus;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  inviteTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  inviteExpiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
