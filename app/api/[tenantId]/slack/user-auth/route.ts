import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }
    
    const { tenant } = await getTenantContext(tenantId)
    
    if (!tenant?.slackConfig?.teamId) {
      return NextResponse.json(
        { error: 'Slack not configured for this tenant' },
        { status: 404 }
      )
    }

    // User scopes for posting as the user
    const userScopes = [
      'chat:write'  // User scope for posting as the user without "via App" attribution
    ]

    // Use the ngrok URL as the base URL (you should use environment variable for production)
    const baseUrl = 'https://5b41-2409-408c-ae13-29bd-20bd-c182-3f13-f382.ngrok-free.app'
    
    // Create state parameter with tenant and user info
    const state = JSON.stringify({ tenantId, userId })
    
    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${
      process.env.SLACK_CLIENT_ID
    }&scope=&user_scope=${userScopes.join(',')}&redirect_uri=${encodeURIComponent(
      `${baseUrl}/api/slack/user-callback`
    )}&state=${encodeURIComponent(state)}&team=${tenant.slackConfig.teamId}`

    console.log('🔗 User auth URL generated:', {
      userId,
      tenantId,
      teamId: tenant.slackConfig.teamId,
      userScopes
    })

    return NextResponse.json({
      authUrl,
      message: 'Redirect user to this URL to authorize posting as them'
    })
  } catch (error) {
    console.error('Error generating user auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
} 