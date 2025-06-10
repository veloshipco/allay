import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { User } from './User'
import { Tenant } from './Tenant'

export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

export enum OrganizationPermission {
  MANAGE_MEMBERS = 'manage_members',
  INVITE_MEMBERS = 'invite_members',
  MANAGE_SLACK = 'manage_slack',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_INTEGRATIONS = 'manage_integrations'
}

@Entity('organization_members')
@Index(['userId', 'tenantId'], { unique: true })
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'uuid' })
  tenantId: string

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant

  @Column({ 
    type: 'enum', 
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER
  })
  role: OrganizationRole

  @Column({ 
    type: 'jsonb',
    default: () => "'[]'::jsonb"
  })
  permissions: OrganizationPermission[]

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt?: Date

  @CreateDateColumn()
  joinedAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Helper methods
  hasPermission(permission: OrganizationPermission): boolean {
    // Owners have all permissions
    if (this.role === OrganizationRole.OWNER) {
      return true
    }
    
    // Check explicit permissions
    return this.permissions.includes(permission)
  }

  canManageMembers(): boolean {
    return this.hasPermission(OrganizationPermission.MANAGE_MEMBERS)
  }

  canInviteMembers(): boolean {
    return this.hasPermission(OrganizationPermission.INVITE_MEMBERS)
  }

  canManageSlack(): boolean {
    return this.hasPermission(OrganizationPermission.MANAGE_SLACK)
  }
} 