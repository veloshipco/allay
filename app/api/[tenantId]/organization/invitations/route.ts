import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromToken } from '@/lib/auth-edge'
import { 
  getOrganizationInvitations,
  createInvitation,
  getMemberPermissions,
  OrganizationRole,
  OrganizationPermission 
} from '@/lib/organization'

// GET /api/[tenantId]/organization/invitations - Get all organization invitations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const session = await getSessionFromToken(req)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view invitations
    const { permissions } = await getMemberPermissions(session.userId, tenantId)
    if (!permissions.includes(OrganizationPermission.MANAGE_MEMBERS) && 
        !permissions.includes(OrganizationPermission.INVITE_MEMBERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const invitations = await getOrganizationInvitations(tenantId)
    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error fetching organization invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/[tenantId]/organization/invitations - Create new invitation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const session = await getSessionFromToken(req)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to invite members
    const { permissions } = await getMemberPermissions(session.userId, tenantId)
    if (!permissions.includes(OrganizationPermission.INVITE_MEMBERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { email, proposedRole, proposedPermissions, message, expiresInDays } = await req.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const role = proposedRole || OrganizationRole.MEMBER
    if (!Object.values(OrganizationRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const result = await createInvitation(
      email,
      tenantId,
      session.userId,
      role,
      proposedPermissions,
      message,
      expiresInDays || 7
    )
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      invitation: {
        id: result.invitation!.id,
        email: result.invitation!.email,
        proposedRole: result.invitation!.proposedRole,
        proposedPermissions: result.invitation!.proposedPermissions,
        token: result.invitation!.token,
        expiresAt: result.invitation!.expiresAt,
        createdAt: result.invitation!.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating organization invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 