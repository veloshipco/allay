import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromToken } from '@/lib/auth-edge'
import { 
  getOrganizationMembers, 
  addMemberToOrganization, 
  getMemberPermissions,
  OrganizationRole,
  OrganizationPermission 
} from '@/lib/organization'

// GET /api/[tenantId]/organization/members - Get all organization members
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

    // Check if user has permission to view members
    const { permissions } = await getMemberPermissions(session.userId, tenantId)
    if (!permissions.includes(OrganizationPermission.MANAGE_MEMBERS) && 
        !permissions.includes(OrganizationPermission.VIEW_ANALYTICS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const members = await getOrganizationMembers(tenantId)
    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/[tenantId]/organization/members - Add a member to organization
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

    // Check if user has permission to manage members
    const { permissions } = await getMemberPermissions(session.userId, tenantId)
    if (!permissions.includes(OrganizationPermission.MANAGE_MEMBERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { userId, role, customPermissions } = await req.json()
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    if (!Object.values(OrganizationRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const result = await addMemberToOrganization(userId, tenantId, role, customPermissions)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      member: {
        id: result.member!.id,
        userId: result.member!.userId,
        role: result.member!.role,
        permissions: result.member!.permissions,
        joinedAt: result.member!.joinedAt
      }
    })
  } catch (error) {
    console.error('Error adding organization member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 