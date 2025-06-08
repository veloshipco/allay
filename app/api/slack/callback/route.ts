import { NextRequest, NextResponse } from 'next/server'
import { updateTenantSlackConfig } from '@/lib/tenant'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') // This is the tenantId
  const error = req.nextUrl.searchParams.get('error')
  
  console.log('🔄 Slack OAuth callback received')
  console.log('📝 Callback parameters:', { 
    code: code ? `${code.substring(0, 20)}...` : null, 
    state, 
    error,
    fullUrl: req.url 
  })
  
  if (!state) {
    console.error('❌ Missing state parameter in callback')
    return new Response('Missing state parameter', { status: 400 })
  }
  
  const tenantId = state
  console.log('🏢 Processing OAuth for tenantId:', tenantId)
  
  // Use the ngrok URL as the base URL
  const baseUrl = 'https://5b41-2409-408c-ae13-29bd-20bd-c182-3f13-f382.ngrok-free.app'

  if (error) {
    console.error('Slack OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/${tenantId}/integrations?error=${error}`, baseUrl)
    )
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 })
  }

  try {
    const result = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code: code,
        redirect_uri: `${baseUrl}/api/slack/callback`
      })
    })

    const data = await result.json()

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`)
    }

    // Update tenant with Slack configuration including signing secret
    const updateResult = await updateTenantSlackConfig(tenantId, {
      botToken: data.access_token,
      teamId: data.team.id,
      teamName: data.team.name,
      installedBy: data.authed_user?.id,
      signingSecret: process.env.SLACK_SIGNING_SECRET! // Add signing secret for event verification
    })

    if (!updateResult.success) {
      throw new Error('Failed to save Slack configuration')
    }

    return NextResponse.redirect(
      new URL(`/${tenantId}/integrations?success=true`, baseUrl)
    )
  } catch (error) {
    console.error('Error processing Slack OAuth callback:', error)
    return NextResponse.redirect(
      new URL(`/${tenantId}/integrations?error=oauth_failed`, baseUrl)
    )
  }
} 