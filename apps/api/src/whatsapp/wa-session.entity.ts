import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('wa_sessions')
export class WaSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  waPhone: string;

  @Column({ length: 50, default: 'idle' })
  state: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any> | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
