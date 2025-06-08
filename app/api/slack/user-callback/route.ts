import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database/config'
import { SlackUser } from '@/lib/database/entities/SlackUser'
import { fetchUserInfo, createSlackClient } from '@/lib/slack-api'
import { getTenantContext } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  
  console.log('🔄 Slack user OAuth callback received')
  
  if (!state) {
    console.error('❌ Missing state parameter in user callback')
    return new Response('Missing state parameter', { status: 400 })
  }
  
  let parsedState: { tenantId: string; userId: string }
  try {
    parsedState = JSON.parse(decodeURIComponent(state))
  } catch (parseError) {
    console.error('❌ Invalid state parameter format:', parseError)
    return new Response('Invalid state parameter', { status: 400 })
  }
  
  const { tenantId, userId } = parsedState
  
  // Use the ngrok URL as the base URL
  const baseUrl = 'https://5b41-2409-408c-ae13-29bd-20bd-c182-3f13-f382.ngrok-free.app'

  if (error) {
    console.error('Slack user OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/${tenantId}/users?error=user_auth_${error}`, baseUrl)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${tenantId}/users?error=missing_code`, baseUrl)
    )
  }

  try {
    // Verify tenant exists and has Slack configured
    const { tenant } = await getTenantContext(tenantId)
    if (!tenant?.slackConfig?.botToken) {
      throw new Error('Tenant not configured for Slack')
    }

    const result = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code: code,
        redirect_uri: `${baseUrl}/api/slack/user-callback`
      })
    })

    const data = await result.json()

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`)
    }

    console.log('🔐 User OAuth response received:', {
      hasAuthedUser: !!data.authed_user,
      userId: data.authed_user?.id,
      requestedUserId: userId
    })

    // Verify the authenticated user matches the requested user
    if (data.authed_user?.id !== userId) {
      console.error('❌ User ID mismatch in OAuth callback')
      return NextResponse.redirect(
        new URL(`/${tenantId}/users?error=user_mismatch`, baseUrl)
      )
    }

    if (data.authed_user && data.authed_user.access_token) {
      try {
        const dataSource = await initializeDatabase()
        const slackUserRepository = dataSource.getRepository(SlackUser)
        
        const userToken = data.authed_user.access_token
        const userScopes = data.authed_user.scope ? data.authed_user.scope.split(',') : []
        
        // Create a client to fetch fresh user info
        const tempClient = await createSlackClient(tenant.slackConfig.botToken)
        const userProfile = await fetchUserInfo(tempClient, userId)
        
        if (userProfile) {
          const compositeId = `${tenantId}-${userId}`
          
          // Find existing user record or create new one
          let slackUser = await slackUserRepository.findOne({
            where: { id: compositeId, tenantId, slackUserId: userId }
          })

          if (slackUser) {
            // Update existing user with token
            slackUser.userToken = userToken
            slackUser.scopes = userScopes
            slackUser.tokenExpiresAt = undefined // User tokens don't typically expire unless revoked
            slackUser.lastSeenAt = new Date()
            slackUser.isActive = true
          } else {
            // Create new user record
            slackUser = slackUserRepository.create({
              id: compositeId,
              tenantId,
              slackUserId: userId,
              realName: userProfile.real_name,
              displayName: userProfile.display_name,
              email: userProfile.email,
              profileImage: userProfile.image_72,
              title: userProfile.title,
              isBot: userProfile.is_bot,
              isAdmin: userProfile.is_admin,
              isOwner: userProfile.is_owner,
              timezone: userProfile.tz,
              userToken: userToken,
              scopes: userScopes,
              lastSeenAt: new Date()
            })
          }

          await slackUserRepository.save(slackUser)
          
          console.log('💾 Updated user token for:', {
            userId,
            realName: userProfile.real_name,
            scopes: userScopes,
            isUpdate: !!slackUser.createdAt
          })
          
          return NextResponse.redirect(
            new URL(`/${tenantId}/users?user_auth_success=${userId}&refresh=${Date.now()}`, baseUrl)
          )
        } else {
          throw new Error('Failed to fetch user profile')
        }
      } catch (userTokenError) {
        console.error('❌ Failed to store user token:', userTokenError)
        throw userTokenError
      }
    } else {
      throw new Error('No user token received from Slack')
    }
  } catch (error) {
    console.error('Error processing Slack user OAuth callback:', error)
    return NextResponse.redirect(
      new URL(`/${tenantId}/users?error=user_oauth_failed`, baseUrl)
    )
  }
} 