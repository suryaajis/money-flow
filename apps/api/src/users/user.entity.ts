import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  // `type` must be explicit: the `string | null` TS type emits design:type
  // Object, which TypeORM cannot map to a Postgres column.
  @Column({ type: 'varchar', nullable: true, unique: true, length: 20 })
  waPhone: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  waLinkedAt: Date | null;

  // Proactive WhatsApp notification preferences (opt-in, default off per PRD).
  @Column({ type: 'boolean', default: false })
  notifyMonthlyRecap: boolean;

  @Column({ type: 'boolean', default: false })
  notifyOverBudget: boolean;

  @Column({ type: 'boolean', default: false })
  notifyDebtDue: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];
}
