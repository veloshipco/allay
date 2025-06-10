// Organization types that can be safely imported on the client side
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

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export interface OrganizationMemberInfo {
  id: string
  userId: string
  email: string
  firstName: string
  lastName: string
  role: OrganizationRole
  permissions: OrganizationPermission[]
  joinedAt: Date
  lastActiveAt?: Date
  isActive: boolean
}

export interface InvitationInfo {
  id: string
  email: string
  proposedRole: OrganizationRole
  proposedPermissions: OrganizationPermission[]
  status: InvitationStatus
  invitedBy: string
  invitedByName: string
  message?: string
  createdAt: Date
  expiresAt: Date
} 