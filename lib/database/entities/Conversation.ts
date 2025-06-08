import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import type { ITenant, SlackReaction, SlackMessage } from './types'

@Entity('conversations')
export class Conversation {
  @PrimaryColumn({ type: 'varchar' })
  id!: string // Slack message TS

  @Column({ type: 'uuid' })
  tenantId!: string

  @ManyToOne('Tenant', 'conversations')
  @JoinColumn({ name: 'tenantId' })
  tenant!: ITenant

  @Column({ type: 'varchar' })
  channelId!: string

  @Column({ type: 'varchar', nullable: true })
  channelName?: string

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'varchar' })
  userId!: string

  @Column({ type: 'varchar', nullable: true })
  userName?: string

  @Column({ type: 'jsonb', default: [] })
  reactions!: SlackReaction[]

  @Column({ type: 'jsonb', default: [] })
  threadReplies!: SlackMessage[]

  @Column({ type: 'varchar', nullable: true })
  threadTs?: string

  @Column({ type: 'timestamp' })
  slackTimestamp!: Date

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

// Re-export the interfaces for backward compatibility
export type { SlackReaction, SlackMessage } from './types' 