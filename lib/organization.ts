import { initializeDatabase } from './database/config'
import { OrganizationMember, OrganizationRole, OrganizationPermission } from './database/entities/OrganizationMember'
import { OrganizationInvitation, InvitationStatus } from './database/entities/OrganizationInvitation'
import { User } from './database/entities/User'
import { SlackUser } from './database/entities/SlackUser'
import { OrganizationMemberInfo, InvitationInfo } from './organization/types'
import crypto from 'crypto'

// Re-export types and interfaces from the types file
export type { OrganizationMemberInfo, InvitationInfo } from './organization/types'

// Re-export enums for use in other modules
export { OrganizationRole, OrganizationPermission, InvitationStatus }

// Default permissions for different roles
export const DEFAULT_PERMISSIONS = {
  [OrganizationRole.OWNER]: [
    OrganizationPermission.MANAGE_MEMBERS,
    OrganizationPermission.INVITE_MEMBERS,
    OrganizationPermission.MANAGE_SLACK,
    OrganizationPermission.VIEW_ANALYTICS,
    OrganizationPermission.MANAGE_INTEGRATIONS
  ],
  [OrganizationRole.ADMIN]: [
    OrganizationPermission.INVITE_MEMBERS,
    OrganizationPermission.MANAGE_SLACK,
    OrganizationPermission.VIEW_ANALYTICS
  ],
  [OrganizationRole.MEMBER]: [
    OrganizationPermission.VIEW_ANALYTICS
  ]
}

// Organization Member Management

export const getOrganizationMembers = async (tenantId: string): Promise<OrganizationMemberInfo[]> => {
  try {
    const dataSource = await initializeDatabase()
    const memberRepository = dataSource.getRepository(OrganizationMember)
    
    const members = await memberRepository.find({
      where: { tenantId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'ASC' }
    })

    return members.map(member => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      role: member.role,
      permissions: member.permissions,
      joinedAt: member.joinedAt,
      lastActiveAt: member.lastActiveAt,
      isActive: member.isActive
    }))
  } catch (error) {
    console.error('Error fetching organization members:', error)
    return []
  }
}

export const addMemberToOrganization = async (
  userId: string,
  tenantId: string,
  role: OrganizationRole = OrganizationRole.MEMBER,
  permissions?: OrganizationPermission[]
): Promise<{ success: boolean; error?: string; member?: OrganizationMember }> => {
  try {
    const dataSource = await initializeDatabase()
    const memberRepository = dataSource.getRepository(OrganizationMember)
    const userRepository = dataSource.getRepository(User)
    
    // Check if user exists
    const user = await userRepository.findOne({ where: { id: userId } })
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Check if already a member
    const existingMember = await memberRepository.findOne({
      where: { userId, tenantId }
    })

    if (existingMember) {
      if (existingMember.isActive) {
        return { success: false, error: 'User is already a member' }
      } else {
        // Reactivate existing member
        existingMember.isActive = true
        existingMember.role = role
        existingMember.permissions = permissions || DEFAULT_PERMISSIONS[role]
        existingMember.lastActiveAt = new Date()
        
        const updated = await memberRepository.save(existingMember)
        return { success: true, member: updated }
      }
    }

    // Create new member
    const member = memberRepository.create({
      userId,
      tenantId,
      role,
      permissions: permissions || DEFAULT_PERMISSIONS[role],
      lastActiveAt: new Date()
    })

    const saved = await memberRepository.save(member)
    return { success: true, member: saved }
  } catch (error) {
    console.error('Error adding member to organization:', error)
    return { success: false, error: 'Failed to add member' }
  }
}

export const removeMemberFromOrganization = async (
  memberId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const dataSource = await initializeDatabase()
    const memberRepository = dataSource.getRepository(OrganizationMember)
    
    const member = await memberRepository.findOne({
      where: { id: memberId, tenantId }
    })

    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    if (member.role === OrganizationRole.OWNER) {
      return { success: false, error: 'Cannot remove organization owner' }
    }

    // Soft delete by setting isActive to false
    member.isActive = false
    await memberRepository.save(member)

    return { success: true }
  } catch (error) {
    console.error('Error removing member from organization:', error)
    return { success: false, error: 'Failed to remove member' }
  }
}

