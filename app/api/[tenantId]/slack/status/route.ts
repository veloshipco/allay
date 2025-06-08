import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { tenant, error } = await getTenantContext(tenantId)

    if (error || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const isSlackConnected = !!(tenant.slackConfig?.botToken && tenant.slackConfig?.teamId)

    return NextResponse.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      isSlackConnected,
      slackConfig: tenant.slackConfig ? {
        hasToken: !!tenant.slackConfig.botToken,
        teamId: tenant.slackConfig.teamId,
        teamName: tenant.slackConfig.teamName,
        // Don't expose the actual token for security
      } : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error checking Slack status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
} 