import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface HealthComponent {
  score: number | null;
  weight: number;
  reason: string;
  value?: number;
}

@Entity('financial_health_snapshots')
@Index(['userId', 'period', 'formulaVersion'], { unique: true })
export class FinancialHealthSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ type: 'integer', nullable: true })
  score: number | null;

  @Column({ type: 'jsonb' })
  components: Record<string, HealthComponent>;

  @Column({ type: 'varchar', length: 20 })
  formulaVersion: string;

  @Column({ type: 'jsonb' })
  dataQuality: {
    sufficient: boolean;
    transactionCount: number;
    reasons: string[];
  };

  @CreateDateColumn()
  createdAt: Date;
}
