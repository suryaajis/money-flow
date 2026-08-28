import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('wa_webhook_events')
export class WaWebhookEvent {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  eventKey: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: string;

  @Column({ type: 'varchar', length: 20, default: 'processing' })
  status: 'processing' | 'processed' | 'failed';

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
