import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface RuleBeforeSnapshot {
  id: string;
  categoryId: string | null;
  accountId: string;
  tags: string[] | null;
  notes: string | null;
}

@Entity('rule_execution_batches')
export class RuleExecutionBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  ruleId: string;

  @Column({ type: 'jsonb' })
  beforeSnapshot: RuleBeforeSnapshot[];

  @Column({ type: 'timestamp' })
  reversibleUntil: Date;

  @Column({ type: 'timestamp', nullable: true })
  undoneAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
