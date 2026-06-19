import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  color: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'enum', enum: ['income', 'expense', 'both'], default: 'both' })
  type: 'income' | 'expense' | 'both';

  @Column({ default: false })
  isDefault: boolean;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.category)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