export const updateMemberRole = async (
  memberId: string,
  tenantId: string,
  newRole: OrganizationRole,
  newPermissions?: OrganizationPermission[]
): Promise<{ success: boolean; error?: string; member?: OrganizationMember }> => {
  try {
    const dataSource = await initializeDatabase()
    const memberRepository = dataSource.getRepository(OrganizationMember)
    
    const member = await memberRepository.findOne({
      where: { id: memberId, tenantId }
    })

    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    if (member.role === OrganizationRole.OWNER && newRole !== OrganizationRole.OWNER) {
      return { success: false, error: 'Cannot change owner role' }
    }

    member.role = newRole
    member.permissions = newPermissions || DEFAULT_PERMISSIONS[newRole]
    
    const updated = await memberRepository.save(member)
    return { success: true, member: updated }
  } catch (error) {
    console.error('Error updating member role:', error)
    return { success: false, error: 'Failed to update member role' }
  }
}

export const getMemberPermissions = async (
  userId: string,
  tenantId: string
): Promise<{ role?: OrganizationRole; permissions: OrganizationPermission[] }> => {
  try {
    const dataSource = await initializeDatabase()
    const memberRepository = dataSource.getRepository(OrganizationMember)
    
    const member = await memberRepository.findOne({
      where: { userId, tenantId, isActive: true }
    })

    if (!member) {
      return { permissions: [] }
    }

    return {
      role: member.role,
      permissions: member.permissions
    }
  } catch (error) {
    console.error('Error getting member permissions:', error)
    return { permissions: [] }
  }
}

// Invitation Management

export const createInvitation = async (
  email: string,
  tenantId: string,
  invitedBy: string,
  proposedRole: OrganizationRole = OrganizationRole.MEMBER,
  proposedPermissions?: OrganizationPermission[],
  message?: string,
  expiresInDays: number = 7
): Promise<{ success: boolean; error?: string; invitation?: OrganizationInvitation }> => {
  try {
    const dataSource = await initializeDatabase()
    const invitationRepository = dataSource.getRepository(OrganizationInvitation)
    const userRepository = dataSource.getRepository(User)
    
    // Check if user is already a member
    const existingUser = await userRepository.findOne({
      where: { email },
      relations: ['tenants']
    })

    if (existingUser?.tenants?.some(t => t.id === tenantId)) {
      return { success: false, error: 'User is already a member of this organization' }
    }

    // Check for existing pending invitation
    const existingInvitation = await invitationRepository.findOne({
      where: { 
        email, 
        tenantId, 
        status: InvitationStatus.PENDING 
      }
    })

    if (existingInvitation && !existingInvitation.isExpired()) {
      return { success: false, error: 'Pending invitation already exists for this email' }
    }

    // Cancel existing pending invitation if expired
    if (existingInvitation) {
      existingInvitation.status = InvitationStatus.EXPIRED
      await invitationRepository.save(existingInvitation)
    }

    // Create new invitation
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const invitation = invitationRepository.create({
      email,
      tenantId,
      invitedBy,
      proposedRole,
      proposedPermissions: proposedPermissions || DEFAULT_PERMISSIONS[proposedRole],
      token,
      expiresAt,
      message
    })

    const saved = await invitationRepository.save(invitation)
    return { success: true, invitation: saved }
  } catch (error) {
    console.error('Error creating invitation:', error)
    return { success: false, error: 'Failed to create invitation' }
  }
}

export const getOrganizationInvitations = async (tenantId: string): Promise<InvitationInfo[]> => {
  try {
    const dataSource = await initializeDatabase()
    const invitationRepository = dataSource.getRepository(OrganizationInvitation)
    
    const invitations = await invitationRepository.find({
      where: { tenantId },
      relations: ['invitedByUser'],
      order: { createdAt: 'DESC' }
    })

    return invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      proposedRole: invitation.proposedRole,
      proposedPermissions: invitation.proposedPermissions,
      status: invitation.status,
      invitedBy: invitation.invitedBy,
      invitedByName: `${invitation.invitedByUser.firstName} ${invitation.invitedByUser.lastName}`,
      message: invitation.message,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt
    }))
  } catch (error) {
    console.error('Error fetching organization invitations:', error)
    return []
  }
}

