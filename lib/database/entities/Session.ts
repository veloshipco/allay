import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { User } from './User'

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'varchar' })
  token: string

  @Column({ type: 'varchar' })
  ipAddress: string

  @Column({ type: 'varchar' })
  userAgent: string

  @Column({ type: 'timestamp' })
  expiresAt: Date

  @Column({ type: 'boolean', default: false })
  isRevoked: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
} 