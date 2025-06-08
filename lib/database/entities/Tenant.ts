import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Conversation } from './Conversation'

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  slug: string

  @Column({ type: 'jsonb', nullable: true })
  slackConfig?: {
    botToken: string
    signingSecret: string
    teamId: string
    teamName?: string
    installedBy?: string
  }

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Conversation, conversation => conversation.tenant)
  conversations: Conversation[]
} 