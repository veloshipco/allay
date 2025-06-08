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
      name: tenant.name,
      slug: tenant.slug,
      isSlackConnected,
      teamName: tenant.slackConfig?.teamName || null
    })
  } catch (error) {
    console.error('Error fetching tenant info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 