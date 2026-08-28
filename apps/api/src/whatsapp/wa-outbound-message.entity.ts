import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('wa_outbound_messages')
export class WaOutboundMessage {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  recipient: string;

  @Column({ type: 'varchar', length: 20 })
  messageType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  templateName: string | null;

  @Column({ type: 'varchar', length: 20, default: 'accepted' })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorCode: string | null;

  @Column({ type: 'text', nullable: true })
  errorDetails: string | null;

  @CreateDateColumn()
  acceptedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
