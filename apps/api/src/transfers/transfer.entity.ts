import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from '../accounts/account.entity';
import { numericTransformer } from '../database/numeric.transformer';
import { User } from '../users/user.entity';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  sourceAccountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'sourceAccountId' })
  sourceAccount: Account;

  @Column({ type: 'uuid' })
  destinationAccountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'destinationAccountId' })
  destinationAccount: Account;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  sourceAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  destinationAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: numericTransformer,
  })
  exchangeRate: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
