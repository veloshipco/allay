import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const sessionData = await getSession()
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant ID from query params
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId parameter' }, { status: 400 })
    }

    // Get tenant data
    const { initializeDatabase } = await import('@/lib/database/config')
    const { Tenant } = await import('@/lib/database/entities/Tenant')
    
    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Return safe tenant info (hide sensitive data)
    return NextResponse.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      slackConfig: {
        hasToken: !!tenant.slackConfig?.botToken,
        tokenStart: tenant.slackConfig?.botToken ? `${tenant.slackConfig.botToken.substring(0, 12)}...` : null,
        teamId: tenant.slackConfig?.teamId,
        teamName: tenant.slackConfig?.teamName,
        hasSigningSecret: !!tenant.slackConfig?.signingSecret,
        installedBy: tenant.slackConfig?.installedBy
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 