import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Tenant } from './Tenant'

export interface SlackReaction {
  name: string
  users: string[]
  count: number
}

export interface SlackMessage {
  ts: string
  user: string
  text: string
  type: string
  subtype?: string
  thread_ts?: string
}

@Entity('conversations')
export class Conversation {
  @PrimaryColumn()
  id!: string // Slack message TS

  @Column()
  tenantId!: string

  @ManyToOne(() => Tenant, tenant => tenant.conversations)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant

  @Column()
  channelId!: string

  @Column()
  channelName?: string

  @Column('text')
  content!: string

  @Column()
  userId!: string

  @Column()
  userName?: string

  @Column({ type: 'jsonb', default: [] })
  reactions!: SlackReaction[]

  @Column({ type: 'jsonb', default: [] })
  threadReplies!: SlackMessage[]

  @Column({ nullable: true })
  threadTs?: string

  @Column({ type: 'timestamp' })
  slackTimestamp!: Date

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
} 