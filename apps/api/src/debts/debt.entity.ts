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
import { numericTransformer } from '../database/numeric.transformer';

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 'owed_to_me' = piutang (others owe me), 'i_owe' = hutang (I owe others)
  @Column({ type: 'enum', enum: ['owed_to_me', 'i_owe'] })
  direction: 'owed_to_me' | 'i_owe';

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column()
  counterpartyName: string;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
