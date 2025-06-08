import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const scopes = [
    'channels:read',
    'groups:read',
    'im:read',
    'mpim:read',
    'reactions:read',
    'chat:write',
    'team:read'
  ]

  const redirectUrl = new URL(
    `/api/${params.tenantId}/slack/callback`,
    req.nextUrl.origin
  )

  const url = `https://slack.com/oauth/v2/authorize?client_id=${
    process.env.SLACK_CLIENT_ID
  }&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(redirectUrl.toString())}&state=${params.tenantId}`

  return NextResponse.redirect(url)
} 