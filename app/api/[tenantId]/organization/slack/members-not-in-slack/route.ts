import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromToken } from '@/lib/auth-edge'
import { getOrganizationMembersNotInSlack, getMemberPermissions, OrganizationPermission } from '@/lib/organization'

// GET /api/[tenantId]/organization/slack/members-not-in-slack - Get organization members not in Slack
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
    if (!permissions.includes(OrganizationPermission.MANAGE_SLACK) && 
        !permissions.includes(OrganizationPermission.VIEW_ANALYTICS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const result = await getOrganizationMembersNotInSlack(tenantId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching members not in Slack:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 