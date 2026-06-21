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

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

@Entity('recurring_transactions')
export class RecurringTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['income', 'expense'] })
  type: 'income' | 'expense';

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'enum', enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  frequency: RecurringFrequency;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'date' })
  nextRunDate: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
