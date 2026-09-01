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

@Entity('wa_phone_links')
@Index('IDX_wa_phone_links_user_active', ['userId', 'revokedAt'])
@Index('UQ_wa_phone_links_active_phone', ['phone'], {
  unique: true,
  where: '"revokedAt" IS NULL',
})
@Index('UQ_wa_phone_links_active_primary', ['userId'], {
  unique: true,
  where: '"isPrimary" = true AND "revokedAt" IS NULL',
})
export class WaPhoneLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.waPhoneLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 30, default: 'WhatsApp' })
  label: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'boolean', default: false })
  notificationsEnabled: boolean;

  @Column({ type: 'timestamp' })
  linkedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastInboundAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
