import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import type { IConversation } from './types'

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar', unique: true })
  slug: string

  @Column({ type: 'jsonb', nullable: true })
  slackConfig?: {
    botToken: string
    signingSecret: string
    teamId: string
    teamName?: string
    installedBy?: string
  }

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany('Conversation', 'tenant')
  conversations: IConversation[]
} 