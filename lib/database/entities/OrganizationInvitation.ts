import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { User } from './User'
import { Tenant } from './Tenant'
import { OrganizationRole, OrganizationPermission } from './OrganizationMember'

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

@Entity('organization_invitations')
@Index(['email', 'tenantId'], { unique: true })
export class OrganizationInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  email: string

  @Column({ type: 'uuid' })
  tenantId: string

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant

  @Column({ type: 'uuid' })
  invitedBy: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedBy' })
  invitedByUser: User

  @Column({ type: 'uuid', nullable: true })
  acceptedBy?: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acceptedBy' })
  acceptedByUser?: User

  @Column({ 
    type: 'enum', 
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER
  })
  proposedRole: OrganizationRole

  @Column({ 
    type: 'jsonb',
    default: () => "'[]'::jsonb"
  })
  proposedPermissions: OrganizationPermission[]

  @Column({ 
    type: 'enum', 
    enum: InvitationStatus,
    default: InvitationStatus.PENDING
  })
  status: InvitationStatus

  @Column({ type: 'varchar', unique: true })
  token: string

  @Column({ type: 'timestamp' })
  expiresAt: Date

  @Column({ type: 'text', nullable: true })
  message?: string

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  canAccept(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired()
  }

  canDecline(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired()
  }

  canCancel(): boolean {
    return this.status === InvitationStatus.PENDING
  }
} 