export const acceptInvitation = async (
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string; tenantId?: string }> => {
  try {
    const dataSource = await initializeDatabase()
    const invitationRepository = dataSource.getRepository(OrganizationInvitation)
    const userRepository = dataSource.getRepository(User)
    
    const invitation = await invitationRepository.findOne({
      where: { token }
    })

    if (!invitation) {
      return { success: false, error: 'Invalid invitation token' }
    }

    if (!invitation.canAccept()) {
      return { success: false, error: 'Invitation has expired or is no longer valid' }
    }

    const user = await userRepository.findOne({ where: { id: userId } })
    if (!user || user.email !== invitation.email) {
      return { success: false, error: 'User email does not match invitation' }
    }

    // Add user to organization
    const result = await addMemberToOrganization(
      userId,
      invitation.tenantId,
      invitation.proposedRole,
      invitation.proposedPermissions
    )

    if (!result.success) {
      return result
    }

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED
    invitation.acceptedBy = userId
    invitation.respondedAt = new Date()
    await invitationRepository.save(invitation)

    return { success: true, tenantId: invitation.tenantId }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { success: false, error: 'Failed to accept invitation' }
  }
}

export const declineInvitation = async (token: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const dataSource = await initializeDatabase()
    const invitationRepository = dataSource.getRepository(OrganizationInvitation)
    
    const invitation = await invitationRepository.findOne({ where: { token } })
    
    if (!invitation) {
      return { success: false, error: 'Invalid invitation token' }
    }

    if (!invitation.canDecline()) {
      return { success: false, error: 'Invitation cannot be declined' }
    }

    invitation.status = InvitationStatus.DECLINED
    invitation.respondedAt = new Date()
    await invitationRepository.save(invitation)

    return { success: true }
  } catch (error) {
    console.error('Error declining invitation:', error)
    return { success: false, error: 'Failed to decline invitation' }
  }
}

export const cancelInvitation = async (
  invitationId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const dataSource = await initializeDatabase()
    const invitationRepository = dataSource.getRepository(OrganizationInvitation)
    
    const invitation = await invitationRepository.findOne({
      where: { id: invitationId, tenantId }
    })

    if (!invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    if (!invitation.canCancel()) {
      return { success: false, error: 'Invitation cannot be cancelled' }
    }

    invitation.status = InvitationStatus.CANCELLED
    await invitationRepository.save(invitation)

    return { success: true }
  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return { success: false, error: 'Failed to cancel invitation' }
  }
}

// Slack Integration Helper

export const getOrganizationMembersNotInSlack = async (tenantId: string): Promise<{
  members: Array<{
    userId: string
    email: string
    firstName: string
    lastName: string
    role: OrganizationRole
  }>
}> => {
  try {
    const dataSource = await initializeDatabase()
    const memberRepository = dataSource.getRepository(OrganizationMember)
    const slackUserRepository = dataSource.getRepository(SlackUser)
    
    // Get all organization members
    const members = await memberRepository.find({
      where: { tenantId, isActive: true },
      relations: ['user']
    })

    // Get all slack users for this tenant
    const slackUsers = await slackUserRepository.find({
      where: { tenantId }
    })

    const slackEmails = new Set(slackUsers.map(su => su.email).filter(email => email))
    
    // Filter members not in slack
    const membersNotInSlack = members.filter(member => 
      member.user.email && !slackEmails.has(member.user.email)
    )

    return {
      members: membersNotInSlack.map(member => ({
        userId: member.userId,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        role: member.role
      }))
    }
  } catch (error) {
    console.error('Error getting members not in Slack:', error)
    return { members: [] }
  }
} 