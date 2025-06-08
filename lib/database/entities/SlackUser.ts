import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import type { ITenant } from './types'

@Entity('slack_users')
@Index(['tenantId', 'slackUserId'], { unique: true })
export class SlackUser {
  @PrimaryColumn({ type: 'varchar' })
  id!: string // Composite: tenantId-slackUserId

  @Column({ type: 'uuid' })
  tenantId!: string

  @ManyToOne('Tenant')
  @JoinColumn({ name: 'tenantId' })
  tenant!: ITenant

  @Column({ type: 'varchar' })
  slackUserId!: string

  @Column({ type: 'varchar', nullable: true })
  realName?: string

  @Column({ type: 'varchar', nullable: true })
  displayName?: string

  @Column({ type: 'varchar', nullable: true })
  email?: string

  @Column({ type: 'varchar', nullable: true })
  profileImage?: string

  @Column({ type: 'varchar', nullable: true })
  title?: string

  @Column({ type: 'boolean', default: false })
  isBot!: boolean

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean

  @Column({ type: 'boolean', default: false })
  isOwner!: boolean

  @Column({ type: 'varchar', nullable: true })
  timezone?: string

  // OAuth token for posting as this user (if they've authorized)
  @Column({ type: 'text', nullable: true })
  userToken?: string

  @Column({ type: 'jsonb', nullable: true })
  scopes?: string[]

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt?: Date

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
} 