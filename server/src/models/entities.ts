import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
@Index(['pseudonym'], { unique: false })
@Index(['status'], { unique: false })
@Index(['tier'], { unique: false })
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  pseudonym: string;

  @Column('varchar', { length: 50, default: 'idle' })
  status: 'idle' | 'matching' | 'connected' | 'banned';

  @Column('varchar', { length: 20, default: 'free' })
  tier: 'free' | 'premium' | 'vip';

  @Column('integer', { default: 0 })
  reputation: number;

  @Column('integer', { default: 0 })
  totalChats: number;

  @Column('integer', { default: 0 })
  reportCount: number;

  @Column('boolean', { default: false })
  isBanned: boolean;

  @Column('text', { nullable: true })
  banReason?: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastActivityAt: Date;

  @Column('timestamp', { nullable: true })
  bannedUntil?: Date;
}

@Entity('chat_sessions')
@Index(['initiatorId', 'createdAt'], { unique: false })
@Index(['status'], { unique: false })
export class ChatSessionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  initiatorId: string;

  @Column('uuid')
  recipientId: string;

  @Column('varchar', { length: 50, default: 'active' })
  status: 'active' | 'ended' | 'flagged';

  @Column('varchar', { length: 50, default: 'random' })
  mode: 'random' | 'mood' | 'interest' | 'audio-only';

  @Column('integer', { default: 0 })
  duration: number;

  @Column('integer', { default: 0 })
  violationCount: number;

  @Column('boolean', { default: false })
  isFlagged: boolean;

  @Column('jsonb', { default: {} })
  moderationData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  endedAt?: Date;
}

@Entity('moderation_logs')
@Index(['sessionId'], { unique: false })
@Index(['createdAt'], { unique: false })
export class ModerationLogEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @Column('varchar', { length: 50 })
  type: 'nsfw' | 'abuse' | 'spam' | 'report';

  @Column('float')
  confidence: number;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 50, default: 'pending' })
  status: 'pending' | 'reviewed' | 'actioned';

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('payments')
@Index(['userId'], { unique: false })
@Index(['status'], { unique: false })
export class PaymentEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('integer')
  amount: number;

  @Column('varchar', { length: 10 })
  currency: string;

  @Column('varchar', { length: 50 })
  feature: string;

  @Column('varchar', { length: 50, default: 'pending' })
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  @Column('varchar', { length: 255 })
  stripeTransactionId: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('reports')
@Index(['reporterId', 'createdAt'], { unique: false })
export class ReportEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @Column('uuid')
  reporterId: string;

  @Column('uuid')
  reportedUserId: string;

  @Column('varchar', { length: 50 })
  reason: 'nsfw' | 'abuse' | 'spam' | 'fraud' | 'other';

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 50, default: 'open' })
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';

  @Column('text', { nullable: true })
  resolution?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
