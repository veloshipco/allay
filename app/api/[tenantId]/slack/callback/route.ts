import { NextRequest, NextResponse } from 'next/server'
import { updateTenantSlackConfig } from '@/lib/tenant'

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  // Verify state matches tenant ID for security
  if (state !== params.tenantId) {
    return new Response('Invalid state parameter', { status: 400 })
  }

  if (error) {
    console.error('Slack OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/${params.tenantId}/integrations?error=${error}`, req.nextUrl.origin)
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
        redirect_uri: `${req.nextUrl.origin}/api/${params.tenantId}/slack/callback`
      })
    })

    const data = await result.json()

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`)
    }

    // Update tenant with Slack configuration
    const updateResult = await updateTenantSlackConfig(params.tenantId, {
      botToken: data.access_token,
      teamId: data.team.id,
      teamName: data.team.name,
      installedBy: data.authed_user?.id
    })

    if (!updateResult.success) {
      throw new Error('Failed to save Slack configuration')
    }

    return NextResponse.redirect(
      new URL(`/${params.tenantId}/integrations?success=true`, req.nextUrl.origin)
    )
  } catch (error) {
    console.error('Error processing Slack OAuth callback:', error)
    return NextResponse.redirect(
      new URL(`/${params.tenantId}/integrations?error=oauth_failed`, req.nextUrl.origin)
    )
  }
} 