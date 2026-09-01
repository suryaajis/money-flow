import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('wallet_members')
export class WalletMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The account owner who is sharing their wallet
  @Column()
  ownerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;

  // The member who was invited (null until they accept)
  @Column({ type: 'uuid', nullable: true })
  memberUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'memberUserId' })
  member: User | null;

  // Invite target (before account exists)
  @Column({ type: 'varchar', nullable: true })
  memberEmail: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  memberWaPhone: string | null;

  // 64-char hex token, cleared once accepted
  @Column({ type: 'varchar', nullable: true, length: 64 })
  inviteToken: string | null;

  @Column({ type: 'varchar', nullable: true, length: 64, unique: true })
  inviteTokenHash: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  inviteExpiresAt: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  acceptedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
