import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface RuleConditions {
  descriptionContains?: string;
  source?: string;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: 'income' | 'expense';
}

export interface RuleActions {
  categoryId?: string;
  tags?: string[];
  normalizedDescription?: string;
}

@Entity('smart_rules')
export class SmartRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'jsonb' })
  conditions: RuleConditions;

  @Column({ type: 'jsonb' })
  actions: RuleActions;

  @Column({ type: 'integer', default: 100 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'boolean', default: true })
  stopOnMatch: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
