import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('smart_rule_correction_events')
@Index(['userId', 'merchantKey', 'categoryId'])
export class RuleCorrectionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 160 })
  merchantKey: string;

  @Column({ type: 'varchar', length: 160 })
  sampleDescription: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  source: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
