import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { numericTransformer } from '../database/numeric.transformer';
import { WaPhoneLink } from '../whatsapp/wa-phone-link.entity';
import { Account } from '../accounts/account.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'enum', enum: ['income', 'expense'] })
  type: 'income' | 'expense';

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  // `type` must be explicit: the `string | null` TS type emits design:type
  // Object, which TypeORM cannot map to a Postgres column.
  @Column({ type: 'varchar', nullable: true, length: 3, default: null })
  currency: string | null;

  @Column({ type: 'simple-array', nullable: true, default: null })
  tags: string[];

  // Where the transaction was recorded from: 'web' (default) or 'whatsapp'.
  @Column({ type: 'varchar', nullable: true, length: 20, default: 'web' })
  source: string;

  @Column({ type: 'uuid', nullable: true })
  recordedBy: string | null;

  @Column({ type: 'uuid', nullable: true })
  recordedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'recordedByUserId' })
  recordedByUser: User | null;

  @Column({ type: 'uuid', nullable: true })
  recordedByWaPhoneId: string | null;

  @ManyToOne(() => WaPhoneLink, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'recordedByWaPhoneId' })
  recordedByWaPhone: WaPhoneLink | null;

  @Column({ type: 'uuid', nullable: true })
  clientMutationId: string | null;

  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ type: 'uuid', nullable: true })
  transferId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  entryRole: 'source' | 'destination' | null;

  @Column({ type: 'text', nullable: true })
  adjustmentReason: string | null;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Category, (category) => category.transactions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
