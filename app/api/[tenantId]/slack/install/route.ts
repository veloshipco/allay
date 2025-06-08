import { NextRequest, NextResponse } from 'next/server'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params
  
  console.log('🚀 Slack install route called for tenantId:', tenantId)
  
  if (!tenantId) {
    console.error('❌ Missing tenantId parameter')
    return new Response('Missing tenantId parameter', { status: 400 })
  }
  
  const scopes = [
    // Core reading permissions
    'channels:read',
    'groups:read',
    'im:read',
    'mpim:read',
    'reactions:read',
    'team:read',
    
    // Message history permissions
    'channels:history',
    'groups:history',
    'im:history',
    'mpim:history',
    
    // Writing permissions
    'chat:write',
    'reactions:write',
    
    // Channel management
    'channels:join',
    'groups:write',
    
    // User information
    'users:read',
    'users:read.email',
    
    // Enhanced user interaction (requires user to install/authorize)
    'chat:write.public',
    'chat:write.customize'
  ]

  // User scopes for user token acquisition (posts as actual users)
  const userScopes = [
    'chat:write'  // User scope for posting as the user without "via App" attribution
  ]

  // Use the ngrok URL as the base URL
  const baseUrl = 'https://5b41-2409-408c-ae13-29bd-20bd-c182-3f13-f382.ngrok-free.app'
  const redirectUrl = new URL('/api/slack/callback', baseUrl)

  const url = `https://slack.com/oauth/v2/authorize?client_id=${
    process.env.SLACK_CLIENT_ID
  }&scope=${scopes.join(',')}&user_scope=${userScopes.join(',')}&redirect_uri=${encodeURIComponent(redirectUrl.toString())}&state=${encodeURIComponent(tenantId)}`

  console.log('🔗 Redirecting to Slack OAuth URL:', url)
  console.log('📝 Requested scopes:', scopes.join(', '))
  
  return NextResponse.redirect(url)
} 